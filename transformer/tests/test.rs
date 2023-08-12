use std::{fs, path::Path};
use swc_core::{
    ecma::{
        ast::EsVersion,
        transforms::testing::{test, Tester},
    },
    testing,
};

use transformer::*;

#[test]
fn test_fixtures() {
    fn tr_file_path(input: &Path) -> Output {
        let tr_opts = Options {
            syntax: Syntax::from_path(input).unwrap(),
            target: EsVersion::Es5,
            can_emit_warnings: true,
        };
        Tester::run(|tester| {
            let fm = tester.cm.load_file(input).unwrap();
            Ok(tr_file(&fm, tester.cm.clone(), tr_opts, false).unwrap())
        })
    }
    fn visit(path: &Path) {
        if path.is_dir() {
            for entry in fs::read_dir(path).unwrap() {
                visit(entry.unwrap().path().as_path());
            }
        } else if path
            .file_name()
            .unwrap()
            .to_str()
            .unwrap()
            .starts_with("input.")
        {
            let output = tr_file_path(path);
            let actual = output.src;
            let mut output_path = path.parent().unwrap().to_path_buf();
            output_path.push("output.".to_string() + output.ext);
            let expected = String::from_utf8(fs::read(&output_path).unwrap()).unwrap();
            if actual != expected {
                panic!(
                    "assertion failed: `(left == right)`\n{diff}
                        \nOutput file: {output_path}\n
                        \n>>>>> Actual <<<<<\n\n{actual}",
                    output_path = output_path.to_str().unwrap(),
                    diff = testing::diff(&expected, &actual),
                );
            }
        }
    }
    _ = visit(&Path::new("./tests"));
}
