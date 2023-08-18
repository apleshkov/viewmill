import * as viewmill from "viewmill-runtime";
function foo(x) {
    return x;
}
export default function(a, b) {
    return viewmill.view({
        a: viewmill.param(a),
        b: viewmill.param(b)
    }, ({
        a,
        b
    })=>([
            viewmill.el('<span str_attr="1"></span>'),
            viewmill.el("<span></span>", (container, unmountSignal)=>{
                const span__1 = container.firstChild;
                viewmill.attrs(span__1, ()=>({
                        a2: 2,
                        a3: b.getValue()
                    }), [
                    b
                ], unmountSignal);
            }),
            viewmill.el("<span></span>", (container, unmountSignal)=>{
                const span__1 = container.firstChild;
                viewmill.attr(span__1, "num_attr", 1);
                viewmill.attr(span__1, "bool_attr", true);
            }),
            viewmill.el('<img alt="Static title"/>', (container, unmountSignal)=>{
                const img__1 = container.firstChild;
                viewmill.attr(img__1, "src", ()=>(`/path/to/img/${a.getValue()}`), [
                    a
                ], unmountSignal);
                viewmill.attr(img__1, "title", ()=>([
                        a.getValue(),
                        b.getValue()
                    ].join(", ")), [
                    a,
                    b
                ], unmountSignal);
            }),
            viewmill.el("<p></p>", (container, unmountSignal)=>{
                const p__1 = container.firstChild;
                viewmill.attr(p__1, "b", ()=>(b.getValue()), [
                    b
                ], unmountSignal);
                viewmill.attrs(p__1, ()=>(a.getValue()), [
                    a
                ], unmountSignal);
            }),
            viewmill.el("<div></div>", (container, unmountSignal)=>{
                const div__1 = container.firstChild;
                viewmill.attr(div__1, "fn_attr", foo(1));
            }),
            viewmill.el("<div></div>", (container, unmountSignal)=>{
                const div__1 = container.firstChild;
                viewmill.attr(div__1, "fn_attr", ()=>(foo(a.getValue())), [
                    a
                ], unmountSignal);
            }),
            viewmill.el("<div></div>", (container, unmountSignal)=>{
                const div__1 = container.firstChild;
                viewmill.attrs(div__1, foo(1));
            }),
            viewmill.el("<div></div>", (container, unmountSignal)=>{
                const div__1 = container.firstChild;
                viewmill.attrs(div__1, ()=>(foo(b.getValue())), [
                    b
                ], unmountSignal);
            })
        ]));
};
