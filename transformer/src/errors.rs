use swc_core::common::Span;

pub struct SpanError {
    pub span: Span,
    pub msg: String,
}

impl SpanError {
    pub fn new(span: Span, msg: &str) -> Self {
        Self {
            span,
            msg: msg.to_string(),
        }
    }
}
