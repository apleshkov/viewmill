use swc_core::ecma::{ast::*, atoms::*};

use super::{context::TrContext, errors::SpanError, jsx, live, scope::*, utils::*};

pub enum TrValue {
    None,
    Deps(Vec<JsWord>),
}

impl Default for TrValue {
    fn default() -> Self {
        Self::None
    }
}

impl TrValue {
    fn extend(&mut self, other: TrValue) {
        match self {
            TrValue::None => *self = other,
            TrValue::Deps(deps) => match other {
                TrValue::None => (),
                TrValue::Deps(other) => {
                    for d in other {
                        if !deps.contains(&d) {
                            deps.push(d);
                        }
                    }
                }
            },
        };
    }
}

pub type TrResult = Result<TrValue, SpanError>;

fn tr_var_decl(ctx: &TrContext, var: &mut Box<VarDecl>, scope: &mut Scope) -> TrResult {
    for decl in var.decls.iter_mut() {
        if let Some(init) = &mut decl.init {
            let tr_result = tr_expr(ctx, init, &scope)?;
            match tr_result {
                TrValue::None => (),
                TrValue::Deps(deps) => {
                    let var_init = live::var_initializer(ctx, &mut decl.name, init.clone(), &deps);
                    if let Some(var_init) = var_init {
                        *init = var_init;
                        scope.insert_pat_item(&decl.name, ScopeItem::Live);
                    }
                }
            };
        }
    }
    Ok(TrValue::None)
}

fn tr_decl(ctx: &TrContext, decl: &mut Decl, scope: &mut Scope) -> TrResult {
    Ok(match decl {
        Decl::Class(decl) => tr_class(ctx, &mut decl.class, scope)?,
        Decl::Fn(decl) => tr_function(ctx, &mut decl.function, scope)?,
        Decl::Var(decl) => {
            tr_var_decl(ctx, decl, scope)?;
            TrValue::None
        }
        Decl::TsInterface(_) => TrValue::None,
        Decl::TsTypeAlias(_) => TrValue::None,
        Decl::TsEnum(_) => TrValue::None,
        Decl::TsModule(_) => TrValue::None,
        Decl::Using(_) => TrValue::None,
    })
}

pub fn tr_block_or_expr(
    ctx: &TrContext,
    input: &mut Box<BlockStmtOrExpr>,
    scope: &Scope,
) -> TrResult {
    match &mut **input {
        BlockStmtOrExpr::BlockStmt(block) => tr_block(ctx, block, scope),
        BlockStmtOrExpr::Expr(expr) => {
            let mut scope = Scope::child_of(scope);
            scope.insert_expr(expr);
            tr_expr(ctx, expr, &scope)
        }
    }
}

pub fn tr_block(ctx: &TrContext, block: &mut BlockStmt, scope: &Scope) -> TrResult {
    let mut result = TrValue::default();
    let mut scope = Scope::child_of(scope);
    for stmt in &block.stmts {
        scope.insert_stmt(stmt);
    }
    for stmt in block.stmts.iter_mut() {
        result.extend(tr_stmt(ctx, stmt, &mut scope)?);
    }
    Ok(result)
}

