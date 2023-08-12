export default (a, b) => (
    <>
        <h1>a = {a}</h1>
        <p>Foo</p>
        <><><><><span>Bar</span></></></></>
        {...a}
        {a + b + c}
        {a ? `a = ${a}` : null}
    </>
);