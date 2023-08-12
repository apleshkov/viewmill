export default function (a, b) {
    const c = a + b;
    const [d1, d2 = 123, { d3 }] = [a, b, c];
    const { e1, e2 = 321, e3: { foo: e3 }, e4: [e4] } = { ...{ a, b, c } };
    return {
        c,
        d: [d1, d2, d3],
        e: [e1, e2, e3, e4]
    };
};