import * as viewmill from "viewmill-runtime";
export default function(flag) {
    return viewmill.view({
        flag: viewmill.param(flag)
    }, ({
        flag
    }, unmountSignal)=>{
        const a = viewmill.live(()=>(flag.getValue() ? 1 : 0), [
            flag
        ], null, unmountSignal);
        const b = viewmill.live(()=>(flag.getValue() && 1), [
            flag
        ], null, unmountSignal);
        return [
            [
                viewmill.cond(()=>(flag.getValue()), ()=>(1), ()=>(null), [
                    flag
                ])
            ],
            [
                viewmill.cond(()=>(flag.getValue()), ()=>(a.getValue()), ()=>(null), [
                    flag,
                    a
                ])
            ],
            [
                viewmill.cond(()=>(flag.getValue() && a.getValue() && b.getValue()), ()=>(1), ()=>(null), [
                    flag,
                    a,
                    b
                ])
            ],
            [
                viewmill.expr(()=>(flag.getValue() || a.getValue() && b.getValue() || 1), [
                    flag,
                    a,
                    b
                ])
            ],
            [
                true && 1
            ],
            viewmill.el("<p></p>", (container, unmountSignal1)=>{
                const p__1 = container.firstChild;
                viewmill.attr(p__1, "class", ()=>(a.getValue() && "a"), [
                    a
                ], unmountSignal1);
            })
        ];
    });
};
