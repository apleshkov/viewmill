use std::path::Path;

#[derive(Debug, PartialEq, Clone, Copy)]
pub enum Syntax {
    Js,
    Ts,
}

const JS: &str = "js";
const TS: &str = "ts";

impl Syntax {
    pub fn from_path(path: &Path) -> Option<Self> {
        const JSX: &str = "jsx";
        const TSX: &str = "tsx";
        path.extension()
            .map(|ext| ext.to_str())
            .flatten()
            .map(|ext| match ext.to_lowercase().as_str() {
                JS | JSX => Some(Syntax::Js),
                TS | TSX => Some(Syntax::Ts),
                _ => None,
            })
            .flatten()
    }

    pub fn ext(&self) -> &'static str {
        match self {
            Syntax::Js => JS,
            Syntax::Ts => TS,
        }
    }
}

#[cfg(test)]
mod tests {

    use super::*;

    #[test]
    fn test_syntax() {
        assert_eq!(
            Syntax::from_path(Path::new("input.js")).unwrap(),
            Syntax::Js
        );
        assert_eq!(
            Syntax::from_path(Path::new("input.jsx")).unwrap(),
            Syntax::Js
        );
        assert_eq!(
            Syntax::from_path(Path::new("input.jSx")).unwrap(),
            Syntax::Js
        );
        assert_eq!(
            Syntax::from_path(Path::new("input.ts")).unwrap(),
            Syntax::Ts
        );
        assert_eq!(
            Syntax::from_path(Path::new("input.tsx")).unwrap(),
            Syntax::Ts
        );
        assert_eq!(
            Syntax::from_path(Path::new("input.TSX")).unwrap(),
            Syntax::Ts
        );
    }
}
