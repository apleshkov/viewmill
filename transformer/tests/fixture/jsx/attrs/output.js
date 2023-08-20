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
    }, unmountSignal)=>([
            viewmill.el('<span str_attr="1"></span>'),
            viewmill.el("<button>button</button>", (container, unmountSignal1)=>{
                const button__1 = container.firstChild;
                viewmill.listen(button__1, "click", ()=>console.log(a.getValue() + b.getValue()), [
                    a,
                    b
                ], unmountSignal1);
            }),
            viewmill.el("<span></span>", (container, unmountSignal1)=>{
                const span__1 = container.firstChild;
                viewmill.attrs(span__1, ()=>({
                        a2: 2,
                        a3: b.getValue()
                    }), [
                    b
                ], unmountSignal1);
            }),
            viewmill.el("<span></span>", (container, unmountSignal1)=>{
                const span__1 = container.firstChild;
                viewmill.attr(span__1, "num_attr", 1);
                viewmill.attr(span__1, "bool_attr", true);
            }),
            viewmill.el('<img alt="Static title"/>', (container, unmountSignal1)=>{
                const img__1 = container.firstChild;
                viewmill.attr(img__1, "src", ()=>(`/path/to/img/${a.getValue()}`), [
                    a
                ], unmountSignal1);
                viewmill.attr(img__1, "title", ()=>([
                        a.getValue(),
                        b.getValue()
                    ].join(", ")), [
                    a,
                    b
                ], unmountSignal1);
            }),
            viewmill.el("<p></p>", (container, unmountSignal1)=>{
                const p__1 = container.firstChild;
                viewmill.attr(p__1, "b", ()=>(b.getValue()), [
                    b
                ], unmountSignal1);
                viewmill.attrs(p__1, ()=>(a.getValue()), [
                    a
                ], unmountSignal1);
            }),
            viewmill.el("<div></div>", (container, unmountSignal1)=>{
                const div__1 = container.firstChild;
                viewmill.attr(div__1, "fn_attr", foo(1));
            }),
            viewmill.el("<div></div>", (container, unmountSignal1)=>{
                const div__1 = container.firstChild;
                viewmill.attr(div__1, "fn_attr", ()=>(foo(a.getValue())), [
                    a
                ], unmountSignal1);
            }),
            viewmill.el("<div></div>", (container, unmountSignal1)=>{
                const div__1 = container.firstChild;
                viewmill.attrs(div__1, foo(1));
            }),
            viewmill.el("<div></div>", (container, unmountSignal1)=>{
                const div__1 = container.firstChild;
                viewmill.attrs(div__1, ()=>(foo(b.getValue())), [
                    b
                ], unmountSignal1);
            })
        ]));
};
