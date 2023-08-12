use swc_core::ecma::atoms::JsWord;

pub fn uname(name: &str, src: &str) -> JsWord {
    if src.contains(name) {
        let mut name = name.to_owned() + "_";
        while src.contains(&name) {
            name += "_";
        }
        JsWord::from(name)
    } else {
        JsWord::from(name)
    }
}

#[cfg(test)]
mod tests {

    use super::*;

    fn jsw(s: &str) -> JsWord {
        JsWord::from(s)
    }

    #[test]
    fn no_matches() {
        assert_eq!(uname("foo", ""), jsw("foo"));
    }

    #[test]
    fn matches() {
        assert_eq!(uname("foo", "foo"), jsw("foo_"));
        assert_eq!(uname("foo", "foo-bar"), jsw("foo_"));
        assert_eq!(uname("foo", "foo_"), jsw("foo__"));
        assert_eq!(uname("foo", "foo___"), jsw("foo____"));
    }
}
