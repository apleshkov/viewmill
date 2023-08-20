import * as viewmill from "viewmill-runtime";
export default function<T>(a: T) {
    return viewmill.view({
        a: viewmill.param(a)
    }, ({
        a
    }, unmountSignal)=>{
        return a.getValue();
    });
};
