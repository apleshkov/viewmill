import * as viewmill from "viewmill-runtime";
export default function() {
    return viewmill.view({}, ({}, unmountSignal)=>(viewmill.el("<div>Some content<p>1 + 2 = 3</p></div>")));
};
