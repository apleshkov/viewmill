import * as viewmill from "viewmill-runtime";
export default function(a, b) {
    return viewmill.view({
        a: viewmill.param(a),
        b: viewmill.param(b)
    }, ({
        a,
        b
    }, unmountSignal)=>([
            viewmill.el("<h1>a = <!></h1>", (container)=>{
                const h1__1 = container.firstChild;
                const anchor__1 = h1__1.firstChild.nextSibling;
                viewmill.insert(viewmill.expr(()=>(a.getValue()), [
                    a
                ]), h1__1, anchor__1);
            }),
            viewmill.el("<p>Foo</p>"),
            [
                [
                    [
                        [
                            viewmill.el("<span>Bar</span>")
                        ]
                    ]
                ]
            ],
            viewmill.list(()=>(a.getValue()), [
                a
            ]),
            viewmill.expr(()=>(a.getValue() + b.getValue() + c), [
                a,
                b
            ]),
            viewmill.cond(()=>(a.getValue()), ()=>(`a = ${a.getValue()}`), ()=>(null), [
                a
            ])
        ]));
};
