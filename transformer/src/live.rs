use swc_core::{
    common::DUMMY_SP,
    ecma::{ast::*, atoms::JsWord},
};

use super::{context::TrContext, utils::*};

pub fn value_of(name: &JsWord) -> Box<Expr> {
    obj_method_call(ident_expr(name), &"getValue".into(), None)
}

pub fn var_initializer(
    ctx: &TrContext,
    pat: &mut Pat,
    expr: Box<Expr>,
    deps: &Vec<JsWord>,
) -> Option<Box<Expr>> {
    match pat {
        Pat::Ident(_) => Some(ctx.live(expr, &deps, None)),
        Pat::Array(arr) => {
            let d = DestructArg::from(&*arr);
            *pat = d.to_decl_pat();
            Some(ctx.live(expr, &deps, Some(&d)))
        }
        Pat::Object(obj) => {
            let d = DestructArg::from(&*obj);
            *pat = d.to_decl_pat();
            Some(ctx.live(expr, &deps, Some(&d)))
        }
        _ => None,
    }
}

pub fn deps_expr(deps: &Vec<JsWord>) -> Box<Expr> {
    if deps.is_empty() {
        null_expr()
    } else {
        let elems = deps
            .iter()
            .map(|d| ExprOrSpread {
                spread: None,
                expr: ident_expr(d),
            })
            .map(|entry| Some(entry))
            .collect();
        let lit = ArrayLit {
            span: DUMMY_SP,
            elems,
        };
        Box::from(lit)
    }
}

pub struct DestructArg {
    count: usize,
    src: Pat,
    result: Vec<Ident>,
}

impl From<&ArrayPat> for DestructArg {
    fn from(value: &ArrayPat) -> Self {
        let mut count = 0;
        let mut result = vec![];
        for e in &value.elems {
            if let Some(pat) = e {
                if let Some(idents) = Self::idents_from(pat) {
                    count += idents.len();
                    result.extend(idents);
                }
            }
        }
        Self {
            count,
            src: Pat::from(value.clone()),
            result,
        }
    }
}

impl From<&ObjectPat> for DestructArg {
    fn from(value: &ObjectPat) -> Self {
        let mut count = 0;
        let mut result = vec![];
        for p in &value.props {
            match p {
                ObjectPatProp::KeyValue(p) => {
                    if let Some(idents) = Self::idents_from(&p.value) {
                        count += idents.len();
                        result.extend(idents);
                    }
                }
                ObjectPatProp::Assign(p) => {
                    result.push(p.key.clone());
                    count += 1;
                }
                ObjectPatProp::Rest(p) => {
                    if let Some(binding) = p.arg.as_ident() {
                        result.push(binding.id.clone());
                        count += 1;
                    }
                }
            };
        }
        Self {
            count,
            src: Pat::from(value.clone()),
            result,
        }
    }
}

impl DestructArg {
    pub fn to_expr(&self) -> Box<Expr> {
        Box::from(ArrayLit {
            span: DUMMY_SP,
            elems: vec![
                Some(ExprOrSpread {
                    spread: None,
                    expr: Box::from(self.count),
                }),
                Some(ExprOrSpread {
                    spread: None,
                    expr: arrow_short_expr(
                        Some(vec![self.src.clone()]),
                        Box::from(ArrayLit {
                            span: DUMMY_SP,
                            elems: self
                                .result
                                .iter()
                                .map(|id| {
                                    Some(ExprOrSpread {
                                        spread: None,
                                        expr: Box::from(id.clone()),
                                    })
                                })
                                .collect(),
                        }),
                    ),
                }),
            ],
        })
    }

    fn to_decl_pat(&self) -> Pat {
        Pat::Array(ArrayPat {
            span: DUMMY_SP,
            elems: self
                .result
                .iter()
                .map(|id| Some(Pat::from(id.clone())))
                .collect(),
            optional: false,
            type_ann: None,
        })
    }

    fn idents_from(pat: &Pat) -> Option<Vec<Ident>> {
        match pat {
            Pat::Ident(binding) => Some(vec![binding.id.clone()]),
            Pat::Array(arr) => {
                let d = DestructArg::from(arr);
                Some(d.result)
            }
            Pat::Rest(rest) => Self::idents_from(&rest.arg),
            Pat::Object(obj) => {
                let d = DestructArg::from(obj);
                Some(d.result)
            }
            Pat::Assign(assign) => Self::idents_from(&assign.left),
            Pat::Invalid(_) => None,
            Pat::Expr(_) => None,
        }
    }
}