fn tr_stmt(ctx: &TrContext, stmt: &mut Stmt, scope: &mut Scope) -> TrResult {
    Ok(match stmt {
        Stmt::Block(block) => tr_block(ctx, block, scope)?,
        Stmt::Empty(_) => TrValue::None,
        Stmt::Debugger(_) => TrValue::None,
        Stmt::With(with) => tr_stmt(ctx, &mut with.body, scope)?,
        Stmt::Return(stmt) => match &mut stmt.arg {
            Some(arg) => tr_expr(ctx, arg, scope)?,
            None => TrValue::None,
        },
        Stmt::Labeled(stmt) => tr_stmt(ctx, &mut stmt.body, scope)?,
        Stmt::Break(_) => TrValue::None,
        Stmt::Continue(_) => TrValue::None,
        Stmt::If(stmt) => {
            let mut result = TrValue::default();
            result.extend(tr_expr(ctx, &mut stmt.test, scope)?);
            result.extend(tr_stmt(ctx, &mut stmt.cons, scope)?);
            if let Some(alt) = &mut stmt.alt {
                result.extend(tr_stmt(ctx, alt, scope)?);
            }
            result
        }
        Stmt::Switch(stmt) => {
            let mut result = TrValue::default();
            result.extend(tr_expr(ctx, &mut stmt.discriminant, scope)?);
            for case in stmt.cases.iter_mut() {
                if let Some(test) = &mut case.test {
                    result.extend(tr_expr(ctx, test, scope)?);
                }
                let mut scope = Scope::child_of(scope);
                for stmt in case.cons.iter_mut() {
                    result.extend(tr_stmt(ctx, stmt, &mut scope)?);
                }
            }
            result
        }
        Stmt::Throw(stmt) => tr_expr(ctx, &mut stmt.arg, scope)?,
        Stmt::Try(stmt) => {
            let mut result = TrValue::default();
            result.extend(tr_block(ctx, &mut stmt.block, scope)?);
            if let Some(handler) = &mut stmt.handler {
                let mut scope = Scope::child_of(&scope);
                if let Some(param) = &handler.param {
                    scope.insert_pat_item(param, ScopeItem::Default);
                }
                result.extend(tr_block(ctx, &mut handler.body, &scope)?);
            }
            if let Some(finalizer) = &mut stmt.finalizer {
                result.extend(tr_block(ctx, finalizer, &scope)?);
            }
            result
        }
        Stmt::While(stmt) => {
            let mut result = TrValue::default();
            result.extend(tr_expr(ctx, &mut stmt.test, scope)?);
            result.extend(tr_stmt(ctx, &mut stmt.body, scope)?);
            result
        }
        Stmt::DoWhile(stmt) => {
            let mut result = TrValue::default();
            result.extend(tr_expr(ctx, &mut stmt.test, scope)?);
            result.extend(tr_stmt(ctx, &mut stmt.body, scope)?);
            result
        }
        Stmt::For(stmt) => {
            let mut result = TrValue::default();
            let mut scope = Scope::child_of(scope);
            if let Some(init) = &mut stmt.init {
                match init {
                    VarDeclOrExpr::VarDecl(var) => {
                        tr_var_decl(ctx, var, &mut scope)?;
                    }
                    VarDeclOrExpr::Expr(expr) => {
                        result.extend(tr_expr(ctx, expr, &scope)?);
                    }
                };
            }
            if let Some(test) = &mut stmt.test {
                result.extend(tr_expr(ctx, test, &scope)?);
            }
            if let Some(update) = &mut stmt.update {
                result.extend(tr_expr(ctx, update, &scope)?);
            }
            result.extend(tr_stmt(ctx, &mut stmt.body, &mut scope)?);
            result
        }
        Stmt::ForIn(stmt) => {
            let mut result = TrValue::default();
            let mut scope = Scope::child_of(scope);
            result.extend(tr_expr(ctx, &mut stmt.right, &scope)?);
            result.extend(tr_stmt(ctx, &mut stmt.body, &mut scope)?);
            result
        }
        Stmt::ForOf(stmt) => {
            let mut result = TrValue::default();
            let mut scope = Scope::child_of(scope);
            result.extend(tr_expr(ctx, &mut stmt.right, &scope)?);
            result.extend(tr_stmt(ctx, &mut stmt.body, &mut scope)?);
            result
        }
        Stmt::Decl(decl) => tr_decl(ctx, decl, scope)?,
        Stmt::Expr(stmt) => tr_expr(ctx, &mut stmt.expr, scope)?,
    })
}

