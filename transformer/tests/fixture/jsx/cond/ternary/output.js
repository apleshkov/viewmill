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
                viewmill.cond(()=>(flag.getValue()), ()=>(1), ()=>(0), [
                    flag
                ])
            ],
            [
                viewmill.cond(()=>((flag.getValue() ? a.getValue() : b.getValue())), ()=>((a.getValue() ? 1 : 0)), ()=>((b.getValue() ? 1 : 0)), [
                    flag,
                    a,
                    b
                ])
            ],
            [
                viewmill.cond(()=>(a.getValue() && b.getValue()), ()=>(1), ()=>(0), [
                    a,
                    b
                ])
            ],
            [
                viewmill.cond(()=>(flag.getValue() && a.getValue() && b.getValue()), ()=>(1), ()=>(0), [
                    flag,
                    a,
                    b
                ])
            ],
            [
                viewmill.cond(()=>(true), ()=>(a.getValue()), ()=>(b.getValue()), [
                    a,
                    b
                ])
            ],
            [
                true ? 1 : 0
            ],
            viewmill.el("<p></p>", (container, unmountSignal1)=>{
                const p__1 = container.firstChild;
                viewmill.attr(p__1, "class", ()=>(a.getValue() ? "a" : ""), [
                    a
                ], unmountSignal1);
            })
        ];
    });
};
