use std::collections::HashMap;
use swc_core::ecma::{ast::*, atoms::JsWord};

use super::utils::walk_every_pat_idents;

#[derive(Debug, Clone, Copy)]
pub enum ScopeItem {
    Default,
    Live,
}

impl ScopeItem {
    fn is_live(&self) -> bool {
        match self {
            ScopeItem::Default => false,
            ScopeItem::Live => true,
        }
    }
}

#[derive(Default)]
pub struct Scope<'a> {
    parent: Option<&'a Scope<'a>>,
    map: HashMap<JsWord, ScopeItem>,
    counted_set: HashMap<JsWord, u64>,
}

impl Scope<'_> {
    pub fn is_live(&self, name: &JsWord) -> bool {
        self.get(name).map(|item| item.is_live()).unwrap_or(false)
    }

    fn get(&self, name: &JsWord) -> Option<&ScopeItem> {
        self.map.get(name).or_else(|| {
            self.parent
                .as_ref()
                .map(|parent| parent.get(name))
                .flatten()
        })
    }
}

impl Scope<'_> {
    pub fn insert(&mut self, name: &JsWord) {
        self.insert_item(name, ScopeItem::Default);
    }

    pub fn insert_item(&mut self, name: &JsWord, item: ScopeItem) {
        self.map.insert(name.clone(), item);
        self.counted_set.insert(name.clone(), 0);
    }

    pub fn insert_pat_item(&mut self, pat: &Pat, item: ScopeItem) {
        walk_every_pat_idents(pat, |ident| self.insert_item(&ident.sym, item));
    }

    pub fn insert_str_prefixed(&mut self, prefix: &str) -> JsWord {
        self.insert_prefixed(&prefix.into())
    }

    pub fn insert_prefixed(&mut self, prefix: &JsWord) -> JsWord {
        self.insert_prefixed_item_with_offset(prefix, None, ScopeItem::Default)
    }

    pub fn insert_prefixed_item_with_offset(
        &mut self,
        prefix: &JsWord,
        offset: Option<u64>,
        item: ScopeItem,
    ) -> JsWord {
        let name: JsWord = {
            let c = self
                .counted_set
                .entry(prefix.clone())
                .and_modify(|c| *c += 1)
                .or_insert_with(|| {
                    let mut count: Option<u64> = None;
                    let mut cur_parent = self.parent;
                    while let Some(parent) = cur_parent {
                        if let Some(c) = parent.counted_set.get(&prefix) {
                            count = Some(*c + 1);
                            break;
                        }
                        cur_parent = parent.parent;
                    }
                    count.or(offset).unwrap_or(0)
                });
            match c {
                0 if offset.is_none() => prefix.clone(),
                _ => JsWord::from(format!("{prefix}{c}")),
            }
        };
        if &name != prefix && self.get(&name).is_some() {
            self.insert_prefixed_item_with_offset(&name, offset, item)
        } else {
            self.map.insert(name.clone(), item);
            name
        }
    }
}

impl<'a> Scope<'a> {
    pub fn child_of(scope: &'a Self) -> Self {
        Self {
            parent: Some(scope),
            ..Default::default()
        }
    }
}

impl From<&Module> for Scope<'_> {
    fn from(value: &Module) -> Self {
        let mut scope = Self::default();
        for item in &value.body {
            match item {
                ModuleItem::ModuleDecl(decl) => match decl {
                    ModuleDecl::Import(decl) => {
                        for s in &decl.specifiers {
                            match s {
                                ImportSpecifier::Named(s) => scope.insert(&s.local.sym),
                                ImportSpecifier::Default(s) => scope.insert(&s.local.sym),
                                ImportSpecifier::Namespace(s) => scope.insert(&s.local.sym),
                            }
                        }
                    }
                    ModuleDecl::ExportDecl(export) => scope.insert_decl(&export.decl),
                    ModuleDecl::ExportDefaultDecl(export) => match &export.decl {
                        DefaultDecl::Class(expr) => scope.insert_class_expr(expr),
                        DefaultDecl::Fn(expr) => scope.insert_fn_expr(expr),
                        DefaultDecl::TsInterfaceDecl(decl) => scope.insert(&decl.id.sym),
                    },
                    ModuleDecl::ExportDefaultExpr(def) => scope.insert_expr(&def.expr),
                    ModuleDecl::TsImportEquals(decl) => {
                        scope.insert(&decl.id.sym);
                    }
                    ModuleDecl::TsExportAssignment(assign) => scope.insert_expr(&assign.expr),
                    _ => (),
                },
                ModuleItem::Stmt(stmt) => scope.insert_stmt(stmt),
            };
        }
        scope
    }
}

