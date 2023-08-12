use swc_core::{
    common::{sync::Lazy, DUMMY_SP},
    ecma::{
        ast::*,
        atoms::{js_word, JsWord},
    },
};

use super::{
    glob,
    live::{deps_expr, DestructArg},
    scope::Scope,
    utils::*,
    Syntax,
};

pub struct TrContext {
    syntax: Syntax,
    lib: NameAndExpr,
    unmount_sig: NameAndExpr,
}

impl TrContext {
    pub fn new(syntax: Syntax, src: &str, scope: &mut Scope) -> Self {
        let lib_name = glob::uname(LIB, src);
        scope.insert(&lib_name);
        let unmount_sig_name = glob::uname(UNMOUNT_SIGNAL, src);
        scope.insert(&unmount_sig_name);
        Self {
            syntax,
            lib: NameAndExpr::ident(lib_name),
            unmount_sig: NameAndExpr::ident(unmount_sig_name),
        }
    }
}

impl TrContext {
    pub fn import_decl(&self) -> ImportDecl {
        let src = Str::from("viewmill-runtime");
        let s = ImportSpecifier::Namespace(ImportStarAsSpecifier {
            span: DUMMY_SP,
            local: ident(&self.lib.name),
        });
        ImportDecl {
            span: DUMMY_SP,
            specifiers: vec![s],
            src: Box::from(src),
            type_only: false,
            asserts: None,
        }
    }
}

impl TrContext {
    pub fn live(
        &self,
        expr: Box<Expr>,
        deps: &Vec<JsWord>,
        destruct: Option<&DestructArg>,
    ) -> Box<Expr> {
        obj_method_call(
            self.lib.expr(),
            &LIVE,
            Some(ArgsBuilder::build_using(|args| {
                args.add_expr(arrow_short_expr(None, expr));
                args.add_expr(deps_expr(deps));
                if let Some(d) = destruct {
                    args.add_expr(d.to_expr());
                }
            })),
        )
    }

    pub fn param(&self, initial: Box<Expr>) -> Box<Expr> {
        obj_method_call(
            self.lib.expr(),
            &PARAM,
            Some(ArgsBuilder::from(initial).build()),
        )
    }

    pub fn condition(&self, expr: &CondExpr, deps: &Vec<JsWord>) -> Box<Expr> {
        obj_method_call(
            self.lib.expr(),
            &COND,
            Some(ArgsBuilder::build_using(|args| {
                args.add_expr(arrow_short_expr(None, expr.test.clone()))
                    .add_expr(arrow_short_expr(None, expr.cons.clone()))
                    .add_expr(arrow_short_expr(None, expr.alt.clone()))
                    .add_expr(deps_expr(deps));
            })),
        )
    }

    pub fn expression(&self, expr: Box<Expr>, deps: &Vec<JsWord>) -> Box<Expr> {
        obj_method_call(
            self.lib.expr(),
            &EXPR,
            Some(ArgsBuilder::build_using(|args| {
                args.add_expr(arrow_short_expr(None, expr))
                    .add_expr(deps_expr(deps));
            })),
        )
    }

    pub fn list(&self, expr: Box<Expr>, deps: Option<&Vec<JsWord>>) -> Box<Expr> {
        obj_method_call(
            self.lib.expr(),
            &LIST,
            Some(ArgsBuilder::build_using(|args| {
                args.add_expr(arrow_short_expr(None, expr));
                if let Some(deps) = deps {
                    args.add_expr(deps_expr(deps));
                }
            })),
        )
    }

    pub fn attr(
        &self,
        node_name: &JsWord,
        name: &str,
        value: Box<Expr>,
        deps: Option<&Vec<JsWord>>,
    ) -> Box<Expr> {
        obj_method_call(
            self.lib.expr(),
            &ATTR,
            Some(ArgsBuilder::build_using(|args| {
                args.add_expr(ident_expr(node_name));
                args.add_str(&name);
                if let Some(deps) = deps {
                    args.add_expr(arrow_short_expr(None, value));
                    args.add_expr(deps_expr(deps));
                } else {
                    args.add_expr(value);
                }
            })),
        )
    }

    pub fn attrs(
        &self,
        node_name: &JsWord,
        value: Box<Expr>,
        deps: Option<&Vec<JsWord>>,
    ) -> Box<Expr> {
        obj_method_call(
            self.lib.expr(),
            &ATTRS,
            Some(ArgsBuilder::build_using(|args| {
                args.add_expr(ident_expr(node_name));
                if let Some(deps) = deps {
                    args.add_expr(arrow_short_expr(None, value));
                    args.add_expr(deps_expr(deps));
                } else {
                    args.add_expr(value);
                }
            })),
        )
    }

