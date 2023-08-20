import * as viewmill from "viewmill-runtime";
function outside(a) {
    return a * 3;
}
export default function(a, b) {
    return viewmill.view({
        a: viewmill.param(a),
        b: viewmill.param(b)
    }, ({
        a,
        b
    }, unmountSignal)=>{
        const c = viewmill.live(()=>(a.getValue() + b.getValue()), [
            a,
            b
        ], null, unmountSignal);
        return viewmill.el("<div><h1>Conditions</h1><p><!></p><!><h1>Exprs</h1><!><p><!></p><h1>Lists</h1><!><!><ul><!></ul><h1>Other</h1><!></div>", (container, unmountSignal1)=>{
            const div__1 = container.firstChild;
            const h1__1 = div__1.firstChild;
            const p__1 = h1__1.nextSibling;
            const anchor__1 = p__1.firstChild;
            viewmill.unmountOn(unmountSignal1, viewmill.insert(viewmill.cond(()=>(a.getValue()), ()=>(`a = ${a.getValue()}`), ()=>(""), [
                a
            ]), p__1, anchor__1));
            const anchor__2 = p__1.nextSibling;
            viewmill.unmountOn(unmountSignal1, viewmill.insert(viewmill.cond(()=>(c.getValue()), ()=>(viewmill.el("<p>c = <!></p>", (container1, unmountSignal2)=>{
                    const p__2 = container1.firstChild;
                    const anchor__2 = p__2.firstChild.nextSibling;
                    viewmill.unmountOn(unmountSignal2, viewmill.insert(viewmill.expr(()=>(c.getValue()), [
                        c
                    ]), p__2, anchor__2));
                })), ()=>(null), [
                c
            ]), div__1, anchor__2));
            const h1__2 = anchor__2.nextSibling;
            const anchor__3 = h1__2.nextSibling;
            viewmill.unmountOn(unmountSignal1, viewmill.insert(viewmill.expr(()=>(outside(a.getValue())), [
                a
            ]), div__1, anchor__3));
            const p__2 = anchor__3.nextSibling;
            const anchor__4 = p__2.firstChild;
            viewmill.unmountOn(unmountSignal1, viewmill.insert(viewmill.expr(()=>(a.getValue() + b.getValue() + c.getValue()), [
                a,
                b,
                c
            ]), p__2, anchor__4));
            const h1__3 = p__2.nextSibling;
            const anchor__5 = h1__3.nextSibling;
            viewmill.unmountOn(unmountSignal1, viewmill.insert(viewmill.list(()=>([
                    a.getValue()
                ]), [
                a
            ]), div__1, anchor__5));
            const anchor__6 = anchor__5.nextSibling;
            viewmill.unmountOn(unmountSignal1, viewmill.insert(viewmill.list(()=>([
                    c.getValue()
                ].map((v, i)=>[
                        "[",
                        i,
                        "] => ",
                        v,
                        viewmill.el("<br/>")
                    ])), [
                c
            ]), div__1, anchor__6));
            const ul__1 = anchor__6.nextSibling;
            const anchor__7 = ul__1.firstChild;
            viewmill.unmountOn(unmountSignal1, viewmill.insert(viewmill.list(()=>([
                    c.getValue(),
                    b.getValue(),
                    a.getValue()
                ].map((v, i)=>viewmill.el("<li><!>: <!></li>", (container1, unmountSignal2)=>{
                        const li__1 = container1.firstChild;
                        const anchor__7 = li__1.firstChild;
                        viewmill.unmountOn(unmountSignal2, viewmill.insert(i, li__1, anchor__7));
                        const anchor__8 = anchor__7.nextSibling.nextSibling;
                        viewmill.unmountOn(unmountSignal2, viewmill.insert(v, li__1, anchor__8));
                    }))), [
                c,
                b,
                a
            ]), ul__1, anchor__7));
            const h1__4 = ul__1.nextSibling;
            const anchor__8 = h1__4.nextSibling;
            viewmill.unmountOn(unmountSignal1, viewmill.insert([
                viewmill.el("<p><!></p>", (container1, unmountSignal2)=>{
                    const p__3 = container1.firstChild;
                    const anchor__8 = p__3.firstChild;
                    viewmill.unmountOn(unmountSignal2, viewmill.insert(viewmill.expr(()=>(a.getValue()), [
                        a
                    ]), p__3, anchor__8));
                })
            ], div__1, anchor__8));
        });
    });
};
