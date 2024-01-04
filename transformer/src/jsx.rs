use regex::Regex;
use swc_core::{
    common::{sync::Lazy, DUMMY_SP},
    ecma::{ast::*, atoms::*},
};

use super::{
    context::TrContext,
    errors::SpanError,
    scope::{Scope, ScopeItem},
    tr::*,
    utils::*,
};

pub fn tr_root_el(
    ctx: &TrContext,
    el: &mut Box<JSXElement>,
    scope: &Scope,
) -> Result<Box<Expr>, SpanError> {
    match ElName::from(&el.opening.name) {
        ElName::HTML(tag_name) => {
            let mut builder = ElBuilder::new(&ctx, scope);
            let container_name = builder.container_name.clone();
            tr_html_el(
                &tag_name,
                el,
                &mut builder,
                &NodePath::Root(container_name).first(),
            )?;
            Ok(builder.build())
        }
        ElName::Custom(name) => tr_cmp(ctx, el, name, scope),
    }
}

pub fn tr_root_frag(
    ctx: &TrContext,
    frag: &mut JSXFragment,
    scope: &Scope,
) -> Result<Box<Expr>, SpanError> {
    let mut elems = vec![];
    for child in frag.children.iter_mut() {
        let expr = match child {
            JSXElementChild::JSXText(text) => {
                let text = tr_child_text(&text.value);
                if text.is_empty() {
                    None
                } else {
                    Some(Box::from(text))
                }
            }
            JSXElementChild::JSXExprContainer(c) => tr_child_expr_container(ctx, c, scope)?,
            JSXElementChild::JSXSpreadChild(spread) => Some(tr_child_spread(ctx, spread, scope)?),
            JSXElementChild::JSXElement(el) => Some(tr_root_el(ctx, el, scope)?),
            JSXElementChild::JSXFragment(frag) => Some(tr_root_frag(ctx, frag, scope)?),
        };
        if let Some(expr) = expr {
            elems.push(Some(ExprOrSpread::from(expr)));
        }
    }
    Ok(Box::from(ArrayLit {
        span: DUMMY_SP,
        elems,
    }))
}

fn tr_el_child(
    child: &mut JSXElementChild,
    builder: &mut ElBuilder,
    container_name: &JsWord,
    node_path: &NodePath,
) -> Result<Option<NodePath>, SpanError> {
    let ctx = &builder.ctx;
    match child {
        JSXElementChild::JSXText(text) => {
            let text = tr_child_text(&text.value);
            if text.is_empty() {
                Ok(None)
            } else {
                builder.push_html_str(&text);
                Ok(Some(node_path.clone()))
            }
        }
        JSXElementChild::JSXExprContainer(c) => {
            match tr_child_expr_container(ctx, c, &builder.scope)? {
                Some(expr) => {
                    let path =
                        builder.push_insertable_expr(expr.clone(), container_name, node_path);
                    Ok(Some(path))
                }
                None => Ok(None),
            }
        }
        JSXElementChild::JSXSpreadChild(spread) => {
            let path = builder.push_insertable_expr(
                tr_child_spread(ctx, spread, &builder.scope)?,
                container_name,
                node_path,
            );
            Ok(Some(path))
        }
        JSXElementChild::JSXElement(el) => {
            let path = tr_child_el(el, builder, container_name, node_path)?;
            Ok(Some(path))
        }
        JSXElementChild::JSXFragment(frag) => {
            let path = tr_child_frag(frag, builder, container_name, node_path)?;
            Ok(Some(path))
        }
    }
}

fn tr_child_text(text: &str) -> String {
    static NL_WS: &str = r"\n[\n\t\s]*";
    static RE_OUTER: Lazy<Regex> =
        Lazy::new(|| Regex::new(&format!("^({NL_WS})|({NL_WS})$")).unwrap());
    static RE_INNER: Lazy<Regex> = Lazy::new(|| Regex::new(NL_WS).unwrap());
    let text = text.replace('\u{A0}', "&nbsp;");
    let text = RE_OUTER.replace_all(&text, "").to_string();
    RE_INNER.replace_all(&text, " ").to_string()
}

