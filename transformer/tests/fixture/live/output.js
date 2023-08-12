import * as viewmill from "viewmill-runtime";
export default function(a, b) {
    return viewmill.view({
        a: viewmill.param(a),
        b: viewmill.param(b)
    }, ({
        a,
        b
    }, unmountSignal)=>{
        const c = viewmill.live(()=>(a.getValue() + b.getValue()), [
            a,
            b
        ]);
        const [d1, d2, d3] = viewmill.live(()=>([
                a.getValue(),
                b.getValue(),
                c.getValue()
            ]), [
            a,
            b,
            c
        ], [
            3,
            ([d1, d2 = 123, { d3 }])=>([
                    d1,
                    d2,
                    d3
                ])
        ]);
        const [e1, e2, e3, e4] = viewmill.live(()=>({
                ...{
                    a: a.getValue(),
                    b: b.getValue(),
                    c: c.getValue()
                }
            }), [
            a,
            b,
            c
        ], [
            4,
            ({ e1, e2 = 321, e3: { foo: e3 }, e4: [e4] })=>([
                    e1,
                    e2,
                    e3,
                    e4
                ])
        ]);
        return {
            c: c.getValue(),
            d: [
                d1.getValue(),
                d2.getValue(),
                d3.getValue()
            ],
            e: [
                e1.getValue(),
                e2.getValue(),
                e3.getValue(),
                e4.getValue()
            ]
        };
    });
}
;
