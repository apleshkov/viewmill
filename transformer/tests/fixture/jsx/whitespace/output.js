import * as viewmill from "viewmill-runtime";
function outside(a) {
    return a * 3;
}
export default function(a, b) {
    return viewmill.view({
        a: viewmill.param(a),
        b: viewmill.param(b)
    }, ({
        a,
        b
    })=>{
        return [
            123,
            viewmill.el("<p> <!> <!>  <!> <!>  <!>  </p>", (container, unmountSignal)=>{
                const p__1 = container.firstChild;
                const anchor__1 = p__1.firstChild.nextSibling;
                viewmill.insert(viewmill.expr(()=>(a.getValue()), [
                    a
                ]), p__1, anchor__1);
                const anchor__2 = anchor__1.nextSibling.nextSibling;
                viewmill.insert(viewmill.expr(()=>(b.getValue()), [
                    b
                ]), p__1, anchor__2);
                const anchor__3 = anchor__2.nextSibling.nextSibling;
                viewmill.insert(viewmill.expr(()=>(a.getValue() + b.getValue()), [
                    a,
                    b
                ]), p__1, anchor__3);
                const anchor__4 = anchor__3.nextSibling.nextSibling;
                viewmill.insert(1, p__1, anchor__4);
                const anchor__5 = anchor__4.nextSibling.nextSibling;
                viewmill.insert(2, p__1, anchor__5);
            }),
            viewmill.el("<p>a is <span><!>  </span>   </p>", (container, unmountSignal)=>{
                const p__1 = container.firstChild;
                const span__1 = p__1.firstChild.nextSibling;
                const anchor__1 = span__1.firstChild;
                viewmill.insert(1, span__1, anchor__1);
            }),
            viewmill.el("<div>&nbsp;<!>&nbsp; &nbsp;<span>&nbsp;text</span><p>text&nbsp;</p><!>&nbsp;</div>", (container, unmountSignal)=>{
                const div__1 = container.firstChild;
                const anchor__1 = div__1.firstChild.nextSibling;
                viewmill.insert(viewmill.expr(()=>(a.getValue()), [
                    a
                ]), div__1, anchor__1);
                const span__1 = anchor__1.nextSibling.nextSibling;
                const p__1 = span__1.nextSibling;
                const anchor__2 = p__1.nextSibling;
                viewmill.insert([
                    viewmill.el("<p><!></p>", (container1, unmountSignal1)=>{
                        const p__2 = container1.firstChild;
                        const anchor__2 = p__2.firstChild;
                        viewmill.insert(viewmill.expr(()=>(a.getValue()), [
                            a
                        ]), p__2, anchor__2);
                    })
                ], div__1, anchor__2);
            }),
            [
                "&nbsp;",
                viewmill.expr(()=>(b.getValue()), [
                    b
                ]),
                "&nbsp; &nbsp;",
                viewmill.el("<span>&nbsp;text</span>"),
                viewmill.el("<p>text&nbsp;</p>"),
                "&nbsp;"
            ],
            viewmill.el("<div>Newline text Newline text Newline text</div>"),
            [
                1,
                ",",
                "2",
                ",",
                3
            ],
            [
                1,
                ", ,",
                "2",
                ",",
                3
            ]
        ];
    });
};