fn tr_child_expr_container(
    ctx: &TrContext,
    c: &mut JSXExprContainer,
    scope: &Scope,
) -> Result<Option<Box<Expr>>, SpanError> {
    match &mut c.expr {
        JSXExpr::JSXEmptyExpr(_) => Ok(None),
        JSXExpr::Expr(expr) => match tr_expr(ctx, expr, scope)? {
            TrValue::None => match &**expr {
                Expr::Bin(expr) if expr.op == op!("&&") => {
                    Ok(Some(Box::new(Expr::Cond(CondExpr {
                        span: DUMMY_SP,
                        test: expr.left.clone(),
                        cons: expr.right.clone(),
                        alt: null_expr(),
                    }))))
                }
                _ => Ok(Some(expr.clone())),
            },
            TrValue::Deps(deps) => match &**expr {
                Expr::Cond(expr) => Ok(Some(ctx.condition(
                    expr.test.clone(),
                    expr.cons.clone(),
                    expr.alt.clone(),
                    &deps,
                ))),
                Expr::Bin(expr) if expr.op == op!("&&") => Ok(Some(ctx.condition(
                    expr.left.clone(),
                    expr.right.clone(),
                    null_expr(),
                    &deps,
                ))),
                _ => Ok(Some(ctx.expression(expr.clone(), &deps))),
            },
        },
    }
}

fn tr_child_spread(
    ctx: &TrContext,
    spread: &mut JSXSpreadChild,
    scope: &Scope,
) -> Result<Box<Expr>, SpanError> {
    let expr = &mut spread.expr;
    let deps = match tr_expr(ctx, expr, scope)? {
        TrValue::None => None,
        TrValue::Deps(deps) => Some(deps),
    };
    Ok(ctx.list(expr.clone(), deps.as_ref()))
}

fn tr_child_el(
    el: &mut Box<JSXElement>,
    builder: &mut ElBuilder,
    container_name: &JsWord,
    node_path: &NodePath,
) -> Result<NodePath, SpanError> {
    let ctx = &builder.ctx;
    match ElName::from(&el.opening.name) {
        ElName::HTML(tag_name) => tr_html_el(&tag_name, el, builder, node_path),
        ElName::Custom(name) => {
            let scope = &builder.scope;
            let expr = tr_cmp(ctx, el, name, scope)?;
            let node_path = builder.push_insertable_expr(expr, container_name, node_path);
            Ok(node_path)
        }
    }
}

fn tr_child_frag(
    frag: &mut JSXFragment,
    builder: &mut ElBuilder,
    container_name: &JsWord,
    node_path: &NodePath,
) -> Result<NodePath, SpanError> {
    let expr = tr_root_frag(&builder.ctx, frag, &builder.scope)?;
    Ok(builder.push_insertable_expr(expr, container_name, node_path))
}

fn tr_child_as_expr(
    ctx: &TrContext,
    child: &mut JSXElementChild,
    scope: &Scope,
) -> Result<Option<Box<Expr>>, SpanError> {
    Ok(match child {
        JSXElementChild::JSXText(text) => {
            let text = tr_child_text(&text.value);
            if text.is_empty() {
                None
            } else {
                Some(Box::from(text))
            }
        }
        JSXElementChild::JSXExprContainer(c) => tr_child_expr_container(ctx, c, scope)?,
        JSXElementChild::JSXSpreadChild(spread) => Some(tr_child_spread(ctx, spread, scope)?),
        JSXElementChild::JSXElement(el) => Some(tr_root_el(ctx, el, scope)?),
        JSXElementChild::JSXFragment(frag) => Some(tr_root_frag(ctx, frag, scope)?),
    })
}

