import * as viewmill from "viewmill-runtime";
function Foo({ x }) {
    return x;
}
const Bar = ({ x })=>{
    return x;
};
export default function(a, b) {
    return viewmill.view({
        a: viewmill.param(a),
        b: viewmill.param(b)
    }, ({
        a,
        b
    }, unmountSignal)=>{
        function Baz({ x }) {
            const c = viewmill.live(()=>(a.getValue() + b.getValue()), [
                a,
                b
            ], null, unmountSignal);
            return viewmill.el("<div><!><p><!></p></div>", (container, unmountSignal1)=>{
                const div__1 = container.firstChild;
                viewmill.attr(div__1, "x", x);
                const anchor__1 = div__1.firstChild;
                viewmill.unmountOn(unmountSignal1, viewmill.insert(viewmill.expr(()=>(c.getValue()), [
                    c
                ]), div__1, anchor__1));
                const p__1 = anchor__1.nextSibling;
                const anchor__2 = p__1.firstChild;
                viewmill.unmountOn(unmountSignal1, viewmill.insert(viewmill.expr(()=>(a.getValue()), [
                    a
                ]), p__1, anchor__2));
            });
        }
        const quux = {
            quuz: ({ x })=>(viewmill.el("<div><!> <!></div>", (container, unmountSignal1)=>{
                    const div__1 = container.firstChild;
                    const anchor__1 = div__1.firstChild;
                    viewmill.unmountOn(unmountSignal1, viewmill.insert(x, div__1, anchor__1));
                    const anchor__2 = anchor__1.nextSibling.nextSibling;
                    viewmill.unmountOn(unmountSignal1, viewmill.insert(viewmill.expr(()=>(a.getValue()), [
                        a
                    ]), div__1, anchor__2));
                }))
        };
        const loading = false;
        return [
            viewmill.el("<div><!><!><!>            </div>", (container, unmountSignal1)=>{
                const div__1 = container.firstChild;
                const anchor__1 = div__1.firstChild;
                viewmill.unmountOn(unmountSignal1, viewmill.insert(viewmill.cmp(Foo, {
                    x: viewmill.el("<span>x</span>")
                }), div__1, anchor__1));
                const anchor__2 = anchor__1.nextSibling;
                viewmill.unmountOn(unmountSignal1, viewmill.insert(viewmill.cmp(Bar, {
                    x: a,
                    children: [
                        "child 1",
                        viewmill.el("<p>child 2</p>"),
                        loading ? viewmill.el("<p>Loading...</p>") : null,
                        viewmill.cond(()=>(a.getValue() > 0), ()=>(viewmill.el("<span><!> xx 0</span>", (container1, unmountSignal2)=>{
                                const span__1 = container1.firstChild;
                                const anchor__2 = span__1.firstChild;
                                viewmill.unmountOn(unmountSignal2, viewmill.insert(viewmill.expr(()=>(a.getValue()), [
                                    a
                                ]), span__1, anchor__2));
                            })), ()=>(viewmill.el("<span>a is 0</span>")), [
                            a
                        ]),
                        viewmill.list(()=>([
                                loading
                            ]))
                    ]
                }), div__1, anchor__2));
                const anchor__3 = anchor__2.nextSibling;
                viewmill.unmountOn(unmountSignal1, viewmill.insert(viewmill.cmp(Baz, {
                    x: viewmill.live(()=>(loading ? a.getValue() + b.getValue() : false), [
                        a,
                        b
                    ], null, unmountSignal1),
                    children: viewmill.cmp(Foo, {
                        x: "one child"
                    })
                }), div__1, anchor__3));
            }),
            viewmill.cmp(quux.quuz, {
                x: loading
            }),
            viewmill.el("<test:ns>Not a custom!<child:ns><!></child:ns></test:ns>", (container, unmountSignal1)=>{
                const test_ns__1 = container.firstChild;
                const child_ns__1 = test_ns__1.firstChild.nextSibling;
                const anchor__1 = child_ns__1.firstChild;
                viewmill.unmountOn(unmountSignal1, viewmill.insert(viewmill.expr(()=>(a.getValue()), [
                    a
                ]), child_ns__1, anchor__1));
            })
        ];
    });
};
