import * as viewmill from "viewmill-runtime";
export default function(a = 1, [[[b]]], { c: { d } } = {
    c: {
        d: 123
    }
}) {
    return viewmill.view({
        a: viewmill.param(a),
        b: viewmill.param(b),
        d: viewmill.param(d)
    }, ({
        a,
        b,
        d
    }, unmountSignal)=>{
        return a.getValue() + b.getValue() + d.getValue();
    });
};