pub fn tr_expr(ctx: &TrContext, expr: &mut Box<Expr>, scope: &Scope) -> TrResult {
    fn tr_member_expr(ctx: &TrContext, expr: &mut MemberExpr, scope: &Scope) -> TrResult {
        let mut result = tr_expr(ctx, &mut expr.obj, scope)?;
        match &mut expr.prop {
            MemberProp::Ident(_) => (),
            MemberProp::PrivateName(_) => (),
            MemberProp::Computed(prop) => result.extend(tr_expr(ctx, &mut prop.expr, scope)?),
        };
        Ok(result)
    }

    match &mut **expr {
        Expr::Array(array) => {
            let mut result = TrValue::default();
            for el in array.elems.iter_mut() {
                if let Some(el) = el {
                    result.extend(tr_expr(ctx, &mut el.expr, scope)?);
                }
            }
            Ok(result)
        }
        Expr::Object(obj) => {
            let mut result = TrValue::default();
            for prop in obj.props.iter_mut() {
                match prop {
                    PropOrSpread::Spread(spread) => {
                        result.extend(tr_expr(ctx, &mut spread.expr, scope)?)
                    }
                    PropOrSpread::Prop(prop) => match &mut **prop {
                        Prop::Shorthand(shorthand) => {
                            let sym = &shorthand.sym;
                            if scope.is_live(sym) {
                                let mut value = ident_expr(sym);
                                result.extend(tr_expr(ctx, &mut value, scope)?);
                                *prop = Box::new(Prop::KeyValue(KeyValueProp {
                                    key: PropName::Ident(ident(sym)),
                                    value,
                                }));
                            }
                        }
                        Prop::KeyValue(prop) => {
                            result.extend(tr_expr(ctx, &mut prop.value, scope)?)
                        }
                        Prop::Assign(_) => (),
                        Prop::Getter(prop) => match &mut prop.body {
                            Some(body) => {
                                result.extend(tr_block(ctx, body, scope)?);
                            }
                            None => (),
                        },
                        Prop::Setter(prop) => {
                            let mut scope = Scope::child_of(scope);
                            scope.insert_pat_item(&prop.param, ScopeItem::Default);
                            result.extend(tr_pat(ctx, &mut prop.param, &scope)?);
                            if let Some(body) = &mut prop.body {
                                result.extend(tr_block(ctx, body, &mut scope)?);
                            }
                        }
                        Prop::Method(prop) => {
                            result.extend(tr_function(ctx, &mut prop.function, scope)?);
                        }
                    },
                };
            }
            Ok(result)
        }
        Expr::Fn(expr) => tr_function(ctx, &mut expr.function, scope),
        Expr::Unary(expr) => tr_expr(ctx, &mut expr.arg, scope),
        Expr::Update(upd) => tr_expr(ctx, &mut upd.arg, scope),
        Expr::Bin(expr) => {
            let mut result = TrValue::default();
            result.extend(tr_expr(ctx, &mut expr.left, scope)?);
            result.extend(tr_expr(ctx, &mut expr.right, scope)?);
            Ok(result)
        }
        Expr::Assign(assign) => {
            let mut result = TrValue::default();
            match &mut assign.left {
                PatOrExpr::Expr(expr) => result.extend(tr_expr(ctx, expr, scope)?),
                PatOrExpr::Pat(pat) => result.extend(tr_pat(ctx, pat, scope)?),
            };
            result.extend(tr_expr(ctx, &mut assign.right, scope)?);
            Ok(result)
        }
        Expr::Member(expr) => tr_member_expr(ctx, expr, scope),
        Expr::SuperProp(expr) => match &mut expr.prop {
            SuperProp::Ident(_) => Ok(TrValue::None),
            SuperProp::Computed(prop) => tr_expr(ctx, &mut prop.expr, scope),
        },
        Expr::Cond(expr) => {
            let mut result = TrValue::default();
            result.extend(tr_expr(ctx, &mut expr.test, scope)?);
            result.extend(tr_expr(ctx, &mut expr.cons, scope)?);
            result.extend(tr_expr(ctx, &mut expr.alt, scope)?);
            Ok(result)
        }
        Expr::Call(expr) => {
            let mut result = TrValue::default();
            match &mut expr.callee {
                Callee::Super(_) => (),
                Callee::Import(_) => (),
                Callee::Expr(expr) => result.extend(tr_expr(ctx, expr, scope)?),
            };
            for arg in expr.args.iter_mut() {
                result.extend(tr_expr(ctx, &mut arg.expr, scope)?);
            }
            Ok(result)
        }
        Expr::New(expr) => {
            let mut result = TrValue::default();
            result.extend(tr_expr(ctx, &mut expr.callee, scope)?);
            if let Some(args) = &mut expr.args {
                for arg in args.iter_mut() {
                    result.extend(tr_expr(ctx, &mut arg.expr, scope)?);
                }
            }
            Ok(result)
        }
        Expr::Seq(seq) => {
            let mut result = TrValue::default();
            for expr in seq.exprs.iter_mut() {
                result.extend(tr_expr(ctx, expr, scope)?);
            }
            Ok(result)
        }
        Expr::Ident(ident) => {
            let sym = &ident.sym;
            if scope.is_live(sym) {
                let result = TrValue::Deps(vec![sym.clone()]);
                *expr = live::value_of(sym);
                Ok(result)
            } else {
                Ok(TrValue::None)
            }
        }
        Expr::Tpl(tpl) => {
            let mut result = TrValue::default();
            for expr in tpl.exprs.iter_mut() {
                result.extend(tr_expr(ctx, expr, scope)?);
            }
            Ok(result)
        }
        Expr::TaggedTpl(tt) => {
            let mut result = TrValue::default();
            for expr in tt.tpl.exprs.iter_mut() {
                result.extend(tr_expr(ctx, expr, scope)?);
            }
            Ok(result)
        }
        Expr::Arrow(arrow) => {
            let mut result = TrValue::default();
            let mut scope = Scope::child_of(scope);
            for p in arrow.params.iter_mut() {
                scope.insert_pat_item(p, ScopeItem::Default);
                result.extend(tr_pat(ctx, p, &mut scope)?);
            }
            result.extend(tr_block_or_expr(ctx, &mut arrow.body, &mut scope)?);
            Ok(result)
        }
        Expr::Class(expr) => tr_class(ctx, &mut expr.class, scope),
        Expr::Yield(expr) => match &mut expr.arg {
            Some(arg) => tr_expr(ctx, arg, scope),
            None => Ok(TrValue::None),
        },
        Expr::Await(expr) => tr_expr(ctx, &mut expr.arg, scope),
        Expr::Paren(p) => tr_expr(ctx, &mut p.expr, scope),
        Expr::JSXMember(_) => Ok(TrValue::None),
        Expr::JSXNamespacedName(_) => Ok(TrValue::None),
        Expr::JSXEmpty(_) => Ok(TrValue::None),
        Expr::JSXElement(el) => {
            *expr = jsx::tr_root_el(ctx, el, scope)?;
            Ok(TrValue::None)
        }
        Expr::JSXFragment(frag) => {
            *expr = jsx::tr_root_frag(ctx, frag, scope)?;
            Ok(TrValue::None)
        }
        Expr::TsTypeAssertion(a) => tr_expr(ctx, &mut a.expr, scope),
        Expr::TsConstAssertion(a) => tr_expr(ctx, &mut a.expr, scope),
        Expr::TsNonNull(nn) => tr_expr(ctx, &mut nn.expr, scope),
        Expr::TsAs(e) => tr_expr(ctx, &mut e.expr, scope),
        Expr::TsSatisfies(s) => tr_expr(ctx, &mut s.expr, scope),
        Expr::PrivateName(_) => Ok(TrValue::None),
        Expr::OptChain(expr) => match &mut *expr.base {
            OptChainBase::Member(expr) => tr_member_expr(ctx, expr, scope),
            OptChainBase::Call(expr) => {
                let mut result = TrValue::default();
                result.extend(tr_expr(ctx, &mut expr.callee, scope)?);
                for arg in expr.args.iter_mut() {
                    result.extend(tr_expr(ctx, &mut arg.expr, scope)?);
                }
                Ok(result)
            }
        },
        Expr::This(_) => Ok(TrValue::None),
        Expr::Lit(_) => Ok(TrValue::None),
        Expr::MetaProp(_) => Ok(TrValue::None),
        Expr::TsInstantiation(_) => Ok(TrValue::None),
        Expr::Invalid(expr) => Err(SpanError::new(expr.span, "invalid node")),
    }
}

