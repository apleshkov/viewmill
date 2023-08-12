use std::error::Error;

use serde::{
    de::{value::Error as DeserializeError, IntoDeserializer},
    Deserialize,
};
use swc_core::{
    common::{
        errors::{self as swc_errors},
        sync::{Lazy, Lrc},
        util::take::Take,
        FileName, SourceFile, SourceMap, DUMMY_SP,
    },
    ecma::{
        ast::*,
        codegen,
        codegen::Emitter,
        parser::{self, parse_file_as_module, EsConfig, TsConfig},
        visit::*,
    },
};

use scope::*;
pub use syntax::Syntax;
use tr::*;

use self::{context::TrContext, utils::*};

mod context;
mod errors;
mod glob;
mod jsx;
mod live;
mod scope;
mod syntax;
mod tr;
mod utils;

struct EsMappedVersion {
    ver: EsVersion,
}

impl EsMappedVersion {
    pub fn parse(s: &str) -> Result<Self, DeserializeError> {
        const ES6: &str = "es6";
        const ES7: &str = "es7";
        let s = s.to_lowercase();
        let ver = match s.as_str() {
            ES6 => EsVersion::Es2015,
            ES7 => EsVersion::Es2016,
            _ => EsVersion::deserialize(s.into_deserializer())?,
        };
        Ok(Self { ver })
    }
}

pub static ES_SUPPORTED_VERSIONS: Lazy<Vec<&str>> = Lazy::new(|| {
    vec![
        "es3", "es5", "es6", "es7", "es2015", "es2016", "es2017", "es2018", "es2019", "es2020",
        "es2021", "es2022", "esnext",
    ]
});

pub const ES_DEFAULT_VERSION: &str = "es6";

pub struct Options {
    pub syntax: Syntax,
    pub target: EsVersion,
    pub can_emit_warnings: bool,
}

impl Options {
    pub fn try_new(
        syntax: Syntax,
        target: Option<&str>,
        can_emit_warnings: Option<bool>,
    ) -> Result<Self, Box<dyn Error>> {
        Ok(Self {
            syntax,
            target: EsMappedVersion::parse(target.unwrap_or(ES_DEFAULT_VERSION))?.ver,
            can_emit_warnings: can_emit_warnings.unwrap_or(false),
        })
    }
}

pub struct Output {
    pub src: String,
    pub ext: &'static str,
}

pub fn tr_str(input: &str, options: Options) -> Result<Output, Box<dyn Error>> {
    let cm: Lrc<SourceMap> = Default::default();
    let handler = swc_errors::Handler::with_tty_emitter(
        swc_errors::ColorConfig::Auto,
        options.can_emit_warnings,
        false,
        Some(cm.clone()),
    );
    swc_errors::HANDLER.set(&handler, || {
        let fm = cm.new_source_file(FileName::Anon, input.into());
        tr_file(&fm, cm, options, true)
    })
}

pub fn tr_file(
    fm: &SourceFile,
    cm: Lrc<SourceMap>,
    options: Options,
    show_header: bool,
) -> Result<Output, Box<dyn Error>> {
    let target = options.target;
    let module = {
        let mut recovered_errors = vec![];
        let result = parse_file_as_module(
            &fm,
            {
                use parser::Syntax::{Es, Typescript};
                match options.syntax {
                    Syntax::Js => Es(EsConfig {
                        jsx: true,
                        ..Default::default()
                    }),
                    Syntax::Ts => Typescript(TsConfig {
                        tsx: true,
                        ..Default::default()
                    }),
                }
            },
            target,
            None,
            &mut recovered_errors,
        );
        swc_errors::HANDLER.with(|handler| {
            for e in recovered_errors {
                e.into_diagnostic(&handler).emit();
            }
        });
        result.map_err(|e| Box::<dyn Error>::from(e.kind().msg()))
    }?;
    let mut root_scope = Scope::from(&module);
    let module = Program::Module(module)
        .fold_with({
            let tr_ctx = TrContext::new(options.syntax, &fm.src, &mut root_scope);
            &mut as_folder(Transformer { root_scope, tr_ctx })
        })
        .module()
        .ok_or_else(|| "Transformation failed")?;
    let mut src = Vec::new();
    let mut emitter = {
        Emitter {
            cfg: codegen::Config {
                target,
                ..Default::default()
            },
            cm: cm.clone(),
            comments: None,
            wr: codegen::text_writer::JsWriter::new(cm.clone(), "\n", &mut src, None),
        }
    };
    emitter.emit_module(&module)?;
    let mut src = String::from_utf8(src)?;
    if show_header {
        src = format!("{FILE_HEADER}\n{src}");
    }
    Ok(Output {
        src,
        ext: options.syntax.ext(),
    })
}