impl Scope<'_> {
    pub fn insert_stmt(&mut self, stmt: &Stmt) {
        match stmt {
            Stmt::Decl(decl) => self.insert_decl(decl),
            Stmt::Expr(stmt) => self.insert_expr(&stmt.expr),
            _ => (),
        }
    }

    pub fn insert_decl(&mut self, decl: &Decl) {
        match decl {
            Decl::Class(decl) => self.insert(&decl.ident.sym),
            Decl::Fn(decl) => self.insert(&decl.ident.sym),
            Decl::Var(var) => {
                for decl in &var.decls {
                    self.insert_pat_item(&decl.name, ScopeItem::Default);
                }
            }
            Decl::TsInterface(decl) => self.insert(&decl.id.sym),
            Decl::TsTypeAlias(decl) => self.insert(&decl.id.sym),
            Decl::TsEnum(decl) => self.insert(&decl.id.sym),
            Decl::TsModule(decl) => match &decl.id {
                TsModuleName::Ident(id) => self.insert(&id.sym),
                TsModuleName::Str(str) => self.insert(&str.value),
            },
            Decl::Using(using) => {
                for decl in &using.decls {
                    self.insert_pat_item(&decl.name, ScopeItem::Default);
                }
            }
        }
    }

    pub fn insert_expr(&mut self, expr: &Box<Expr>) {
        match &**expr {
            Expr::Fn(expr) => self.insert_fn_expr(expr),
            Expr::Class(expr) => self.insert_class_expr(expr),
            _ => (),
        }
    }

    pub fn insert_fn_expr(&mut self, expr: &FnExpr) {
        if let Some(ident) = &expr.ident {
            self.insert(&ident.sym);
        }
    }

    pub fn insert_class_expr(&mut self, expr: &ClassExpr) {
        if let Some(ident) = &expr.ident {
            self.insert(&ident.sym);
        }
    }
}

#[cfg(test)]
mod tests {

    use crate::utils;

    use super::*;

    fn jsw(str: &str) -> JsWord {
        JsWord::from(str)
    }

    #[test]
    fn test_insert() {
        let mut scope = Scope::default();
        scope.insert(&jsw("foo"));
        assert_eq!(
            scope.get(&jsw("foo")).map(|item| item.is_live()),
            Some(false)
        );
    }

    #[test]
    fn test_insert_prefixed_without_offset() {
        let mut scope = Scope::default();
        assert_eq!(scope.insert_prefixed(&jsw("foo")), jsw("foo"));
        assert_eq!(scope.insert_prefixed(&jsw("foo")), jsw("foo1"));
        assert_eq!(
            scope.insert_prefixed_item_with_offset(&jsw("foo"), None, ScopeItem::Default),
            jsw("foo2")
        );
        assert!(scope.get(&jsw("foo3")).is_none());
    }

    #[test]
    fn test_insert_prefixed_with_offset0() {
        let mut scope = Scope::default();
        assert_eq!(
            scope.insert_prefixed_item_with_offset(&jsw("foo"), Some(0), ScopeItem::Default),
            jsw("foo0")
        );
        assert_eq!(
            scope.insert_prefixed_item_with_offset(&jsw("foo"), Some(123), ScopeItem::Default),
            jsw("foo1")
        );
        assert_eq!(
            scope.insert_prefixed_item_with_offset(&jsw("foo"), None, ScopeItem::Default),
            jsw("foo2")
        );
        assert!(scope.get(&jsw("foo")).is_none());
        assert!(scope.get(&jsw("foo3")).is_none());
    }

