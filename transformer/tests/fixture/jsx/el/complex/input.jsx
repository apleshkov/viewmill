function outside(a) {
    return a * 3;
}

export default (a, b) => {
    const c = a + b;
    return <div>
        <h1>Conditions</h1>
        <p>{a ? `a = ${a}` : ""}</p>
        {c ? <p>c = {c}</p> : null}
        <h1>Exprs</h1>
        {outside(a)}
        <p>{a + b + c}</p>
        <h1>Lists</h1>
        {...[a]}
        {...[c].map((v, i) => <>[{i}] =&gt; {v}<br /></>)}
        <ul>
            {...[c, b, a].map((v, i) => <li>{i}: {v}</li>)}
        </ul>
        <h1>Other</h1>
        <><p>{a}</p></>
    </div>;
};