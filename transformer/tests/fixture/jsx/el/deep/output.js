import * as viewmill from "viewmill-runtime";
export default function(a) {
    return viewmill.view({
        a: viewmill.param(a)
    }, ({
        a
    }, unmountSignal)=>(viewmill.el('<div><h1>Header</h1><p>Some text</p><div><h3>Another header</h3><div>Text Text Text <!>, some text after<span>Text</span>Text<a href="#">Link to <!>!</a><p><!></p></div></div></div>', (container)=>{
            const div__1 = container.firstChild;
            const h1__1 = div__1.firstChild;
            const p__1 = h1__1.nextSibling;
            const div__2 = p__1.nextSibling;
            const h3__1 = div__2.firstChild;
            const div__3 = h3__1.nextSibling;
            const anchor__1 = div__3.firstChild.nextSibling;
            viewmill.insert(viewmill.expr(()=>(a.getValue()), [
                a
            ]), div__3, anchor__1);
            const span__1 = anchor__1.nextSibling.nextSibling;
            const a__1 = span__1.nextSibling.nextSibling;
            const anchor__2 = a__1.firstChild.nextSibling;
            viewmill.insert(viewmill.expr(()=>(a.getValue()), [
                a
            ]), a__1, anchor__2);
            const p__2 = a__1.nextSibling;
            const anchor__3 = p__2.firstChild;
            viewmill.insert(viewmill.expr(()=>(a.getValue()), [
                a
            ]), p__2, anchor__3);
        })));
};
