function foo(x) {
    return x;
}

export default (a, b) => (
    <>
        <span str_attr="1"></span>
        <button 
            onclick={() => console.log(a + b)}
        >button</button>
        <span {...{ a2: 2, a3: b }}></span>
        <span num_attr={1} bool_attr={true}></span>
        <img src={`/path/to/img/${a}`} alt="Static title" title={[a, b].join(", ")} />
        <p b={...b} {...a}></p>
        <div fn_attr={foo(1)}></div>
        <div fn_attr={foo(a)}></div>
        <div {...foo(1)}></div>
        <div {...foo(b)}></div>
    </>
);