/**
 * @jest-environment jsdom
 */

const viewmill = require("./viewmill/index");

//
// listen
//

test("listen", () => {
    let i = 0;
    const btn = document.createElement("button");
    viewmill.listen(btn, "click", () => (i += 1));
    expect(i).toBe(0);
    btn.click();
    expect(i).toBe(1);
});

test("listen + signal", () => {
    const abortController = new AbortController();
    let i = 0;
    const btn = document.createElement("button");
    viewmill.listen(btn, "click", () => (i += 1), null, abortController.signal);
    expect(i).toBe(0);
    btn.click();
    expect(i).toBe(1);
    abortController.abort();
    btn.click();
    expect(i).toBe(1);
});

test("listen + deps", () => {
    const a = viewmill.param(0);
    let v;
    const btn = document.createElement("button");
    viewmill.listen(btn, "click", () => (v = a.getValue()), [a]);
    expect(v).toBeUndefined();
    btn.click();
    expect(v).toBe(0);
    a.setValue(11);
    btn.click();
    expect(v).toBe(11);
});

test("listen + deps + signal", () => {
    const abortController = new AbortController();
    const a = viewmill.param(0);
    let v;
    const btn = document.createElement("button");
    viewmill.listen(btn, "click", () => (v = a.getValue()), [a], abortController.signal);
    expect(v).toBeUndefined();
    btn.click();
    expect(v).toBe(0);
    a.setValue(11);
    btn.click();
    expect(v).toBe(11);
    abortController.abort();
    a.setValue(321);
    btn.click();
    expect(v).toBe(11);
});

//
// live
//

test("live", () => {
    const foo = viewmill.live(() => 1);
    expect(foo.getValue()).toBe(1);
    const a = viewmill.param(222);
    const bar = viewmill.live(() => a.getValue(), [a]);
    expect(bar.getValue()).toBe(222);
    a.setValue(333);
    expect(bar.getValue()).toBe(333);
});

test("live + signal", () => {
    const abortController = new AbortController();
    const a = viewmill.param(222);
    const foo = viewmill.live(() => a.getValue(), [a], null, abortController.signal);
    expect(foo.getValue()).toBe(222);
    a.setValue(333);
    expect(foo.getValue()).toBe(333);
    abortController.abort();
    a.setValue(444);
    expect(foo.getValue()).toBe(333);
});

test("live + destruct", () => {
    const a = viewmill.param(1001);
    const [foo] = viewmill.live(
        () => [a.getValue()],
        null,
        [1, ([a]) => [a]]
    );
    expect(foo.getValue()).toBe(1001);
    const b = viewmill.param(11);
    const c = viewmill.param(22);
    const [bar, baz] = viewmill.live(
        () => ({
            bar: b.getValue(),
            baz: c.getValue()
        }),
        [b, c],
        [2, ({ bar, baz }) => [bar, baz]]
    );
    expect(bar.getValue()).toBe(11);
    expect(baz.getValue()).toBe(22);
});

//
// param
//

test("param", () => {
    const out = [];
    const a = viewmill.param(1);
    expect(a.getValue()).toBe(1);
    a.listen((v) => out.push(v));
    expect(out.length).toBe(0);
    a.setValue(1);
    expect(out.length).toBe(0);
    a.setValue(2);
    let last = out[0];
    expect(last.newValue).toBe(2);
    expect(last.oldValue).toBe(1);
    expect(last.userData).toBeUndefined();
    a.setValue(3, 1024);
    last = out[1];
    expect(last.newValue).toBe(3);
    expect(last.oldValue).toBe(2);
    expect(last.userData).toBe(1024);
});

//
// insert
//