fn tr_cmp(
    ctx: &TrContext,
    el: &mut Box<JSXElement>,
    name: Box<Expr>,
    scope: &Scope,
) -> Result<Box<Expr>, SpanError> {
    static_jsword!(CHILDREN, "children");
    let mut props = ObjLitBuilder::default();
    for attr in el.opening.attrs.iter_mut() {
        match attr {
            JSXAttrOrSpread::JSXAttr(attr) => {
                let name: PropName = match &attr.name {
                    JSXAttrName::Ident(ident) => PropName::from(ident.clone()),
                    JSXAttrName::JSXNamespacedName(nn) => {
                        PropName::from(Str::from(str_from_nn(nn)))
                    }
                };
                if let Some(value) = &mut attr.value {
                    let value: Box<Expr> = match value {
                        JSXAttrValue::Lit(lit) => Box::from(lit.clone()),
                        JSXAttrValue::JSXExprContainer(c) => match &mut c.expr {
                            JSXExpr::JSXEmptyExpr(_) => Box::from(true),
                            JSXExpr::Expr(expr) => match expr.as_ident() {
                                Some(ident) if scope.is_live(&ident.sym) => expr.clone(),
                                _ => match tr_expr(ctx, expr, scope)? {
                                    TrValue::None => expr.clone(),
                                    TrValue::Deps(deps) => ctx.live(expr.clone(), &deps, None),
                                },
                            },
                        },
                        JSXAttrValue::JSXElement(el) => tr_root_el(ctx, el, scope)?,
                        JSXAttrValue::JSXFragment(frag) => tr_root_frag(ctx, frag, scope)?,
                    };
                    props.add_key(name, value);
                } else {
                    props.add_key(name, Box::from(true));
                }
            }
            JSXAttrOrSpread::SpreadElement(spread) => {
                props.add_spread(spread.clone());
            }
        };
    }
    let mut children = Vec::with_capacity(el.children.len());
    for child in el.children.iter_mut() {
        if let Some(expr) = tr_child_as_expr(ctx, child, scope)? {
            children.push(Some(ExprOrSpread::from(expr)));
        }
    }
    if children.len() > 1 {
        props.add_key(
            PropName::Ident(ident(&CHILDREN)),
            Box::from(ArrayLit {
                span: DUMMY_SP,
                elems: children,
            }),
        );
    } else if let Some(Some(first)) = children.pop() {
        props.add_key(PropName::Ident(ident(&CHILDREN)), Box::from(first.expr));
    }
    Ok(ctx.cmp(name, props.build_expr()))
}

fn tr_html_el(
    tag_name: &str,
    el: &mut Box<JSXElement>,
    builder: &mut ElBuilder,
    node_path: &NodePath,
) -> Result<NodePath, SpanError> {
    builder.push_html_str(&format!("<{tag_name}"));
    let node_path = builder.push_node_path(&tag_name, node_path);
    let node_name = node_path.root();
    for attr in el.opening.attrs.iter_mut() {
        match attr {
            JSXAttrOrSpread::JSXAttr(attr) => tr_el_attr(attr, builder, &node_name)?,
            JSXAttrOrSpread::SpreadElement(spread) => {
                tr_el_spread_attr(spread, builder, &node_name)?
            }
        };
    }
    if let Some(_) = &el.closing {
        builder.push_html_str(">");
        let mut node_path = node_path.first();
        for child in el.children.iter_mut() {
            if let Some(path) = tr_el_child(child, builder, &node_name, &node_path)? {
                node_path = path.next();
            }
        }
        builder.push_html_str(&format!("</{tag_name}>"));
    } else {
        builder.push_html_str("/>");
    }
    Ok(node_path)
}

fn tr_el_attr(
    attr: &mut JSXAttr,
    builder: &mut ElBuilder,
    node_name: &JsWord,
) -> Result<(), SpanError> {
    static ON: &str = "on";
    let ctx = &builder.ctx;
    let (name, event_name) = match &attr.name {
        JSXAttrName::Ident(ident) => {
            let name = ident.sym.to_string();
            let event_name = if name.len() > 2 && &name[..2] == ON {
                Some(name[2..].to_string())
            } else {
                None
            };
            (name, event_name)
        }
        JSXAttrName::JSXNamespacedName(nn) => (str_from_nn(nn), None),
    };
    if let Some(value) = &mut attr.value {
        match value {
            JSXAttrValue::Lit(lit) => {
                builder.push_html_attr(&name, Box::from(lit.clone()));
            }
            JSXAttrValue::JSXExprContainer(c) => {
                match &mut c.expr {
                    JSXExpr::JSXEmptyExpr(_) => (),
                    JSXExpr::Expr(expr) => {
                        let value = tr_expr(ctx, expr, &builder.scope)?;
                        if let Some(event_name) = event_name {
                            let deps = match value {
                                TrValue::None => None,
                                TrValue::Deps(deps) => Some(deps),
                            };
                            builder.push_body_expr(ctx.listen(
                                node_name,
                                &event_name,
                                expr.clone(),
                                deps.as_ref(),
                                Some(&builder.unmount_sig_name),
                            ));
                        } else {
                            let deps = match value {
                                TrValue::None => None,
                                TrValue::Deps(deps) => Some(deps),
                            };
                            builder.push_body_expr(ctx.attr(
                                node_name,
                                &name,
                                expr.clone(),
                                deps.as_ref(),
                                Some(&builder.unmount_sig_name),
                            ));
                        }
                    }
                };
            }
            _ => builder.push_html_str(&format!(" {name}")),
        };
    } else {
        builder.push_html_str(&format!(" {name}"));
    }
    Ok(())
}

