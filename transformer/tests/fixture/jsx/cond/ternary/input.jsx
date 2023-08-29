export default (flag) => {
    const a = flag ? 1 : 0;
    const b = flag && 1;
    return <>
        <>{flag ? 1 : 0}</>
        <>{(flag ? a : b) ? (a ? 1 : 0) : (b ? 1 : 0)}</>
        <>{a && b ? 1 : 0}</>
        <>{flag && a && b ? 1 : 0}</>
        <>{true ? a : b}</>
        <>{true ? 1 : 0}</>
        <p class={a ? "a" : ""}></p>
    </>;
};