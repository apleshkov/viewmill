import * as viewmill from "viewmill-runtime";
export default function<T, U extends Array<T>>(a: T, b: U) {
    return viewmill.view({
        a: viewmill.param(a),
        b: viewmill.param(b)
    }, ({
        a,
        b
    }, unmountSignal)=>{
        return viewmill.el("<span><!>, <!></span>", (container, unmountSignal1)=>{
            const span__1 = container.firstChild;
            const anchor__1 = span__1.firstChild;
            viewmill.unmountOn(unmountSignal1, viewmill.insert(viewmill.expr(()=>(a.getValue()), [
                a
            ]), span__1, anchor__1));
            const anchor__2 = anchor__1.nextSibling.nextSibling;
            viewmill.unmountOn(unmountSignal1, viewmill.insert(viewmill.expr(()=>(b.getValue().length), [
                b
            ]), span__1, anchor__2));
        });
    });
}
;