struct Transformer<'a> {
    root_scope: Scope<'a>,
    tr_ctx: TrContext,
}

impl VisitMut for Transformer<'_> {
    fn visit_mut_export_default_expr(&mut self, n: &mut ExportDefaultExpr) {
        n.visit_mut_children_with(self);
        swc_errors::HANDLER.with(|handler| {
            if let Expr::Arrow(arrow) = &mut *n.expr {
                let mut arrow = arrow.take();
                let mut scope = Scope::child_of(&self.root_scope);
                let param_len = arrow.params.len();
                let mut args = Vec::with_capacity(param_len);
                let mut model = Vec::with_capacity(param_len);
                for p in arrow.params.into_iter() {
                    walk_every_pat_idents(&p, |ident| {
                        scope.insert_item(&ident.sym, ScopeItem::Live);
                        model.push(ident.clone());
                    });
                    args.push(Param::from(p));
                }
                if let Err(err) = tr_block_or_expr(&self.tr_ctx, &mut arrow.body, &scope) {
                    handler.span_err(err.span, &err.msg);
                }
                n.expr = Box::from(view_func(
                    &self.tr_ctx,
                    args,
                    model,
                    arrow.body,
                    arrow.type_params,
                ));
            }
        });
    }

    fn visit_mut_export_default_decl(&mut self, n: &mut ExportDefaultDecl) {
        n.visit_mut_children_with(self);
        swc_errors::HANDLER.with(|handler| {
            if let DefaultDecl::Fn(decl) = &mut n.decl {
                let mut func = decl.function.take();
                let mut scope = Scope::child_of(&self.root_scope);
                let mut model = Vec::with_capacity(func.params.len());
                for p in func.params.iter() {
                    walk_every_pat_idents(&p.pat, |ident| {
                        scope.insert_item(&ident.sym, ScopeItem::Live);
                        model.push(ident.clone());
                    });
                }
                if let Some(body) = &mut func.body {
                    let mut body = body.take();
                    if let Err(err) = tr_block(&self.tr_ctx, &mut body, &scope) {
                        handler.span_err(err.span, &err.msg);
                    }
                    decl.function = view_func(
                        &self.tr_ctx,
                        func.params,
                        model,
                        Box::new(BlockStmtOrExpr::BlockStmt(body)),
                        func.type_params,
                    );
                }
            }
        });
    }

    fn visit_mut_module(&mut self, n: &mut Module) {
        n.body.insert(
            0,
            ModuleItem::ModuleDecl(ModuleDecl::Import(self.tr_ctx.import_decl())),
        );
        n.visit_mut_children_with(self);
    }
}

fn view_func(
    ctx: &TrContext,
    args: Vec<Param>,
    model: Vec<Ident>,
    body: Box<BlockStmtOrExpr>,
    type_params: Option<Box<TsTypeParamDecl>>,
) -> Box<Function> {
    Box::new(Function {
        params: args,
        decorators: Take::dummy(),
        span: DUMMY_SP,
        body: {
            Some(BlockStmt {
                span: DUMMY_SP,
                stmts: vec![Stmt::Return(ReturnStmt {
                    span: DUMMY_SP,
                    arg: Some(ctx.view(model, body)),
                })],
            })
        },
        is_generator: false,
        is_async: false,
        type_params,
        return_type: None,
    })
}

#[cfg(test)]
mod tests {

    use super::*;

    #[test]
    fn test_target() {
        assert_eq!(EsMappedVersion::parse("es5").unwrap().ver, EsVersion::Es5);
        assert_eq!(
            EsMappedVersion::parse("ES2020").unwrap().ver,
            EsVersion::Es2020
        );
        assert_eq!(
            EsMappedVersion::parse("EsNext").unwrap().ver,
            EsVersion::EsNext
        );
        assert!(EsMappedVersion::parse("lorem ipsum dolor").is_err());
        assert_eq!(
            EsMappedVersion::parse("es6").unwrap().ver,
            EsVersion::Es2015
        );
        assert_eq!(
            EsMappedVersion::parse("es7").unwrap().ver,
            EsVersion::Es2016
        );
    }
}

static FILE_HEADER: &str = concat!(
    "// DO NOT EDIT! This file is generated by vewmill.",
    "\n// See https://github.com/apleshkov/viewmill for the details.",
    "\n/* eslint-disable */"
);
