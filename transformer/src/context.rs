use swc_core::{
    common::{sync::Lazy, DUMMY_SP},
    ecma::{ast::*, atoms::JsWord},
};

use super::{
    glob,
    live::{deps_expr, DestructArg},
    scope::Scope,
    utils::*,
};

pub struct TrContext {
    lib_name: JsWord,
    unmount_sig_name: JsWord,
}

impl TrContext {
    pub fn new(src: &str, scope: &mut Scope) -> Self {
        const LIB: &str = "viewmill";
        const UNMOUNT_SIG: &str = "unmountSignal";

        let lib_name = glob::uname(LIB, src);
        scope.insert(&lib_name);
        let unmount_sig_name = glob::uname(UNMOUNT_SIG, src);
        scope.insert(&unmount_sig_name);
        Self {
            lib_name,
            unmount_sig_name,
        }
    }

    pub fn nested(&self, sig_name: JsWord) -> Self {
        Self {
            lib_name: self.lib_name.clone(),
            unmount_sig_name: sig_name,
        }
    }
}

impl TrContext {
    pub fn import_decl(&self) -> ImportDecl {
        const RUNTIME: &str = "viewmill-runtime";

        let src = Str::from(RUNTIME);
        let s = ImportSpecifier::Namespace(ImportStarAsSpecifier {
            span: DUMMY_SP,
            local: ident(&self.lib_name),
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
        static_jsword!(LIVE, "live");
        obj_method_call(
            ident_expr(&self.lib_name),
            &LIVE,
            Some(ArgsBuilder::build_using(|args| {
                args.add_expr(arrow_short_expr(None, expr));
                args.add_expr(deps_expr(deps));
                if let Some(d) = destruct {
                    args.add_expr(d.to_expr());
                } else {
                    args.add_expr(null_expr());
                }
                args.add_expr(ident_expr(&self.unmount_sig_name));
            })),
        )
    }

    pub fn param(&self, initial: Box<Expr>) -> Box<Expr> {
        static_jsword!(PARAM, "param");
        obj_method_call(
            ident_expr(&self.lib_name),
            &PARAM,
            Some(ArgsBuilder::from(initial).build()),
        )
    }

    pub fn condition(
        &self,
        test: Box<Expr>,
        cons: Box<Expr>,
        alt: Box<Expr>,
        deps: &Vec<JsWord>,
    ) -> Box<Expr> {
        static_jsword!(COND, "cond");
        obj_method_call(
            ident_expr(&self.lib_name),
            &COND,
            Some(ArgsBuilder::build_using(|args| {
                args.add_expr(arrow_short_expr(None, test))
                    .add_expr(arrow_short_expr(None, cons))
                    .add_expr(arrow_short_expr(None, alt))
                    .add_expr(deps_expr(deps));
            })),
        )
    }

    pub fn expression(&self, expr: Box<Expr>, deps: &Vec<JsWord>) -> Box<Expr> {
        static_jsword!(EXPR, "expr");
        obj_method_call(
            ident_expr(&self.lib_name),
            &EXPR,
            Some(ArgsBuilder::build_using(|args| {
                args.add_expr(arrow_short_expr(None, expr))
                    .add_expr(deps_expr(deps));
            })),
        )
    }

    pub fn list(&self, expr: Box<Expr>, deps: Option<&Vec<JsWord>>) -> Box<Expr> {
        static_jsword!(LIST, "list");
        obj_method_call(
            ident_expr(&self.lib_name),
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
        sig: Option<&JsWord>,
    ) -> Box<Expr> {
        static_jsword!(ATTR, "attr");
        obj_method_call(
            ident_expr(&self.lib_name),
            &ATTR,
            Some(ArgsBuilder::build_using(|args| {
                args.add_expr(ident_expr(node_name));
                args.add_str(&name);
                if let Some(deps) = deps {
                    args.add_expr(arrow_short_expr(None, value));
                    args.add_expr(deps_expr(deps));
                    if let Some(sig) = sig {
                        args.add_expr(ident_expr(sig));
                    }
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
        sig: Option<&JsWord>,
    ) -> Box<Expr> {
        static_jsword!(ATTRS, "attrs");
        obj_method_call(
            ident_expr(&self.lib_name),
            &ATTRS,
            Some(ArgsBuilder::build_using(|args| {
                args.add_expr(ident_expr(node_name));
                if let Some(deps) = deps {
                    args.add_expr(arrow_short_expr(None, value));
                    args.add_expr(deps_expr(deps));
                    if let Some(sig) = sig {
                        args.add_expr(ident_expr(sig));
                    }
                } else {
                    args.add_expr(value);
                }
            })),
        )
    }

    pub fn element(&self, html: Option<Box<Expr>>, func: Option<Box<Expr>>) -> Box<Expr> {
        static_jsword!(EL, "el");
        obj_method_call(
            ident_expr(&self.lib_name),
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
        static_jsword!(INSERT, "insert");
        obj_method_call(
            ident_expr(&self.lib_name),
            &INSERT,
            Some(ArgsBuilder::build_using(|args| {
                args.add_expr(expr)
                    .add_expr(ident_expr(&target_name.clone()))
                    .add_expr(ident_expr(&anchor_name.clone()));
            })),
        )
    }

    pub fn unmount_on(&self, expr: Box<Expr>) -> Box<Expr> {
        static_jsword!(UNMOUNT_ON, "unmountOn");
        obj_method_call(
            ident_expr(&self.lib_name),
            &UNMOUNT_ON,
            Some(ArgsBuilder::build_using(|args| {
                args.add_expr(ident_expr(&self.unmount_sig_name))
                    .add_expr(expr);
            })),
        )
    }

    pub fn listen(
        &self,
        target_name: &JsWord,
        event_name: &str,
        cb: Box<Expr>,
        deps: Option<&Vec<JsWord>>,
        sig: Option<&JsWord>,
    ) -> Box<Expr> {
        static_jsword!(LISTEN, "listen");
        obj_method_call(
            ident_expr(&self.lib_name),
            &LISTEN,
            Some(ArgsBuilder::build_using(|args| {
                args.add_expr(ident_expr(&target_name.clone()))
                    .add_expr(Box::from(Str::from(event_name)))
                    .add_expr(cb);
                if let Some(deps) = deps {
                    args.add_expr(deps_expr(deps));
                    if let Some(sig) = sig {
                        args.add_expr(ident_expr(sig));
                    }
                }
            })),
        )
    }

    pub fn cmp(&self, name: Box<Expr>, props: Box<Expr>) -> Box<Expr> {
        static_jsword!(CMP, "cmp");
        obj_method_call(
            ident_expr(&self.lib_name),
            &CMP,
            Some(ArgsBuilder::build_using(|args| {
                args.add_expr(name);
                args.add_expr(props);
            })),
        )
    }

    pub fn view(&self, params: Vec<Ident>, body: Box<BlockStmtOrExpr>) -> Box<Expr> {
        static_jsword!(VIEW, "view");
        obj_method_call(
            ident_expr(&self.lib_name),
            &VIEW,
            Some(ArgsBuilder::build_using(|args| {
                args.add_expr({
                    let mut obj = ObjLitBuilder::default();
                    for p in params.iter() {
                        let mut p = p.clone();
                        p.optional = false;
                        let value = self.param(ident_expr(&p.sym));
                        obj.add_key(PropName::Ident(p), value);
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
                        Pat::from(ident_expr(&self.unmount_sig_name)),
                    ]),
                    body,
                ));
            })),
        )
    }
}
