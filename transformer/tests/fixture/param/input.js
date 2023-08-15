export default (a = 1, [[[b]]], { c: { d } } = { c: { d: 123 } }) => {
    return a + b + d;
};