    #[test]
    fn test_insert_prefixed_with_offset123() {
        let mut scope = Scope::default();
        assert_eq!(
            scope.insert_prefixed_item_with_offset(&jsw("foo"), Some(123), ScopeItem::Default),
            jsw("foo123")
        );
        assert_eq!(
            scope.insert_prefixed_item_with_offset(&jsw("foo"), None, ScopeItem::Default),
            jsw("foo124")
        );
        assert_eq!(
            scope.insert_prefixed_item_with_offset(&jsw("foo"), Some(321), ScopeItem::Default),
            jsw("foo125")
        );
        assert!(scope.get(&jsw("foo")).is_none());
    }

    #[test]
    fn test_insert_collision() {
        let mut scope = Scope::default();
        scope.insert(&jsw("foo1"));
        assert_eq!(
            scope.insert_prefixed_item_with_offset(&jsw("foo"), Some(1), ScopeItem::Default),
            jsw("foo11")
        );
    }

    #[test]
    fn test_replace() {
        let mut scope = Scope::default();
        assert_eq!(
            scope.insert_prefixed_item_with_offset(&jsw("foo"), Some(321), ScopeItem::Live),
            JsWord::from("foo321")
        );
        assert_eq!(scope.get(&jsw("foo")).map(|item| item.is_live()), None);
        assert_eq!(
            scope.get(&jsw("foo321")).map(|item| item.is_live()),
            Some(true)
        );
        assert_eq!(scope.insert_prefixed(&jsw("foo")), jsw("foo322"));
        scope.insert(&jsw("foo"));
        assert_eq!(
            scope.get(&jsw("foo")).map(|item| item.is_live()),
            Some(false)
        );
        assert_eq!(
            scope.get(&jsw("foo321")).map(|item| item.is_live()),
            Some(true)
        );
        assert_eq!(
            scope.get(&jsw("foo322")).map(|item| item.is_live()),
            Some(false)
        );
        assert_eq!(
            scope.insert_prefixed_item_with_offset(&jsw("foo"), Some(321), ScopeItem::Default),
            JsWord::from("foo1")
        );
        assert_eq!(
            scope.insert_prefixed_item_with_offset(&jsw("foo"), Some(321), ScopeItem::Default),
            JsWord::from("foo2")
        );
    }

    #[test]
    fn test_child_insert() {
        let mut scope = Scope::default();
        scope.insert(&jsw("foo"));
        scope.insert_pat_item(&utils::ident_pat(&jsw("bar")), ScopeItem::Default);
        let mut scope = Scope::child_of(&scope);
        assert_eq!(scope.insert_prefixed(&jsw("foo")), jsw("foo1"));
        assert_eq!(scope.insert_prefixed(&jsw("bar")), jsw("bar1"));
        let mut scope = Scope::child_of(&scope);
        assert_eq!(scope.insert_prefixed(&jsw("foo")), jsw("foo2"));
        assert_eq!(scope.insert_prefixed(&jsw("bar")), jsw("bar2"));
        let scope = Scope::child_of(&scope);
        let mut scope = Scope::child_of(&scope);
        assert_eq!(scope.insert_prefixed(&jsw("foo")), jsw("foo3"));
        assert_eq!(scope.insert_prefixed(&jsw("bar")), jsw("bar3"));
        assert_eq!(
            scope.insert_prefixed_item_with_offset(&jsw("bar"), Some(123), ScopeItem::Default),
            jsw("bar4")
        );
        assert_eq!(
            scope.insert_prefixed_item_with_offset(&jsw("baz"), Some(321), ScopeItem::Default),
            jsw("baz321")
        );
        let scope = Scope::child_of(&scope);
        let scope = Scope::child_of(&scope);
        let scope = Scope::child_of(&scope);
        let mut scope = Scope::child_of(&scope);
        assert_eq!(
            scope.insert_prefixed_item_with_offset(&jsw("baz"), Some(1024), ScopeItem::Default),
            jsw("baz322")
        );
    }
}