test("insert", () => {
    const target = document.createElement("div");

    expect(viewmill.insert(null, target, null)).toBeNull();
    expect(viewmill.insert(undefined, target, null)).toBeNull();

    let remove = viewmill.insert(0, target, null);
    let cursor = target.lastChild;
    expect(cursor.nodeType).toBe(Node.TEXT_NODE);
    expect(cursor.data).toBe("0");
    remove();
    expect(target.lastChild).toBeNull();

    remove = viewmill.insert("foobar", target, null);
    cursor = target.lastChild;
    expect(cursor.nodeType).toBe(Node.TEXT_NODE);
    expect(cursor.data).toBe("foobar");
    remove();
    expect(target.lastChild).toBeNull();

    remove = viewmill.insert(
        new viewmill.Insertion((target, anchor) => {
            const el = document.createElement("span");
            el.textContent = "insertion";
            target.insertBefore(el, anchor);
            return () => el.remove();
        }),
        target,
        null
    );
    cursor = target.lastChild;
    expect(cursor.nodeType).toBe(Node.ELEMENT_NODE);
    expect(cursor.tagName).toBe("SPAN");
    expect(cursor.textContent).toBe("insertion");
    remove();
    expect(target.lastChild).toBeNull();

    expect(viewmill.insert(document.createDocumentFragment(), target, null)).toBeNull();

    remove = viewmill.insert(
        (() => {
            const frag = document.createDocumentFragment();
            const p = document.createElement("p");
            p.textContent = "single child";
            frag.appendChild(p);
            return frag;
        })(),
        target,
        null
    );
    cursor = target.lastChild;
    expect(cursor.nodeType).toBe(Node.ELEMENT_NODE);
    expect(cursor.tagName).toBe("P");
    expect(cursor.textContent).toBe("single child");
    remove();
    expect(target.lastChild).toBeNull();

    remove = viewmill.insert(
        (() => {
            const tpl = document.createElement("template");
            tpl.innerHTML = "<br/><span>1</span>text&nbsp;";
            return tpl.content;
        })(),
        target,
        null
    );
    cursor = target.firstElementChild;
    expect(cursor.tagName).toBe("BR");
    cursor = cursor.nextSibling;
    expect(cursor.tagName).toBe("SPAN");
    cursor = cursor.nextSibling;
    expect(cursor.data).toBe("text\u{A0}");
    remove();
    expect(target.lastChild).toBeNull();

    remove = viewmill.insert(
        (() => {
            const p = document.createElement("p");
            p.textContent = "element";
            return p;
        })(),
        target,
        null
    );
    cursor = target.lastChild;
    expect(cursor.nodeType).toBe(Node.ELEMENT_NODE);
    expect(cursor.tagName).toBe("P");
    expect(cursor.textContent).toBe("element");
    remove();
    expect(target.lastChild).toBeNull();

    remove = viewmill.insert(
        document.createTextNode("text"),
        target,
        null
    );
    cursor = target.lastChild;
    expect(cursor.nodeType).toBe(Node.TEXT_NODE);
    expect(cursor.data).toBe("text");
    remove();
    expect(target.lastChild).toBeNull();

    remove = viewmill.insert(
        [
            "text",
            document.createElement("br"),
            null,
            viewmill.expr(() => 123)
        ],
        target,
        null
    );
    cursor = target.firstChild;
    expect(cursor.data).toBe("text");
    cursor = cursor.nextSibling;
    expect(cursor.tagName).toBe("BR");
    cursor = cursor.nextSibling;
    expect(cursor.data).toBe("123");
    remove();
    expect(target.lastChild).toBeNull();

    remove = viewmill.insert(
        new Map([[
            "a",
            new Set([
                {
                    *[Symbol.iterator]() {
                        yield [
                            document.createElement("h1")
                        ];
                    }
                }
            ])
        ]]).values(),
        target,
        null
    );
    cursor = target.firstChild;
    expect(cursor.tagName).toBe("H1");
    expect(cursor.nextSibling).toBeNull();
    remove();
    expect(target.lastChild).toBeNull();
});

//
// list
//

test("list", () => {
    const target = document.createElement("div");

    let remove = viewmill.insert(
        viewmill.list(() => ["text"]),
        target,
        null
    );
    let cursor = target.firstChild.nextSibling; // skipping a NodeSpan anchor
    expect(cursor.data).toBe("text");
    remove();
    expect(target.lastChild).toBeNull();

    const a = viewmill.param([1, 2, 3]);
    remove = viewmill.insert(
        viewmill.list(
            () => a.getValue().map((v) => {
                const el = document.createElement("p");
                el.textContent = v;
                return el;
            }),
            [a]
        ),
        target,
        null
    );
    cursor = target.firstElementChild;
    expect(cursor.tagName).toBe("P");
    expect(cursor.textContent).toBe("1");
    cursor = cursor.nextSibling;
    expect(cursor.tagName).toBe("P");
    expect(cursor.textContent).toBe("2");
    cursor = cursor.nextSibling;
    expect(cursor.tagName).toBe("P");
    expect(cursor.textContent).toBe("3");
    a.setValue([4, 5]);
    cursor = target.firstElementChild;
    expect(cursor.tagName).toBe("P");
    expect(cursor.textContent).toBe("4");
    cursor = cursor.nextSibling;
    expect(cursor.tagName).toBe("P");
    expect(cursor.textContent).toBe("5");
    remove();
    expect(target.lastChild).toBeNull();
});

//
// cond
//

test("cond", () => {
    const target = document.createElement("div");

    let remove = viewmill.insert(
        viewmill.cond(() => true, () => 1, () => 2),
        target,
        null
    );
    expect(target.firstChild.data).toBe("1");
    remove();
    expect(target.lastChild).toBeNull();

    const a = viewmill.param(false);
    remove = viewmill.insert(
        viewmill.cond(() => a.getValue(), () => 1, () => 2, [a]),
        target,
        null
    );
    expect(target.firstChild.data).toBe("2");
    a.setValue(true);
    expect(target.firstChild.data).toBe("1");
    remove();
    expect(target.lastChild).toBeNull();
});

//
// expr
//

