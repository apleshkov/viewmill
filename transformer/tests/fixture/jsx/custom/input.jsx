function Foo({ x }) {
    return x;
}

const Bar = ({ x }) => {
    return x;
};

export default (a, b) => {
    function Baz({ x }) {
        const c = a + b;
        return <div x={x}>
            {c}
            <p>{a}</p>
        </div>
    }

    const quux = {
        quuz: ({ x }) => (
            <div>{x} {a}</div>
        )
    };

    const loading = false;
    return <>
        <div>
            <Foo x={<span>x</span>} />
            <Bar x={a}>
                {"child 1"}
                <p>child 2</p>
                {loading ? <p>Loading...</p> : null}
                {a > 0 ? <span>{a} xx 0</span> : <span>a is 0</span>}
                {...[loading]}
            </Bar>
            <Baz x={loading ? a + b : false}>
                <Foo x="one child" />
            </Baz>            
        </div>
        <quux.quuz x={loading}></quux.quuz>
        <test:ns>
            Not a custom!
            <child:ns>{a}</child:ns>
        </test:ns>
    </>;
};