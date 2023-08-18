import * as viewmill from "viewmill-runtime";
export default function(a: number, b?: boolean) {
    return viewmill.view({
        a: viewmill.param(a),
        b: viewmill.param(b)
    }, ({
        a,
        b
    })=>([
            viewmill.expr(()=>(a.getValue()), [
                a
            ]),
            viewmill.expr(()=>(b.getValue()), [
                b
            ])
        ]));
};
