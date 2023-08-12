extern crate wasm_bindgen;

use std::path::Path;

use wasm_bindgen::prelude::*;

use transformer::*;

#[wasm_bindgen(js_name = "Options")]
pub struct JsOptions {
    target: Option<String>,
    verbose: Option<bool>,
}

#[wasm_bindgen(js_class = "Options")]
impl JsOptions {
    #[wasm_bindgen(constructor)]
    pub fn new(target: Option<String>, verbose: Option<bool>) -> Self {
        Self { target, verbose }
    }
}

#[wasm_bindgen(js_name = "Output")]
pub struct JsOutput(Output);

#[wasm_bindgen(js_class = "Output")]
impl JsOutput {
    #[wasm_bindgen(getter)]
    pub fn src(self) -> String {
        self.0.src
    }

    #[wasm_bindgen(getter)]
    pub fn ext(&self) -> String {
        self.0.ext.to_string()
    }
}

#[wasm_bindgen]
pub fn transform(file_path: &str, input: &str, options: JsOptions) -> Result<JsOutput, String> {
    let options = Options::try_new(
        Syntax::from_path(Path::new(file_path))
            .ok_or_else(|| format!("Unknown file type at \"{file_path}\""))?,
        options.target.as_ref().map(String::as_str),
        options.verbose,
    )
    .map_err(|e| e.to_string())?;
    tr_str(input, options)
        .map(JsOutput)
        .map_err(|e| e.to_string())
}

#[wasm_bindgen(js_name = "displayEsVersions")]
pub fn display_es_versions() -> String {
    ES_SUPPORTED_VERSIONS
        .iter()
        .map(|s| {
            if s == &ES_DEFAULT_VERSION {
                format!("{s} (by default)")
            } else {
                s.to_string()
            }
        })
        .collect::<Vec<String>>()
        .join(", ")
}