fn tr_pat(ctx: &TrContext, pat: &mut Pat, scope: &Scope) -> TrResult {
    match pat {
        Pat::Ident(ident) => {
            let sym = &ident.sym;
            if scope.is_live(sym) {
                let result = TrValue::Deps(vec![sym.clone()]);
                *pat = Pat::Expr(live::value_of(sym));
                Ok(result)
            } else {
                Ok(TrValue::None)
            }
        }
        Pat::Array(arr) => {
            let mut result = TrValue::default();
            for e in arr.elems.iter_mut() {
                if let Some(e) = e {
                    result.extend(tr_pat(ctx, e, scope)?);
                }
            }
            Ok(result)
        }
        Pat::Rest(rest) => tr_pat(ctx, &mut rest.arg, scope),
        Pat::Object(obj) => {
            let mut result = TrValue::default();
            for p in obj.props.iter_mut() {
                match p {
                    ObjectPatProp::KeyValue(p) => {
                        result.extend(tr_pat(ctx, &mut p.value, scope)?);
                    }
                    ObjectPatProp::Assign(p) => {
                        if let Some(value) = &mut p.value {
                            result.extend(tr_expr(ctx, value, scope)?);
                        }
                    }
                    ObjectPatProp::Rest(p) => result.extend(tr_pat(ctx, &mut p.arg, scope)?),
                };
            }
            Ok(result)
        }
        Pat::Assign(assign) => tr_expr(ctx, &mut assign.right, scope),
        Pat::Invalid(_) => Ok(TrValue::None),
        Pat::Expr(expr) => tr_expr(ctx, expr, scope),
    }
}