fn tr_el_spread_attr(
    attr: &mut SpreadElement,
    builder: &mut ElBuilder,
    node_name: &JsWord,
) -> Result<(), SpanError> {
    let ctx = &builder.ctx;
    let expr = &mut attr.expr;
    let expr = match tr_expr(ctx, expr, &builder.scope)? {
        TrValue::None => ctx.attrs(node_name, expr.clone(), None, None),
        TrValue::Deps(deps) => ctx.attrs(
            node_name,
            expr.clone(),
            Some(&deps),
            Some(&builder.unmount_sig_name),
        ),
    };
    builder.push_body_expr(expr);
    Ok(())
}

#[derive(Clone, Debug)]
enum NodePath {
    Root(JsWord),
    FirstOf(Box<NodePath>),
    NextTo(Box<NodePath>),
}

impl NodePath {
    fn root(&self) -> JsWord {
        match self {
            NodePath::Root(n) => n.clone(),
            NodePath::FirstOf(path) => path.root(),
            NodePath::NextTo(path) => path.root(),
        }
    }

    fn first(&self) -> NodePath {
        NodePath::FirstOf(Box::new(self.clone()))
    }

    fn next(&self) -> NodePath {
        NodePath::NextTo(Box::new(self.clone()))
    }

    fn to_expr(&self) -> Box<Expr> {
        match self {
            NodePath::Root(n) => ident_expr(&n),
            NodePath::FirstOf(path) => member_expr(
                path.to_expr(),
                MemberProp::Ident(ident(&"firstChild".into())),
            ),
            NodePath::NextTo(path) => member_expr(
                path.to_expr(),
                MemberProp::Ident(ident(&"nextSibling".into())),
            ),
        }
    }
}

fn str_from_nn(nn: &JSXNamespacedName) -> String {
    [&nn.ns, &nn.name]
        .map(|ident| ident.sym.to_string())
        .join(":")
}

struct ElBuilder<'a> {
    ctx: TrContext,
    scope: Scope<'a>,
    container_name: JsWord,
    unmount_sig_name: JsWord,
    html: Vec<Box<Expr>>,
    body: Vec<Stmt>,
    show_body: bool,
}

impl<'a> ElBuilder<'a> {
    fn new(ctx: &TrContext, scope: &'a Scope) -> Self {
        const CONTAINER: &str = "container";
        const UNMOUNT_SIGNAL: &str = "unmountSignal";

        let mut scope = Scope::child_of(scope);
        let container_name = scope.insert_str_prefixed(CONTAINER);
        let unmount_sig_name = scope.insert_str_prefixed(UNMOUNT_SIGNAL);
        return Self {
            ctx: ctx.nested(unmount_sig_name.clone()),
            scope,
            container_name,
            unmount_sig_name,
            html: Default::default(),
            body: Default::default(),
            show_body: false,
        };
    }

    fn push_html_expr(&mut self, expr: Box<Expr>) {
        let last_str = self
            .html
            .last_mut()
            .map(|expr| expr.as_mut_lit())
            .flatten()
            .map(|lit| if let Lit::Str(s) = lit { Some(s) } else { None })
            .flatten();
        let new_str = expr
            .as_lit()
            .map(|lit| match lit {
                Lit::Str(s) => Some(s.value.to_string()),
                Lit::JSXText(t) => Some(t.value.to_string()),
                _ => None,
            })
            .flatten();
        match (last_str, new_str) {
            (Some(last_str), Some(new_str)) => {
                let s = last_str.value.to_string() + new_str.as_str();
                last_str.value = s.into();
            }
            _ => self.html.push(expr),
        };
    }

