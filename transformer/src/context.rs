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
    lib: NameAndExpr,
    unmount_sig: NameAndExpr,
}

impl TrContext {
    pub fn new(src: &str, scope: &mut Scope) -> Self {
        const LIB: &str = "viewmill";
        const UNMOUNT_SIG: &str = "unmountSignal";

        let lib_name = glob::uname(LIB, src);
        scope.insert(&lib_name);
        let unmount_sig = glob::uname(UNMOUNT_SIG, src);
        scope.insert(&unmount_sig);
        Self {
            lib: NameAndExpr::ident(lib_name),
            unmount_sig: NameAndExpr::ident(unmount_sig),
        }
    }
}

impl TrContext {
    pub fn import_decl(&self) -> ImportDecl {
        const RUNTIME: &str = "viewmill-runtime";

        let src = Str::from(RUNTIME);
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
        static_jsword!(LIVE, "live");
        obj_method_call(
            self.lib.expr(),
            &LIVE,
            Some(ArgsBuilder::build_using(|args| {
                args.add_expr(arrow_short_expr(None, expr));
                args.add_expr(deps_expr(deps));
                if let Some(d) = destruct {
                    args.add_expr(d.to_expr());
                } else {
                    args.add_expr(null_expr());
                }
                args.add_expr(self.unmount_sig.expr());
            })),
        )
    }

    pub fn param(&self, initial: Box<Expr>) -> Box<Expr> {
        static_jsword!(PARAM, "param");
        obj_method_call(
            self.lib.expr(),
            &PARAM,
            Some(ArgsBuilder::from(initial).build()),
        )
    }

    pub fn condition(&self, expr: &CondExpr, deps: &Vec<JsWord>) -> Box<Expr> {
        static_jsword!(COND, "cond");
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
        static_jsword!(EXPR, "expr");
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
        static_jsword!(LIST, "list");
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
        sig: Option<&JsWord>,
    ) -> Box<Expr> {
        static_jsword!(ATTR, "attr");
        obj_method_call(
            self.lib.expr(),
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
            self.lib.expr(),
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
        static_jsword!(INSERT, "insert");
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

    pub fn unmount_on(&self, sig: &JsWord, expr: Box<Expr>) -> Box<Expr> {
        static_jsword!(UNMOUNT_ON, "unmountOn");
        obj_method_call(
            self.lib.expr(),
            &UNMOUNT_ON,
            Some(ArgsBuilder::build_using(|args| {
                args.add_expr(ident_expr(sig)).add_expr(expr);
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
            self.lib.expr(),
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
            self.lib.expr(),
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
            self.lib.expr(),
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
                        Pat::from(self.unmount_sig.expr()),
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
