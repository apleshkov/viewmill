export default (a) => (
    <div>
        <h1>Header</h1>
        <p>Some text</p>
        <div>
            <h3>Another header</h3>
            <div>
                Text
                Text
                Text {a}, some text after
                <span>Text</span>
                {/* some comment */}
                Text
                <a href="#">Link to {a}!</a>
                <p>{a}</p>
            </div>
        </div>
    </div>
);