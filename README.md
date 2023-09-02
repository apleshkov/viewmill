# viewmill

[Features](#features) | [Installation](#installation) | [Getting Started](#getting-started) | [Notes](#notes) | [Examples](#examples)

A tool to transform jsx/tsx files to reactive views in js/ts, so they could be easily [used](#web-components) in Web Components, inserted into DOM or integrated with other libraries and frameworks.

`viewmill` is aimed to create complex reactive UIs from a simple form of JSX (see [the examples](#examples) section).

You can think of the views in terms of [MVVM](https://en.wikipedia.org/wiki/Model–view–viewmodel): after being instantiated, they could be inserted into DOM via the `insert` method (the *view*) and their state could be modified by updatating parameters inside the `model` field (the *viewmodel*).

*Note*: the view cannot update its state from the inside.

The tool is written in Rust and based on [swc](https://swc.rs) (Speedy Web Compiler) to parse and emit code.

## Features

`viewmill` supports all the valid JSX syntax, including:

- **conditionals** via the ternary operator:
```tsx
    {loading
        ? <span>Loading...</span>
        : <strong>Loaded!</strong>}
```

- **conditionals** via the logical AND (`&&`) operator:
```tsx
    {loading && <span>Loading...</span>}
```
Under the hood `viewmill` considers it a short form of the ternary operator, when the third operand is `null`, e.g. `a && b` is actually `a ? b : null`.

- **loops** via the spread child syntax:
```tsx
    <>{...items}</>
    <ul>
        {...items.map((entry, idx) => (
            <li>{idx + 1}: {entry}</li>
        ))}
    </ul>
```

- [custom components](#custom-components)

There're no non-standard HTML attributes or other specific syntax, but it's worth to see the corresponding [notes](#html).

## Installation

```sh
npm i --save-dev viewmill && npm i viewmill-runtime
```

## Getting Started

To demonstrate how the tool works, its basic principles and how to use it, let's create a counter :)

First of all we create a directory for our project and call `npm init` there:

```sh
mkdir counter
cd counter
npm init
```

Then we install `viewmill` (as a *developer* dependency):
```sh
npm i --save-dev viewmill
```

... and its **runtime** (as a dependency to use in production):
```sh
npm i viewmill-runtime
```

Let's create an `src` directory and put our `counter.tsx` there:
```tsx
// src/counter.tsx

export default (count: number) => {
    return <>
        <h1>Counter</h1>
        <p>The current value is <strong>{count}</strong>!</p>
    </>;
}
```

Then transform it with `viewmill` by calling:
```sh
npx viewmill --suffix "-view" src
```

It'll create a file `src/counter-view.ts`:
```ts
// src/counter-view.ts

import * as viewmill from "viewmill-runtime";

export default function(count: number) {
    return viewmill.view({
        count: viewmill.param(count)
    }, ({ count }, unmountSignal) => {
        return [
            viewmill.el("<h1>Counter</h1>"),
            viewmill.el("<p>The current value is <strong><!></strong>!</p>", (container, unmountSignal1)=>{
                const p__1 = container.firstChild;
                const strong__1 = p__1.firstChild.nextSibling;
                const anchor__1 = strong__1.firstChild;
                viewmill.unmountOn(unmountSignal1, viewmill.insert(viewmill.expr(()=>(count.getValue()), [
                    count
                ]), strong__1, anchor__1));
            })
        ];
    });
};
```

Ok, so now we need to bundle our code and finally look at it. One could choose not to bundle and arrange everything manually, but here we're going to use [esbuild](https://esbuild.github.io):
```sh
npm i --save-dev esbuild
```

Then let's create two additional files: `src/index.html` and `src/index.ts`.

```html
<!-- src/index.html -->

<html>
<head>
    <title>Counter</title>
</head>
<body>
    <div id="app"></div>
    <script src="../dist/index.js"></script>
</body>
</html>
```

```ts
// src/index.ts

import Counter from "./counter-view";

// you can also use the `new` operator here, e.g. `new Counter(0)`
const view = Counter(0);

view.insert(document.getElementById("app"));
```

Run the bundler:
```sh
npx esbuild src/index.ts --bundle --outdir=dist --target=es6
```

So finally we can open `index.html` in a browser and it'll show the counter telling us "The current value is 0!".

Let's modify `src/index.ts` a bit:
```ts
// src/index.ts

import Counter from "./counter-view";

const view = Counter(0);
view.model.count.setValue(1);

view.insert(document.getElementById("app"));
```

We need to re-run the transformation and bundling commands, and then refresh the opened page. Now it says "The current value is 1!" and that's correct.

Now let's make things more dynamic and add a button to increment the counter:
```tsx
// src/counter.tsx

export default (count: number) => {
    return <>
        <h1>Counter</h1>
        <p>The current value is <strong>{count}</strong>!</p>
        <div>
            <button>Increment</button>
        </div>
    </>;
}
```

But how to handle the click?

Remember, we cannot mutate parameters from inside the view, so if we write smth like:
```jsx
<button onclick={() => (count += 1)}>Increment</button>
```

... it **won't work**, because the handler will be transformed to `() => (count.getValue() += 1)`, which is invalid and meaningless.

What's the correct way? So `viewmill` supports two basic patterns for that:
1. Provide it as a parameter
2. Query necessary node or nodes with a selector

### Event Handler via Parameter

```tsx
// src/counter.tsx

export default (count: number, onClick: (e: Event) => void) => {
    return <>
        <h1>Counter</h1>
        <p>The current value is <strong>{count}</strong>!</p>
        <div>
            <button onclick={onClick}>Increment</button>
        </div>
    </>;
}
```

```ts
// src/index.ts

import Counter from "./counter-view";

const view = Counter(0, () => {
    view.model.count.updateValue((c) => (c + 1));
});

view.insert(document.getElementById("app"));
```

### Query Selector & Event Listener

```tsx
// src/counter.tsx

export default (count: number) => {
    return <>
        <h1>Counter</h1>
        <p>The current value is <strong>{count}</strong>!</p>
        <div>
            <button>Increment</button>
        </div>
    </>;
}
```

```ts
// src/index.ts

import Counter from "./counter-view";

const view = Counter(0);

const { querySelector } = view.insert(document.getElementById("app"));

querySelector("button")?.addEventListener("click", () => {
    view.model.count.updateValue((c) => (c + 1));
});
```

The `querySelector` method uses the very standard [CSS selectors](https://developer.mozilla.org/en-US/docs/Learn/CSS/Building_blocks/Selectors).
There's the `querySelectorAll` method also.

### Removing & Unmounting

If at some point an inserted view should be removed, the `insert` method returns the necessary functionality:
```ts
const {
    // Every insertion is associated with a specific `AbortController`, 
    // which is aborted on `remove` or `unmount`, so this property is 
    // its `AbortSignal`
    unmountSignal,
    // Removes the inserted nodes from DOM and triggers the signal
    remove,
    // Unmounts the inserted nodes without the actual removing and triggers the signal.
    // Useful if there's no need to affect DOM.
    unmount
} = view.insert(...);
```

So if we need to remove the counter:
```ts
const { unmountSignal, remove } = view.insert(document.getElementById("app"));

unmountSignal.addEventListener("abort", () => console.log("Bye!"));

remove();
```

### Web Components

The `viewmill` views are intended to be a part of Web Components. So here's an axample of how to create one for the counter:
```ts
// src/my-counter.ts

import { InsertedView } from "viewmill-runtime";
import Counter from "./counter-view";

customElements.define("my-counter", class extends HTMLElement {

    private view = Counter(0);

    private insertedView?: InsertedView;

    private get counter() {
        return this.view.model.count;
    }

    connectedCallback() {
        if (this.isConnected) {
            const inserted = this.view.insert(this);
            const {
                unmountSignal: signal,
                querySelector
            } = inserted;
            querySelector("button")?.addEventListener("click", () => {
                this.counter.updateValue((c) => c + 1);
            }, { signal });
            //   ^^^^^^ Please, note how we use the signal here
            this.insertedView = inserted;
        }
    }

    disconnectedCallback() {
        // The element and all its children are being removed here,
        // so it's ok just to unmount the view to trigger the `unmountSignal`
        this.insertedView?.unmount();
        this.insertedView = null;
    }

    static get observedAttributes() {
        return ["value"];
    }

    attributeChangedCallback(name: string, _?: string, newValue?: string) {
        if (name === "value") {
            this.counter.setValue(+newValue);
        }
    }
});
```

Then we can modify the `index.ts` file:
```ts
// src/index.ts

export * from "./my-counter";
```

... and the `index.html` file:
```html
<!-- src/index.html -->

<html>
<head>
    <title>Counter</title>
</head>
<body>
    <script src="../dist/index.js"></script>
    <my-counter></my-counter>
    <my-counter value="123"></my-counter>
</body>
</html>
```

## Custom Components

Every custom component is just a function with the `props` argument, which returns an `Insertable`:
```ts
function <Props extends object>(props: Props): Insertable;
```

Children are available via the `children` property. The value can be an `Insertable`, an array of them or `undefined`.

Let's see how we can extend things with custom components by examples. Please, note how actively the `viewmill-runtime` library is used.

### If

This component helps us to code condtions with JSX.

```ts
// src/if.ts

import { Insertable, Insertion, Live, Unmounter, insert } from "viewmill-runtime";

// Show children when the `test` is truthy
export default (
    { test, children }: {
        test: unknown | Live<unknown>,
        children?: Insertable | Insertable[]
    }
): Insertable => {
    // `Live` is a non-static value
    if (test instanceof Live) {
        // This wrapper is for working with DOM
        return new Insertion((target, anchor) => {
            // An anchor to avoid jumping around when updating, cause
            // the content could be re-inserted at the wrong place
            const a = target.insertBefore(
                document.createComment("if"),
                anchor
            );
            // This controller helps to stop listening to the
            // `test` updates on unmount
            const abortController = new AbortController();
            // This is needed to remove the inserted `children`
            let un: Unmounter | null = null;
            // Introducing a handler here to not repeat ourselves
            const update = () => {
                if (test.getValue() && !un) {
                    un = insert(children, target, a);
                } else {
                    un?.(true);
                    un = null;
                }
            };
            // Listening to the `test` updates
            test.listen(update, abortController.signal);
            // Check the `test` value on a first insertion
            update();
            // The `Insertion` callback needs to return an unmounter
            // to clean up its things if necessary
            return (removing) => {
                abortController.abort();
                un?.(removing);
                if (removing) {
                    target.removeChild(a);
                }
            };
        });
    } else if (test) {
        // The `test` value is static, so let's just
        // return `children` if it's truthy
        return children;
    }
    // `Insertable` could be undefined, so no need to return anything here
};
```

Here's an example how to use it:
```tsx
import If from "./if";

export default (count: number) => {
    return <>
        <If test={count > 10}>
            The <code>count</code> is {count}, which is
            obviously greater then 10!
        </If>
        <If test={123}>
            <p>That's truthy!</p>
        </If>
    </>;
}
```

### For

Iterating over an array using a function, which is provided as a child.

```ts
// src/for.ts

import { Insertable, Insertion, Live, Unmounter, insert } from "viewmill-runtime";

export default <E extends Insertable>(
    { items, using }: {
        items: E[] | Live<E[]>,
        using: (item: E, index: number) => Insertable
    }
): Insertable => {
    if (items instanceof Live) {
        return new Insertion((target, anchor) => {
            // The content is being removed on every update here too,
            // so we need this anchor to stabilize the placement
            const a = target.insertBefore(
                document.createComment("for"),
                anchor
            );
            let unmounters: (Unmounter | null)[] = [];
            const unmount = (removing: boolean) => {
                unmounters.forEach((u) => u?.(removing));
                unmounters = [];
            };
            const update = () => {
                // Remove the previously inserted items if any
                unmount(true);
                // Insert the new ones
                unmounters = items.getValue()
                    .map(using)
                    .map((entry) => insert(entry, target, a));
            };
            const abortController = new AbortController();
            items.listen(update, abortController.signal);
            update();
            return (removing) => {
                abortController.abort();
                unmount(removing);
                if (removing) {
                    target.removeChild(a);
                }
            };
        });
    } else {
        // Just a static iterable
        return items.map(using);
    }
};
```

Both static and non-static usages:
```tsx
import For from "./for";

export default (items: string[]) => {
    return <>
        <ul>
            <For
                items={items}
                using={(s, idx) => <li>#{idx}: {s}</li>}
            />
        </ul>
        <For
            items={[1, 2, 3]}
            using={(n) => <><br />number: {n}</>}
        />
    </>;
}
```

### Extendable List & `userData`

It's possible to enrich a component behaviour, using `userData` while listening to a live param.

For instance let's create an extendable list, so it's possible to add items there without its full re-rendering:
```ts
// src/xlist.ts

import { Insertable, Insertion, Live, Unmounter, insert } from "viewmill-runtime";

export default function <E extends Insertable>(
    { items, using }: {
        items: E[] | Live<E[]>,
        using: (item: E, index: number) => Insertable
    }
): Insertable {
    if (items instanceof Live) {
        return new Insertion((target, anchor) => {
            // Let's use a container here to show how to unmount
            // its children
            const container = document.createElement("div");
            let unmounters: (Unmounter | null)[] = [];
            const unmount = (removing: boolean) => {
                unmounters.forEach((u) => u?.(removing));
                unmounters = [];
            };
            const insertItems = (items: E[]): (Unmounter | null)[] => (
                items
                    .map(using)
                    .map((entry) => insert(entry, container))
            );
            const update = (tail?: unknown) => {
                if (typeof tail === "number" && tail > 0) {
                    // Just insert the new items
                    unmounters.push(
                        ...insertItems(items.getValue().slice(-tail))
                    );
                } else {
                    // The defalt behaviour is to replace everything
                    unmount(true);
                    unmounters = insertItems(items.getValue());
                }
            };
            const abortController = new AbortController();
            // Handling `userData` on every change
            items.listen(({ userData }) => update(userData), abortController.signal);
            update();
            // Don't forget to insert the container
            target.insertBefore(container, anchor);
            return (removing) => {
                abortController.abort();
                // No need to remove the inserted items no matter what
                // the `removing` argument is, cause they're all children
                // of the container, ...
                unmount(false);
                if (removing) {
                    // ... which is being removed here
                    target.removeChild(container);
                }
            };
        });
    } else {
        return items.map(using);
    }
};
```

Numeric list view:
```tsx
// src/xnumlist.tsx

import ExList from "./xlist";

export default (items: number[], onClick: () => void) => (
    <>
        <ExList
            items={items}
            using={(n) => <><br />{n}</>}
        />
        <p>
            <button onclick={onClick}>Load next</button>
        </p>
    </>
);
```

The button adds new 3 items to the list on every click:
```ts
// src/index.ts

import ExNumList from "./xnumlist-view";

const xlist = ExNumList([1, 2, 3, 4], () => {
    const { items } = xlist.model;
    const n = 3;
    items.updateValue(
        (current) => {
            const lastItem = current[current.length - 1];
            // Generate next items
            const next = Array.from({ length: n }, (_, k) => lastItem + k + 1);
            return current.concat(next);
        },
        // Here goes the `userData` value, so the view'll insert
        // only the last `n` items of the updated value
        n
    )
});

xlist.insert(document.getElementById("app"));
```

### Fetching Data

A very simple component to fetch remote data:
```ts
// src/fetcher.ts

import { Insertable, Insertion } from "viewmill-runtime";

export default function ({ url }: { url: string }): Insertable {
    return new Insertion((target, anchor) => {
        const abortController = new AbortController();
        const info = document.createElement("div");
        info.textContent = "Loading...";
        fetch(url, { signal: abortController.signal })
            //       ^^^^^^ Stop fetching if aborted
            .then(() => info.textContent = "Loaded!")
            .catch((e) => info.textContent = `[ERROR] ${e}`);
        target.insertBefore(info, anchor);
        return (removing) => {
            // Aborting the controller on unmount
            abortController.abort();
            if (removing) {
                target.removeChild(info);
            }
        };
    });
}
```

Fetching one remote url and a local one:
```tsx
// src/fetching.tsx

import Fetcher from "./fetcher";

export default () => (
    <>
        <Fetcher url="https://github.com" />
        <Fetcher url="/" />
    </>
);
```

```ts
// src/index.ts

import Fetching from "./fetching-view";

const view = Fetching();

view.insert(document.getElementById("app"));
```

## Notes

### Typescript Configuration

```json
{
    "compilerOptions": {
        "jsx": "preserve",
        "jsxImportSource": "viewmill-runtime"
    }
}
```

The `jsxImportSource` option here fixes the `JSX element implicitly has type 'any' because no interface 'JSX.IntrinsicElements' exists. ts(7026)` error if [`noImplicitAny`](https://www.typescriptlang.org/tsconfig#noImplicitAny) or [`strict`](https://www.typescriptlang.org/tsconfig#strict) enabled.

### HTML

#### [Boolean Attribute](https://developer.mozilla.org/en-US/docs/Glossary/Boolean/HTML)

Let's consider a simple example:
```tsx
export default (flag: boolean) => (
    <input type="checkbox" checked={flag} />
);
```

As a result, the `checked` attribute is present if the `flag` value is `true`, and is absent otherwise.

It also works for the spread attributes syntax:
```tsx
export default (flag: boolean) => (
    <input type="checkbox" {...{ checked: flag }} />
);
```

Please, note if a value is `null` or `undefined` it's necessary to convert it explicitly:
```tsx
export default (flag?: boolean | null) => (
    <input type="checkbox" checked={!!flag} />
);
```

#### Remove Attribute

Just set its value to `false` as it's shown in the section [above](#boolean-attribute).

#### Toggle Attribute

There's no specific syntax for that, but you can introduce a custom function:
```ts
export function cls(v: Record<string, boolean | undefined | null>): string | false {
    const c = Object.keys(v).filter((k) => !!v[k]);
    return c.length > 0 ? c.join(" ") : false;
}
```

So it can be used like:
```tsx
import { cls } from "./utils";

export default (a?: boolean | null) => (
    <div class={cls({ enabled: a, disabled: !a })}>
        <code>{a}</code>
    </div>
);
```

## Examples

### [Table](https://github.com/apleshkov/viewmill/tree/main/examples/table/)

A table with sorting and paging. 

- The whole view is defined in just one file (see `src/table.tsx`)
- Written in Typescript
- Data from [Random User Generator](https://randomuser.me)
- CSS by [Bootstrap](https://getbootstrap.com)
- Bundled and served with [esbuild](https://esbuild.github.io)

![Demo](https://github.com/apleshkov/viewmill/blob/main/examples/table/demo.gif)

### [Form](https://github.com/apleshkov/viewmill/tree/main/examples/form/)

A form with dynamic fields and validation. 

- The whole view is defined in just one file (see `src/form.tsx`)
- Written in Typescript
- CSS by [Bootstrap](https://getbootstrap.com)
- Bundled and served with [esbuild](https://esbuild.github.io)

![Demo](https://github.com/apleshkov/viewmill/blob/main/examples/form/demo.gif)