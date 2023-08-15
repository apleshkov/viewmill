# viewmill

A tool to transform jsx/tsx files to reactive views in js/ts and then insert them into DOM, so no more need to write a lot of routine code to update DOM on some value change.

You can think of the views in terms of [MVVM](https://en.wikipedia.org/wiki/Model–view–viewmodel): after being instantiated, they could be inserted into DOM via the `insert` method (M**V**VM - the *view*) and their state could be modified by updatating parameters inside the `model` field (MV**VM** - the *viewmodel*).

*Note*: the view cannot update its state from the inside.

`viewmill` supports all the valid JSX syntax, including:
- conditionals via the ternary operator: `{loading ? <span>Loading...</span> : <strong>Loaded!</strong>}`
- loops via the spread child syntax:
    - `<>{...items}</>`
    - `<ul>{...items.filter(...).map((entry, idx) => <li>{idx + 1}: {entry}</li>)}</ul>`
- [custom components](#custom-components)

The tool is written in Rust and based on [swc](https://swc.rs) (Speedy Web Compiler) to parse and emit code.

## Counter

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
npx viewmill --suffix \"-view\" src
```

It'll create a file `src/counter-view.ts`:
```ts
// src/counter-view.ts

import * as viewmill from "viewmill-runtime";

export default function (count: number) {
    return viewmill.view(
        { count: viewmill.param(count) },
        ({ count }, unmountSignal: AbortSignal) => {
            return [
                viewmill.el("<h1>Counter</h1>"),
                viewmill.el("<p>The current value is <strong><!></strong>!</p>", (container) => {
                    const p__1 = container.firstChild;
                    const strong__1 = p__1.firstChild.nextSibling;
                    const anchor__1 = strong__1.firstChild;
                    viewmill.insert(viewmill.expr(() => (count.getValue()), [
                        count
                    ]), strong__1, anchor__1);
                })
            ];
        }
    );
};
```

Ok, so now we need to bundle our code and finally look at it. One could choose not to bundle and arrange everything manually, but here we're going to use [esbuild](https://esbuild.github.io) and create two additional files: `src/index.html` and `src/index.ts`.

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

So finally we can open `index.html` in a favourite browser and it'll show the counter telling us "The current value is 0!".

Let's modify `src/index.ts` a bit:
```ts
// src/index.ts

import Counter from "./counter-view";

const view = Counter(0);
view.model.count.setValue(1);

view.insert(document.getElementById("app"));
```

We need to re-run the transformation and bundling commands above, and then refresh the opened page. Now it says "The current value is 1!" and that's correct.

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

Please, note the HTML-standard notation to attach the event handler.

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
    // Removes the inserted nodes from DOM and aborts the controller
    remove,
    // Just aborts the controller. In case there's no need to affect DOM
    unmount
} = view.insert(...);
```

So if we need to remove the counter:
```ts
const { unmountSignal, remove } = view.insert(document.getElementById("app"));

unmountSignal.addEventListener("abort", () => console.log("Bye!"));

remove();
```

## Custom Components

`viewmill` uses the very classic approach to custom components. They're just functions with the `props` argument, which return an `Insertable`.
There's also an optional second argument with some additional context.

The signature looks like this:
```ts
function <Props extends object>(props, { unmountSignal: AbortSignal }): Insertable;
```

Children are available via the `children` property and it's *always* an array. Speaking of types it's an array of `Insertable`s.

Let's see how we can extend things with custom components by examples. Please, note how actively the `viewmill-runtime` library is used.

### If

This component helps us to code condtions with JSX.

```ts
// src/if.ts

import { Insertable, Insertion, Live, insert } from "viewmill-runtime";

// Show children when the `test` is truthy
export default (
    { test, children }: {
        test: unknown | Live<unknown>,
        children: Insertable[]
    }
): Insertable => {
    // `Live` is a non-static value
    if (test instanceof Live) {
        // This wrapper is for working with DOM
        return new Insertion((target, anchor) => {
            // This is needed to remove the inserted `children`
            let rm: (() => void) | null = null;
            // Introducing a handler here to not repeat ourselves
            const update = () => {
                if (test.getValue()) {
                    rm = insert(children, target, anchor);
                } else if (rm) {
                    rm();
                }
            };
            // Listening the `Live`
            test.listen(update);
            // Check the `test` value on a first insertion
            update();
            // The `Insertion` callback needs to return a remover
            // to clean up its things if necessary
            return () => rm?.();
        });
    } else if (test) {
        // The `test` value is static, so let's just
        // return `children` if it's truthy
        return children;
    }
    // `Insertable` could be undefined, so don't have to return
    // anything if `test` is falsy
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

import { Insertable, Insertion, Live, insert } from "viewmill-runtime";

export default <E extends Insertable>(
    { items, children: [using] }: {
        items: E[] | Live<E[]>,
        children: [(item: E, index: number) => Insertable]
    }
): Insertable => {
    if (items instanceof Live) {
        return new Insertion((target, anchor) => {
            // Let's introduce a container to simplify the implementation
            // for the sake of demonstration
            const container = document.createElement("div");
            const update = () => {
                container.replaceChildren();
                items.getValue()
                    .map(using)
                    .forEach((entry) => insert(entry, container));
            };
            items.listen(update);
            update();
            target.insertBefore(container, anchor);
            return () => container.remove();
        });
    } else {
        // just a static iterable
        return items.map(using);
    }
};
```

Both static and non-static usages:
```tsx
import For from "./for";

export default (items: string[]) => {
    return <>
        <For items={items}>
            {(s, idx) => <p>#{idx}: {s}</p>}
        </For>
        <For items={[1, 2, 3]}>
            {(n) => <><br />number: {n}</>}
        </For>
    </>;
}
```