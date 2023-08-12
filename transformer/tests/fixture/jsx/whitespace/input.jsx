function outside(a) {
    return a * 3;
}

export default (a, b) => {
    return <>
           {123}
        <p> {a} {b}  {a + b} {1}  {2}  </p>
        <p>a is <span>{1}  </span>   </p>
        <div>
            &nbsp;{a}&nbsp;
            &nbsp;<span>&nbsp;text</span>
            <p>text&nbsp;</p>
            <><p>{a}</p></>
            &nbsp;
        </div>
        <>
            &nbsp;{b}&nbsp;
            &nbsp;<span>&nbsp;text</span>
            <p>text&nbsp;</p>
            &nbsp;
        </>
        <div>
            Newline text
            Newline text
            Newline text
        </div>
        <>
            {1},
            {"2"},
            {3}
        </>
        <>
            {1},
            ,{"2"}
            ,{3}
        </>
    </>;
};