test("expr", () => {
    const target = document.createElement("div");

    let remove = viewmill.insert(
        viewmill.expr(() => 1),
        target,
        null
    );
    expect(target.firstChild.data).toBe("1");
    remove();
    expect(target.lastChild).toBeNull();

    const a = viewmill.param(2);
    remove = viewmill.insert(
        viewmill.expr(() => a.getValue(), [a]),
        target,
        null
    );
    expect(target.firstChild.data).toBe("2");
    a.setValue(1);
    expect(target.firstChild.data).toBe("1");
    remove();
    expect(target.lastChild).toBeNull();
});

//
// attrs
//

test("attr + attrs", () => {
    const el = document.createElement("div");

    viewmill.attr(el, "foo", 1);
    expect(el.getAttribute("foo")).toBe("1");
    viewmill.attr(el, "foo", () => "bar");
    expect(el.getAttribute("foo")).toBe("bar");
    const foo = viewmill.param(1001);
    viewmill.attr(el, "foo", () => foo.getValue(), [foo]);
    expect(el.getAttribute("foo")).toBe("1001");
    foo.setValue(2002);
    expect(el.getAttribute("foo")).toBe("2002");

    viewmill.attrs(el, { foo: 1, bar: 2 });
    expect(el.getAttribute("foo")).toBe("1");
    expect(el.getAttribute("bar")).toBe("2");
    viewmill.attrs(el, () => ({ foo: 3, bar: 4 }));
    expect(el.getAttribute("foo")).toBe("3");
    expect(el.getAttribute("bar")).toBe("4");
    const bar = viewmill.param("initial text");
    viewmill.attrs(el, () => ({ bar: bar.getValue() }), [bar]);
    expect(el.getAttribute("foo")).toBe("3");
    expect(el.getAttribute("bar")).toBe("initial text");
    bar.setValue("updated text");
    expect(el.getAttribute("bar")).toBe("updated text");
});

//
// el
//

test("el", () => {
    const target = document.createElement("div");

    let remove = viewmill.insert(
        viewmill.el("<br /><p>text</p>"),
        target,
        null
    );
    let cursor = target.firstElementChild;
    expect(cursor.tagName).toBe("BR");
    cursor = cursor.nextSibling;
    expect(cursor.tagName).toBe("P");
    expect(cursor.textContent).toBe("text");
    remove();
    expect(target.lastChild).toBeNull();

    remove = viewmill.insert(
        viewmill.el("<div>Value: <!>!</div>", (container) => {
            const div = container.firstChild;
            const anchor = div.firstChild.nextSibling;
            viewmill.insert("123", div, anchor);
        }),
        target,
        null
    );
    cursor = target.firstElementChild;
    expect(cursor.tagName).toBe("DIV");
    expect(cursor.textContent).toBe("Value: 123!");
    remove();
    expect(target.lastChild).toBeNull();
});

//
// view
//

test("view", () => {
    const target = document.createElement("div");

    const view = viewmill.view({}, () => (
        viewmill.el(`
            <div foo="1">
                <div foo="2">
                    <div foo="3"></div>
                </div>
            </div>
        `)
    ));
    const {
        unmountSignal,
        querySelector,
        querySelectorAll,
        remove,
        unmount
    } = view.insert(target, null);

    expect(unmountSignal.aborted).toBe(false);
    expect(querySelector("[foo]").getAttribute("foo")).toBe("1");
    expect(querySelector("[foo=\"2\"]").getAttribute("foo")).toBe("2");
    expect(
        querySelectorAll("[foo]").map((el) => el.getAttribute("foo"))
    ).toEqual(["1", "2", "3"]);
    unmount();
    expect(unmountSignal.aborted).toBe(true);
    remove();
    expect(target.lastChild).toBeNull();
});

//
// cmp
//

test("cmp", () => {
    const target = document.createElement("div");

    const Foo = ({ bar }, { unmountSignal }) => (
        viewmill.el("<div>State: <!></div>", (container) => {
            const div = container.firstChild;
            viewmill.attr(div, "bar", () => bar.getValue(), [bar]);
            const anchor = div.firstChild.nextSibling;
            const txt = document.createTextNode("mounted");
            div.insertBefore(txt, anchor);
            viewmill.listen(unmountSignal, "abort", () => {
                txt.data = "unmounted!";
            });
        })
    );

    const bar = viewmill.param();
    const view = viewmill.view({ bar }, (_, unmountSignal) => (
        viewmill.cmp(Foo, { bar }, unmountSignal)
    ));
    const { remove, querySelector } = view.insert(target, null);

    const cursor = querySelector("[bar]");
    expect(cursor.getAttribute("bar")).toBe("undefined");
    expect(cursor.textContent).toBe("State: mounted");
    bar.setValue(12345);
    expect(cursor.getAttribute("bar")).toBe("12345");
    remove();
    expect(cursor.textContent).toBe("State: unmounted!");
    expect(target.lastChild).toBeNull();
});