fn tr_function(ctx: &TrContext, func: &mut Box<Function>, scope: &Scope) -> TrResult {
    let mut result = TrValue::default();
    let mut scope = Scope::child_of(scope);
    for p in func.params.iter_mut() {
        scope.insert_pat_item(&p.pat, ScopeItem::Default);
        result.extend(tr_pat(ctx, &mut p.pat, &scope)?);
    }
    if let Some(body) = &mut func.body {
        result.extend(tr_block(ctx, body, &mut scope)?);
    }
    Ok(result)
}

fn tr_class(ctx: &TrContext, class: &mut Box<Class>, scope: &Scope) -> TrResult {
    fn insert_param(param: &ParamOrTsParamProp, scope: &mut Scope) {
        match param {
            ParamOrTsParamProp::TsParamProp(prop) => match &prop.param {
                TsParamPropParam::Ident(ident) => scope.insert(&ident.sym),
                TsParamPropParam::Assign(assign) => {
                    let pat = Pat::Assign(assign.clone());
                    scope.insert_pat_item(&pat, ScopeItem::Default)
                }
            },
            ParamOrTsParamProp::Param(param) => {
                scope.insert_pat_item(&param.pat, ScopeItem::Default)
            }
        };
    }

    fn tr_param(ctx: &TrContext, param: &mut ParamOrTsParamProp, scope: &Scope) -> TrResult {
        match param {
            ParamOrTsParamProp::TsParamProp(prop) => match &mut prop.param {
                TsParamPropParam::Ident(_) => Ok(TrValue::None),
                TsParamPropParam::Assign(assign) => tr_expr(ctx, &mut assign.right, scope),
            },
            ParamOrTsParamProp::Param(param) => tr_pat(ctx, &mut param.pat, scope),
        }
    }

    let mut result = TrValue::default();
    for member in class.body.iter_mut() {
        match member {
            ClassMember::Constructor(member) => {
                let mut scope = Scope::child_of(scope);
                for p in member.params.iter_mut() {
                    insert_param(p, &mut scope);
                    result.extend(tr_param(ctx, p, &scope)?);
                }
            }
            ClassMember::Method(member) => {
                result.extend(tr_function(ctx, &mut member.function, scope)?)
            }
            ClassMember::PrivateMethod(member) => {
                result.extend(tr_function(ctx, &mut member.function, scope)?)
            }
            ClassMember::ClassProp(member) => {
                if let Some(value) = &mut member.value {
                    result.extend(tr_expr(ctx, &mut *value, scope)?);
                }
            }
            ClassMember::PrivateProp(member) => {
                if let Some(value) = &mut member.value {
                    result.extend(tr_expr(ctx, &mut *value, scope)?);
                }
            }
            ClassMember::TsIndexSignature(_) => (),
            ClassMember::Empty(_) => (),
            ClassMember::StaticBlock(member) => {
                result.extend(tr_block(ctx, &mut member.body, scope)?)
            }
            ClassMember::AutoAccessor(member) => {
                if let Some(value) = &mut member.value {
                    result.extend(tr_expr(ctx, &mut *value, scope)?);
                }
            }
        };
    }
    Ok(result)
}
