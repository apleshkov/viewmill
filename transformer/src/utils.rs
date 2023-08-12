use swc_core::{
    common::{util::take::Take, DUMMY_SP},
    ecma::{ast::*, atoms::JsWord},
};

#[macro_export]
macro_rules! static_jsword {
    ($name:ident, $value:literal) => {
        static $name: Lazy<JsWord> = Lazy::new(|| JsWord::from($value));
    };
}

pub(crate) use static_jsword;

pub fn block_or_expr_from_stmts(stmts: Vec<Stmt>) -> Box<BlockStmtOrExpr> {
    let block = BlockStmt {
        span: DUMMY_SP,
        stmts,
    };
    Box::new(BlockStmtOrExpr::BlockStmt(block))
}

pub fn stmt_from_expr(expr: Box<Expr>) -> Stmt {
    Stmt::Expr(ExprStmt {
        span: DUMMY_SP,
        expr,
    })
}

pub fn paren_expr(expr: Box<Expr>) -> Box<Expr> {
    Box::new(Expr::Paren(ParenExpr {
        span: DUMMY_SP,
        expr,
    }))
}

pub fn obj_method_call(
    obj: Box<Expr>,
    method: &JsWord,
    args: Option<Vec<ExprOrSpread>>,
) -> Box<Expr> {
    let expr = Expr::Call(CallExpr {
        span: DUMMY_SP,
        callee: {
            let expr = MemberExpr {
                span: DUMMY_SP,
                obj,
                prop: MemberProp::Ident(ident(method)),
            };
            let expr = Expr::Member(expr);
            Callee::Expr(Box::new(expr))
        },
        args: args.unwrap_or_else(|| Take::dummy()),
        type_args: Take::dummy(),
    });
    Box::new(expr)
}

pub fn member_expr(obj: Box<Expr>, prop: MemberProp) -> Box<Expr> {
    Box::new(Expr::Member(MemberExpr {
        span: DUMMY_SP,
        obj,
        prop,
    }))
}

pub fn ident(sym: &JsWord) -> Ident {
    Ident::new(sym.clone(), DUMMY_SP)
}

pub fn ident_expr(sym: &JsWord) -> Box<Expr> {
    Box::new(Expr::Ident(ident(sym)))
}

pub fn ident_pat(sym: &JsWord) -> Pat {
    Pat::Ident(BindingIdent {
        id: ident(sym),
        type_ann: None,
    })
}

pub fn var_decl(name: &JsWord, kind: VarDeclKind, init: Option<Box<Expr>>) -> Stmt {
    let decls = vec![VarDeclarator {
        span: DUMMY_SP,
        name: ident_pat(name),
        init,
        definite: false,
    }];
    let decl = Decl::Var(Box::new(VarDecl {
        span: DUMMY_SP,
        kind,
        declare: false,
        decls,
    }));
    Stmt::Decl(decl)
}

pub fn const_decl(name: &JsWord, init: Box<Expr>) -> Stmt {
    var_decl(name, VarDeclKind::Const, Some(init))
}

pub fn arrow_expr(params: Option<Vec<Pat>>, body: Box<BlockStmtOrExpr>) -> Box<Expr> {
    Box::new(Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        params: params.unwrap_or_else(|| Take::dummy()),
        body,
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
    }))
}

pub fn arrow_short_expr(params: Option<Vec<Pat>>, body: Box<Expr>) -> Box<Expr> {
    let body = Box::new(BlockStmtOrExpr::Expr(paren_expr(body)));
    arrow_expr(params, body)
}

pub fn null_expr() -> Box<Expr> {
    let lit = Null { span: DUMMY_SP };
    Box::from(lit)
}

pub fn walk_every_pat_idents(pat: &Pat, mut cb: impl FnMut(&Ident)) {
    fn dive(pat: &Pat, cb: &mut impl FnMut(&Ident)) {
        match pat {
            Pat::Ident(ident) => cb(&ident.id),
            Pat::Array(arr) => {
                for e in &arr.elems {
                    if let Some(e) = e {
                        dive(e, cb);
                    }
                }
            }
            Pat::Rest(rest) => dive(&rest.arg, cb),
            Pat::Object(obj) => {
                for p in &obj.props {
                    match p {
                        ObjectPatProp::KeyValue(p) => dive(&p.value, cb),
                        ObjectPatProp::Assign(p) => cb(&p.key),
                        ObjectPatProp::Rest(p) => dive(&p.arg, cb),
                    };
                }
            }
            Pat::Assign(assign) => dive(&assign.left, cb),
            Pat::Invalid(_) => (),
            Pat::Expr(_) => (),
        };
    }
    dive(pat, &mut cb);
}

// Args Builder

#[derive(Default)]
pub struct ArgsBuilder {
    args: Vec<ExprOrSpread>,
}

impl ArgsBuilder {
    pub fn add_expr(&mut self, expr: Box<Expr>) -> &mut Self {
        self.args.push(ExprOrSpread { spread: None, expr });
        self
    }

    pub fn add_str(&mut self, str: &str) -> &mut Self {
        self.add_expr(Box::from(str))
    }

    pub fn build(self) -> Vec<ExprOrSpread> {
        self.args
    }

    pub fn build_using(using: impl FnOnce(&mut ArgsBuilder)) -> Vec<ExprOrSpread> {
        let mut builder = ArgsBuilder::default();
        using(&mut builder);
        builder.build()
    }
}

impl From<Box<Expr>> for ArgsBuilder {
    fn from(value: Box<Expr>) -> Self {
        let mut builder = Self::default();
        builder.add_expr(value);
        builder
    }
}

// Object Literal Builder

pub struct ObjLitBuilder {
    props: Vec<PropOrSpread>,
}

impl Default for ObjLitBuilder {
    fn default() -> Self {
        Self {
            props: Default::default(),
        }
    }
}

impl ObjLitBuilder {
    pub fn add_prop(&mut self, prop: Prop) -> &mut Self {
        self.props.push(PropOrSpread::Prop(Box::new(prop)));
        self
    }

    pub fn add_key(&mut self, key: PropName, value: Box<Expr>) -> &mut Self {
        match (key.as_ident(), value.as_ident()) {
            (Some(ident1), Some(ident2)) if ident1 == ident2 => self.add_shorthand(ident1.clone()),
            _ => self.add_prop(Prop::KeyValue(KeyValueProp { key, value })),
        }
    }

    pub fn add_shorthand(&mut self, ident: Ident) -> &mut Self {
        self.add_prop(Prop::Shorthand(ident))
    }

    pub fn add_spread(&mut self, s: SpreadElement) -> &mut Self {
        self.props.push(PropOrSpread::Spread(s));
        self
    }

    pub fn build_expr(self) -> Box<Expr> {
        Box::from(ObjectLit {
            span: DUMMY_SP,
            props: self.props,
        })
    }
}
