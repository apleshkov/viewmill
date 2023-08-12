export default (a, b) => {
    const c = a + b;

    function f1(x) {
        return <span>{a + x + c}</span>;
    }

    const f2 = (x) => {
        return <>{x}</>;
    };

    const f3 = (x) => <div>{x}</div>;

    class C1 {
        #foo = a;
        constructor() {
            this.#bar = c;
        }
        baz() {
            return this.#bar * a;
        }
    }

    const o1 = {
        get x() { return a; },
        set x(newValue) { newValue + c }
    };

    const loading = false;
    return <>
        {f1(123)},
        {f2},
        {f3("text")},
        {new C1()},
        {o1}
    </>;
};