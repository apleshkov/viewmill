export default (flag) => {
    const a = flag ? 1 : 0;
    const b = flag && 1;
    return <>
        <>{flag && 1}</>
        <>{flag && a}</>
        <>{flag && a && b && 1}</>
        <>{flag || a && b || 1}</>
        <>{true && 1}</>
        <p class={a && "a"}></p>
    </>;
};