    pub fn element(&self, html: Option<Box<Expr>>, func: Option<Box<Expr>>) -> Box<Expr> {
        obj_method_call(
            self.lib.expr(),
            &EL,
            Some(ArgsBuilder::build_using(|args| {
                if let Some(html) = html {
                    args.add_expr(html);
                } else {
                    args.add_expr(Box::from(""));
                }
                if let Some(func) = func {
                    args.add_expr(func);
                }
            })),
        )
    }

    pub fn insert(&self, expr: Box<Expr>, target_name: &JsWord, anchor_name: &JsWord) -> Box<Expr> {
        obj_method_call(
            self.lib.expr(),
            &INSERT,
            Some(ArgsBuilder::build_using(|args| {
                args.add_expr(expr)
                    .add_expr(ident_expr(&target_name.clone()))
                    .add_expr(ident_expr(&anchor_name.clone()));
            })),
        )
    }

    pub fn listen(
        &self,
        target_name: &JsWord,
        event_name: &str,
        cb: Box<Expr>,
        deps: Option<&Vec<JsWord>>,
    ) -> Box<Expr> {
        obj_method_call(
            self.lib.expr(),
            &LISTEN,
            Some(ArgsBuilder::build_using(|args| {
                args.add_expr(ident_expr(&target_name.clone()))
                    .add_expr(Box::from(Str::from(event_name)))
                    .add_expr(cb);
                if let Some(deps) = deps {
                    args.add_expr(deps_expr(deps));
                }
            })),
        )
    }

    pub fn cmp(&self, name: Box<Expr>, props: Box<Expr>) -> Box<Expr> {
        obj_method_call(
            self.lib.expr(),
            &CMP,
            Some(ArgsBuilder::build_using(|args| {
                args.add_expr(name);
                args.add_expr(props);
                args.add_expr(self.unmount_sig.expr());
            })),
        )
    }

    pub fn view(&self, params: Vec<Ident>, body: Box<BlockStmtOrExpr>) -> Box<Expr> {
        obj_method_call(
            self.lib.expr(),
            &VIEW,
            Some(ArgsBuilder::build_using(|args| {
                args.add_expr({
                    let mut obj = ObjLitBuilder::default();
                    for p in params.iter() {
                        obj.add_key(PropName::Ident(p.clone()), self.param(ident_expr(&p.sym)));
                    }
                    obj.build_expr()
                })
                .add_expr(arrow_expr(
                    Some(vec![
                        {
                            let mut obj = ObjLitBuilder::default();
                            for p in params.iter() {
                                obj.add_shorthand(ident(&p.sym));
                            }
                            Pat::from(obj.build_expr())
                        },
                        {
                            match self.syntax {
                                Syntax::Js => Pat::from(self.unmount_sig.expr()),
                                Syntax::Ts => Pat::from(BindingIdent {
                                    id: ident(&self.unmount_sig.name),
                                    type_ann: Some(UNMOUNT_SIGNAL_TYPE.clone()),
                                }),
                            }
                        },
                    ]),
                    body,
                ));
            })),
        )
    }
}

struct NameAndExpr {
    name: JsWord,
    expr: Box<Expr>,
}

impl NameAndExpr {
    fn ident(name: JsWord) -> Self {
        Self {
            expr: ident_expr(&name),
            name,
        }
    }

    fn expr(&self) -> Box<Expr> {
        self.expr.clone()
    }
}

static LIB: &str = "viewmill";

static UNMOUNT_SIGNAL: &str = "unmountSignal";
static UNMOUNT_SIGNAL_TYPE: Lazy<Box<TsTypeAnn>> = Lazy::new(|| {
    Box::from(TsTypeAnn {
        span: DUMMY_SP,
        type_ann: Box::from(TsType::from(TsTypeRef {
            span: DUMMY_SP,
            type_name: TsEntityName::from(ident(&js_word!("AbortSignal"))),
            type_params: None,
        })),
    })
});

static_jsword!(LIVE, "live");
static_jsword!(PARAM, "param");
static_jsword!(INSERT, "insert");
static_jsword!(COND, "cond");
static_jsword!(LIST, "list");
static_jsword!(EL, "el");
static_jsword!(ATTR, "attr");
static_jsword!(ATTRS, "attrs");
static_jsword!(EXPR, "expr");
static_jsword!(LISTEN, "listen");
static_jsword!(VIEW, "view");
static_jsword!(CMP, "cmp");