    fn push_html_str(&mut self, s: &str) {
        self.push_html_expr(Box::from(s))
    }

    fn push_html_attr(&mut self, name: &str, expr: Box<Expr>) {
        self.push_html_str(&format!(" {name}=\""));
        self.push_html_expr(expr);
        self.push_html_str("\"");
    }

    fn push_body_expr(&mut self, expr: Box<Expr>) {
        self.show_body = true;
        self.body.push(stmt_from_expr(expr))
    }

    fn push_insertable_expr(
        &mut self,
        expr: Box<Expr>,
        container_name: &JsWord,
        node_path: &NodePath,
    ) -> NodePath {
        self.show_body = true;
        self.push_html_str("<!>");
        let anchor = self.push_node_path("anchor", node_path);
        self.body
            .push(stmt_from_expr(self.ctx.unmount_on(self.ctx.insert(
                expr,
                container_name,
                &anchor.root(),
            ))));
        anchor
    }

    fn push_node_path(&mut self, prefix: &str, node_path: &NodePath) -> NodePath {
        let name = self.scope.insert_prefixed_item_with_offset(
            &format!("{prefix}__", prefix = prefix.replace(":", "_")).into(),
            Some(1),
            ScopeItem::Default,
        );
        self.body.push(const_decl(&name, node_path.to_expr()));
        NodePath::Root(name)
    }

    fn build(self) -> Box<Expr> {
        self.ctx.element(
            {
                let mut iter = self.html.into_iter();
                if let Some(first_expr) = iter.next() {
                    let mut expr = first_expr;
                    for e in iter {
                        let e = paren_expr(e);
                        let bin = BinExpr {
                            span: DUMMY_SP,
                            op: op!(bin, "+"),
                            left: expr,
                            right: e,
                        };
                        expr = Box::new(Expr::Bin(bin));
                    }
                    Some(expr)
                } else {
                    None
                }
            },
            {
                if self.show_body {
                    Some(arrow_expr(
                        Some(vec![
                            ident_pat(&self.container_name),
                            ident_pat(&self.unmount_sig_name),
                        ]),
                        block_or_expr_from_stmts(self.body),
                    ))
                } else {
                    None
                }
            },
        )
    }
}

enum ElName {
    HTML(String),
    Custom(Box<Expr>),
}

impl From<&JSXElementName> for ElName {
    fn from(value: &JSXElementName) -> Self {
        match value {
            JSXElementName::Ident(ident) => {
                let s = ident.sym.to_string();
                if s.starts_with(char::is_uppercase) {
                    Self::Custom(ident_expr(&s.into()))
                } else {
                    Self::HTML(s)
                }
            }
            JSXElementName::JSXMemberExpr(expr) => {
                fn to_member_expr(expr: &JSXMemberExpr) -> Box<Expr> {
                    let obj = match &expr.obj {
                        JSXObject::JSXMemberExpr(expr) => to_member_expr(expr),
                        JSXObject::Ident(ident) => Box::from(ident.clone()),
                    };
                    member_expr(obj, MemberProp::Ident(expr.prop.clone()))
                }
                Self::Custom(to_member_expr(expr))
            }
            JSXElementName::JSXNamespacedName(nn) => Self::HTML(str_from_nn(nn)),
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::jsx::tr_child_text;

    #[test]
    fn test_child_text() {
        assert_eq!(tr_child_text(" text"), " text");
        assert_eq!(tr_child_text("     text"), "     text");
        assert_eq!(tr_child_text("text "), "text ");
        assert_eq!(tr_child_text("text     "), "text     ");
        assert_eq!(tr_child_text("\u{a0}text"), "&nbsp;text");
        assert_eq!(tr_child_text("text\u{a0}"), "text&nbsp;");
        assert_eq!(tr_child_text("\n\n            "), "");
        assert_eq!(tr_child_text("\ntext\n"), "text");
        assert_eq!(
            tr_child_text("\n\n            Newline text\n\n            Newline text\n\n            Newline text\n\n        "), 
            "Newline text Newline text Newline text"
        );
        assert_eq!(
            tr_child_text("\n   \u{a0}   \u{a0}\n    "),
            "&nbsp;   &nbsp;"
        );
    }
}
