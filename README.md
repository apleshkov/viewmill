# viewmill

A tool to transform jsx/tsx files to reactive views in js/ts and then insert them into DOM, so no more need to write a lot of routine code to update DOM on some value change.

Written in Rust and based on [swc](https://swc.rs) (Speedy Web Compiler) to parse and emit code.

## Installation

```
npm i --save-dev viewmill
npm i viewmill-runtime
```

## Usage

`npx viewmill [OPTIONS] INPUT_PATH [OUTPUT_DIR]`

Use `npx viewmill --help` to see all the details.

## How it works

The tool parses a file and try to locate an `export default` function:
- `export default function (...) { ... }`
- `export default (...) => ...`

Every argument of the function is considered as a mutable *parameter* to listen for changes.

Any other code around will be untouched and move to an output file as is.

So let's write a simple file:
```jsx
export default (a) => <span>a = {a}!</span>;
```

The above code will be transformed to:
```js
import * as viewmill from "viewmill-runtime";

export default function (a) {
    return viewmill.view({
        a: viewmill.param(a) // the `a` param to update outside
    }, ({ a }, unmountSignal) => viewmill.el(
        "<span>a = <!>!</span>",
        (container) => {
            const span__1 = container.firstChild;
            const anchor__1 = span__1.firstChild.nextSibling;
            viewmill.insert(
            	// This `expr` creates a text node and updates it
            	// when the `a` param is updated.
                viewmill.expr(
                    () => (a.getValue()),
                    [a]
                ),
                span__1, // the container (<span>)
                anchor__1 // the node before the text node is inserted (<!>)
            );
        }
    ));
};
```

Then we can use it like:
```js
import MyView from "./path/to/file";

const view = new MyView(123); // init the above view with `a` equals to 123

view.insert(document.getElementById("app")); // insert it to DOM

view.model.a.setValue(321); // update the `a` value and the UI
```