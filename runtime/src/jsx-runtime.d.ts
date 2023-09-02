import { Insertable } from "./index";

declare namespace JSX {

    type Element = Insertable;

    interface IntrinsicElements {
        [elemName: string]: any;
    }

    interface ElementChildrenAttribute {
        children: {};
    }
}
