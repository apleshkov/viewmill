import * as viewmill from "../src/index";

const cases = [
    //
    // listen
    //

    () => {
        let i = 0;
        const btn = document.createElement("button");
        viewmill.listen(btn, "click", () => (i += 1));
        assertEq(i, 0);
        btn.click();
        assertEq(i, 1);
    },

    () => {
        const abortController = new AbortController();
        let i = 0;
        const btn = document.createElement("button");
        viewmill.listen(btn, "click", () => (i += 1), null, abortController.signal);
        assertEq(i, 0);
        btn.click();
        assertEq(i, 1);
        abortController.abort();
        btn.click();
        assertEq(i, 1);
    },

    () => {
        const a = viewmill.param(0);
        let v: number | undefined;
        const btn = document.createElement("button");
        viewmill.listen(btn, "click", () => (v = a.getValue()), [a]);
        assertEq(v, undefined);
        btn.click();
        assertEq(v, 0);
        a.setValue(11);
        btn.click();
        assertEq(v, 11);
    },

    () => {
        const abortController = new AbortController();
        const a = viewmill.param(0);
        let v: number | undefined;
        const btn = document.createElement("button");
        viewmill.listen(btn, "click", () => (v = a.getValue()), [a], abortController.signal);
        assertEq(v, undefined);
        btn.click();
        assertEq(v, 0);
        a.setValue(11);
        btn.click();
        assertEq(v, 11);
        abortController.abort();
        a.setValue(321);
        btn.click();
        assertEq(v, 11);
    },

    //
    // live
    //

    () => {
        const foo = viewmill.live(() => 1);
        assertEq(foo.getValue(), 1);
        const a = viewmill.param(222);
        const bar = viewmill.live(() => a.getValue(), [a]);
        assertEq(bar.getValue(), 222);
        a.setValue(333);
        assertEq(bar.getValue(), 333);
    },

    () => {
        const abortController = new AbortController();
        const a = viewmill.param(222);
        const foo = viewmill.live(() => a.getValue(), [a], null, abortController.signal);
        assertEq(foo.getValue(), 222);
        a.setValue(333);
        assertEq(foo.getValue(), 333);
        abortController.abort();
        a.setValue(444);
        assertEq(foo.getValue(), 333);
    },

    () => {
        const a = viewmill.param(1001);
        const [foo] = viewmill.live(
            () => [a.getValue()],
            null,
            [1, ([a]) => [a]]
        );
        assertEq(foo.getValue(), 1001);
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
        assertEq(bar.getValue(), 11);
        assertEq(baz.getValue(), 22);
    },

    //
    // param
    //

    () => {
        const out: viewmill.ChangeEventValue<number>[] = [];
        const a = viewmill.param(1);
        assertEq(a.getValue(), 1);
        a.listen((v) => out.push(v));
        assertEq(out.length, 0);
        a.setValue(1);
        assertEq(out.length, 0);
        a.setValue(2);
        let last = out[0];
        assertEq(last.newValue, 2);
        assertEq(last.oldValue, 1);
        assertEq(last.userData, undefined);
        a.setValue(3, 1024);
        last = out[1];
        assertEq(last.newValue, 3);
        assertEq(last.oldValue, 2);
        assertEq(last.userData, 1024);
    },

    //
    // insert
    //

    () => {
        const target = document.createElement("div");
        assertEq(viewmill.insert(null, target), null);
        assertEq(viewmill.insert(undefined, target), null);
    },

    () => {
        const target = document.createElement("div");
        const unmount = viewmill.insert(0, target)!;
        const cursor = target.lastChild!;
        assertEq(cursor.nodeType, Node.TEXT_NODE);
        assertEq(cursor.textContent, "0");
        unmount(true);
        assertEq(target.lastChild, null);
    },

    () => {
        const target = document.createElement("div");
        const unmount = viewmill.insert("foobar", target)!;
        const cursor = target.lastChild!;
        assertEq(cursor.nodeType, Node.TEXT_NODE);
        assertEq(cursor.textContent, "foobar");
        unmount(true);
        assertEq(target.lastChild, null);
    },

    () => {
        const target = document.createElement("div");
        const unmount = viewmill.insert(
            new viewmill.Insertion((target, anchor) => {
                const el = document.createElement("span");
                el.textContent = "insertion";
                target.insertBefore(el, anchor);
                return (removing) => {
                    if (removing) {
                        el.remove();
                    }
                };
            }),
            target,
            null
        )!;
        const cursor = target.lastChild as Element;
        assertEq(cursor.nodeType, Node.ELEMENT_NODE);
        assertEq(cursor.tagName, "SPAN");
        assertEq(cursor.textContent, "insertion");
        unmount(true);
        assertEq(target.lastChild, null);
    },

    () => {
        const target = document.createElement("div");
        assertEq(viewmill.insert(document.createDocumentFragment(), target, null), null);
    },

    () => {
        const target = document.createElement("div");
        const unmount = viewmill.insert(
            (() => {
                const frag = document.createDocumentFragment();
                const p = document.createElement("p");
                p.textContent = "single child";
                frag.appendChild(p);
                return frag;
            })(),
            target,
            null
        )!;
        const cursor = target.lastChild as Element;
        assertEq(cursor.nodeType, Node.ELEMENT_NODE);
        assertEq(cursor.tagName, "P");
        assertEq(cursor.textContent, "single child");
        unmount(true);
        assertEq(target.lastChild, null);
    },

    () => {
        const target = document.createElement("div");
        const unmount = viewmill.insert(
            (() => {
                const tpl = document.createElement("template");
                tpl.innerHTML = "<br/><span>1</span>text&nbsp;";
                return tpl.content;
            })(),
            target,
            null
        )!;
        const first = target.firstElementChild!;
        assertEq(first.tagName, "BR");
        const second = first.nextSibling as Element;
        assertEq(second.tagName, "SPAN");
        const third = second.nextSibling!;
        assertEq(third.textContent, "text\u{A0}");
        unmount(true);
        assertEq(target.lastChild, null);
    },

    () => {
        const target = document.createElement("div");
        const unmount = viewmill.insert(
            (() => {
                const p = document.createElement("p");
                p.textContent = "element";
                return p;
            })(),
            target,
            null
        )!;
        const cursor = target.lastChild as Element;
        assertEq(cursor.nodeType, Node.ELEMENT_NODE);
        assertEq(cursor.tagName, "P");
        assertEq(cursor.textContent, "element");
        unmount(true);
        assertEq(target.lastChild, null);
    },

    () => {
        const target = document.createElement("div");
        const unmount = viewmill.insert(
            document.createTextNode("text"),
            target,
            null
        )!;
        const cursor = target.lastChild as Element;
        assertEq(cursor.nodeType, Node.TEXT_NODE);
        assertEq(cursor.textContent, "text");
        unmount(true);
        assertEq(target.lastChild, null);
    },

    () => {
        const target = document.createElement("div");
        const unmount = viewmill.insert(
            [
                "text",
                document.createElement("br"),
                null,
                viewmill.expr(() => 123)
            ],
            target,
            null
        )!;
        assertEq(
            noComments(target.innerHTML),
            "text<br>123"
        );
        unmount(true);
        assertEq(target.lastChild, null);
    },

    () => {
        const target = document.createElement("div");
        const unmount = viewmill.insert(
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
        )!;
        const cursor = target.firstChild as Element;
        assertEq(cursor.tagName, "H1");
        assertEq(cursor.nextSibling, null);
        unmount(true);
        assertEq(target.lastChild, null);
    },

    //
    // list
    //

    () => {
        const target = document.createElement("div");

        let unmount = viewmill.insert(
            viewmill.list(() => ["text"]),
            target,
            null
        )!;
        assertEq(noComments(target.innerHTML), "text");
        unmount(true);
        assertEq(target.lastChild, null);

        const a = viewmill.param([1, 2, 3]);
        unmount = viewmill.insert(
            viewmill.list(
                () => a.getValue().map((v) => {
                    const el = document.createElement("p");
                    el.textContent = String(v);
                    return el;
                }),
                [a]
            ),
            target,
            null
        )!;
        assertEq(noComments(target.innerHTML), "<p>1</p><p>2</p><p>3</p>");
        a.setValue([4, 5]);
        assertEq(noComments(target.innerHTML), "<p>4</p><p>5</p>");
        unmount(true);
        assertEq(target.lastChild, null);
    },

    //
    // cond
    //

    () => {
        const target = document.createElement("div");

        let unmount = viewmill.insert(
            viewmill.cond(() => true, () => 1, () => 2),
            target,
            null
        )!;
        assertEq(target.firstChild?.textContent, "1");
        unmount(true);
        assertEq(target.lastChild, null);

        const a = viewmill.param(false);
        unmount = viewmill.insert(
            viewmill.cond(() => a.getValue(), () => 1, () => 2, [a]),
            target
        )!;
        assertEq(target.firstChild?.textContent, "2");
        a.setValue(true);
        assertEq(target.firstChild?.textContent, "1");
        unmount(true);
        assertEq(target.lastChild, null);

        viewmill.insert(
            viewmill.cond(() => a.getValue(), () => 1, () => 2, [a]),
            target
        );
        target.appendChild(document.createTextNode("text"));
        assertEq(target.firstChild?.textContent, "1");
        a.setValue(false);
        assertEq(target.firstChild?.textContent, "2");
        a.setValue(true);
        assertEq(target.firstChild?.textContent, "1");
        assertEq(target.lastChild?.textContent, "text");
    },

    //
    // expr
    //

    () => {
        const target = document.createElement("div");

        let unmount = viewmill.insert(
            viewmill.expr(() => 1),
            target,
            null
        )!;
        assertEq(target.firstChild?.textContent, "1");
        unmount(true);
        assertEq(target.lastChild, null);

        const a = viewmill.param(2);
        unmount = viewmill.insert(
            viewmill.expr(() => a.getValue(), [a]),
            target
        )!;
        assertEq(target.firstChild?.textContent, "2");
        a.setValue(1);
        assertEq(target.firstChild?.textContent, "1");
        unmount(true);
        assertEq(target.lastChild, null);

        viewmill.insert(
            viewmill.expr(() => a.getValue(), [a]),
            target
        );
        target.appendChild(document.createTextNode("text"));
        assertEq(target.firstChild?.textContent, "1");
        a.setValue(2);
        assertEq(target.firstChild?.textContent, "2");
        a.setValue(1);
        assertEq(target.firstChild?.textContent, "1");
        assertEq(target.lastChild?.textContent, "text");
    },

    //
    // attrs
    //

    () => {
        const el = document.createElement("div");

        viewmill.attr(el, "foo", "1");
        assertEq(el.getAttribute("foo"), "1");
        viewmill.attr(el, "foo", () => "bar");
        assertEq(el.getAttribute("foo"), "bar");
        const foo = viewmill.param("1001");
        viewmill.attr(el, "foo", () => foo.getValue(), [foo]);
        assertEq(el.getAttribute("foo"), "1001");
        foo.setValue("2002");
        assertEq(el.getAttribute("foo"), "2002");

        viewmill.attrs(el, { foo: "1", bar: "2" });
        assertEq(el.getAttribute("foo"), "1");
        assertEq(el.getAttribute("bar"), "2");
        viewmill.attrs(el, () => ({ foo: "3", bar: "4" }));
        assertEq(el.getAttribute("foo"), "3");
        assertEq(el.getAttribute("bar"), "4");
        const bar = viewmill.param("initial text");
        viewmill.attrs(el, () => ({ bar: bar.getValue() }), [bar]);
        assertEq(el.getAttribute("foo"), "3");
        assertEq(el.getAttribute("bar"), "initial text");
        bar.setValue("updated text");
        assertEq(el.getAttribute("bar"), "updated text");
    },

    //
    // el
    //

    () => {
        const target = document.createElement("div");

        let unmount = viewmill.insert(
            viewmill.el("<br /><p>text</p>"),
            target,
            null
        )!;
        let cursor = target.firstElementChild as Element;
        assertEq(cursor.tagName, "BR");
        cursor = cursor.nextSibling as Element;
        assertEq(cursor.tagName, "P");
        assertEq(cursor.textContent, "text");
        unmount(true);
        assertEq(target.lastChild, null);

        unmount = viewmill.insert(
            viewmill.el("<div>Value: <!>!</div>", (container) => {
                const div = container.firstChild!;
                const anchor = div.firstChild?.nextSibling;
                viewmill.insert("123", div, anchor);
            }),
            target,
            null
        )!;
        cursor = target.firstElementChild as Element;
        assertEq(cursor.tagName, "DIV");
        assertEq(cursor.textContent, "Value: 123!");
        unmount(true);
        assertEq(target.lastChild, null);
    },

    //
    // view
    //

    () => {
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

        assertEq(unmountSignal.aborted, false);
        assertEq(querySelector("[foo]")?.getAttribute("foo"), "1");
        assertEq(querySelector("[foo=\"2\"]")?.getAttribute("foo"), "2");
        assertArrayEq(
            querySelectorAll("[foo]")?.map((el) => el.getAttribute("foo")),
            ["1", "2", "3"]
        );
        unmount();
        assertEq(unmountSignal.aborted, true);
        remove();
        assertEq(target.lastChild, null);
    },

    //
    // cmp
    //

    () => {
        const target = document.createElement("div");

        const Foo = ({ bar }) => {
            return new viewmill.Insertion(
                (target, anchor) => {
                    const abortController = new AbortController();
                    const un = viewmill.insert(
                        viewmill.el("<div>State: <!></div>", (container) => {
                            const div = container.firstChild as Element;
                            viewmill.attr(div, "bar", () => bar.getValue(), [bar]);
                            const anchor = div.firstChild!.nextSibling;
                            const txt = document.createTextNode("mounted");
                            div.insertBefore(txt, anchor);
                            viewmill.listen(abortController.signal, "abort", () => {
                                txt.textContent = "unmounted!";
                            });
                        }),
                        target,
                        anchor
                    );
                    return (removing) => {
                        abortController.abort();
                        un?.(removing);
                    };
                }
            )
        };

        const bar = viewmill.param<number | undefined>(undefined);
        const view = viewmill.view({ bar }, (_) => (
            viewmill.cmp(Foo, { bar })
        ));
        const { remove, querySelector } = view.insert(target, null);

        const cursor = querySelector("[bar]")!;
        assertEq(cursor.getAttribute("bar"), "undefined");
        assertEq(cursor.textContent, "State: mounted");
        bar.setValue(12345);
        assertEq(cursor.getAttribute("bar"), "12345");
        remove();
        assertEq(cursor.textContent, "State: unmounted!");
        assertEq(target.lastChild, null);
    },

    () => {
        let controller = new AbortController();
        let notUnmounted = true;
        viewmill.unmountOn(
            controller.signal,
            (removing) => (notUnmounted = removing)
        );
        assertEq(notUnmounted, true);
        controller.abort();
        assertEq(notUnmounted, false);

        controller = new AbortController();
        controller.abort();
        notUnmounted = true;
        viewmill.unmountOn(
            controller.signal,
            (removing) => (notUnmounted = removing)
        );
        assertEq(notUnmounted, false);
    },

    () => {
        const controller = new AbortController();
        let notUnmounted = true;
        viewmill.unmountOn(
            controller.signal,
            viewmill.insert(
                viewmill.list(() => [
                    new viewmill.Insertion(
                        () => (removing) => (notUnmounted = removing)
                    )
                ]),
                document.createElement("div")
            )
        );
        assertEq(notUnmounted, true);
        controller.abort();
        assertEq(notUnmounted, false);
    },

    () => {
        const controller = new AbortController();
        let notUnmounted = true;
        viewmill.unmountOn(
            controller.signal,
            viewmill.insert(
                viewmill.cond(
                    () => true,
                    () => (
                        new viewmill.Insertion(
                            () => (removing) => (notUnmounted = removing)
                        )
                    ),
                    () => null
                ),
                document.createElement("div")
            )
        );
        assertEq(notUnmounted, true);
        controller.abort();
        assertEq(notUnmounted, false);
    },

    () => {
        const controller = new AbortController();
        let notUnmounted = true;
        viewmill.unmountOn(
            controller.signal,
            viewmill.insert(
                viewmill.expr(
                    () => (
                        new viewmill.Insertion(
                            () => (removing) => (notUnmounted = removing)
                        )
                    )
                ),
                document.createElement("div")
            )
        );
        assertEq(notUnmounted, true);
        controller.abort();
        assertEq(notUnmounted, false);
    },

    () => {
        const controller = new AbortController();
        let notUnmounted = true;
        viewmill.unmountOn(
            controller.signal,
            viewmill.insert(
                viewmill.el("", (container, signal) => {
                    viewmill.unmountOn(
                        signal,
                        viewmill.insert(
                            new viewmill.Insertion(
                                () => (removing) => (notUnmounted = removing)
                            ),
                            container
                        )
                    );
                }),
                document.createElement("div")
            )
        );
        assertEq(notUnmounted, true);
        controller.abort();
        assertEq(notUnmounted, false);
    },

    () => {
        const controller = new AbortController();
        let notUnmounted = true;
        viewmill.unmountOn(
            controller.signal,
            viewmill.insert(
                viewmill.cmp(
                    () => (
                        new viewmill.Insertion(
                            () => (removing) => (notUnmounted = removing)
                        )
                    ),
                    {}
                ),
                document.createElement("div")
            )
        );
        assertEq(notUnmounted, true);
        controller.abort();
        assertEq(notUnmounted, false);
    },

    () => {
        function test(v: number) {
            return v % 2 === 0;
        }

        const target = document.createElement("div");
        const a = viewmill.param(0);
        const check = viewmill.live(() => test(a.getValue()), [a]);
        const list = viewmill.live(() => [a.getValue()], [a]);
        viewmill.insert(
            viewmill.cond(
                () => check.getValue(),
                () => viewmill.el("<ul><!></ul>", (c, sig) => {
                    assert(c.firstChild?.firstChild !== null);
                    viewmill.unmountOn(sig, viewmill.insert(
                        viewmill.list(
                            () => list.getValue().map((entry) => (
                                viewmill.el("<li><!></li>", (c, sig) => {
                                    assert(c.firstChild?.firstChild !== null);
                                    viewmill.unmountOn(sig, viewmill.insert(
                                        entry,
                                        c.firstChild!,
                                        c.firstChild!.firstChild
                                    ));
                                })
                            )),
                            [a]
                        ),
                        c.firstChild!,
                        c.firstChild!.firstChild
                    ));
                }),
                () => viewmill.expr(
                    () => viewmill.el("<span><!></span>", (c, sig) => {
                        assert(c.firstChild?.firstChild !== null);
                        viewmill.unmountOn(sig, viewmill.insert(
                            viewmill.expr(() => a.getValue(), [a]),
                            c.firstChild!,
                            c.firstChild!.firstChild
                        ));
                    }),
                    [a]
                ),
                [a]
            ),
            target
        );
        assertEq(noComments(target.innerHTML), "<ul><li>0</li></ul>");
        for (let i = a.getValue()! + 1; i < 100; i += 1) {
            a.setValue(i);
            if (test(i)) {
                assertEq(noComments(target.innerHTML), `<ul><li>${i}</li></ul>`);
            } else {
                assertEq(noComments(target.innerHTML), `<span>${i}</span>`);
            }
        }
    },

    () => {
        function Foo({ items, using }) {
            return new viewmill.Insertion((target, anchor) => {
                const a = target.insertBefore(
                    document.createComment("for"),
                    anchor
                );
                let unmounters: (viewmill.Unmounter | null)[] = [];
                const unmount = (removing) => {
                    unmounters.forEach((u) => u?.(removing));
                    unmounters = [];
                };
                const update = () => {
                    unmount(true);
                    unmounters = items.getValue()
                        .map(using)
                        .map((entry) => viewmill.insert(entry, target, a));
                };
                items.listen(update);
                update();
                return (removing) => {
                    unmount(removing);
                    if (removing) {
                        target.removeChild(a);
                    }
                };
            });
        }

        function test(v: number) {
            return v > 5 && v < 10;
        }

        const target = document.createElement("div");
        const a = viewmill.param(0);
        const check = viewmill.live(() => test(a.getValue()), [a]);
        viewmill.insert(
            viewmill.cond(
                () => check.getValue(),
                () => viewmill.cmp(Foo, {
                    items: viewmill.live(
                        () => [a.getValue()],
                        [a]
                    ),
                    using: (s, idx) => viewmill.el("<p>#<!>: <!></p>", (container, unmountSignal) => {
                        const p__1 = container.firstChild!;
                        const anchor__1 = p__1.firstChild!.nextSibling;
                        viewmill.unmountOn(unmountSignal, viewmill.insert(idx, p__1, anchor__1));
                        const anchor__2 = anchor__1!.nextSibling!.nextSibling;
                        viewmill.unmountOn(unmountSignal, viewmill.insert(s, p__1, anchor__2));
                    })
                }),
                () => null,
                [a]
            ),
            target
        );
        assertEq(noComments(target.innerHTML), "");
        for (let i = a.getValue() + 1; i < 15; i += 1) {
            a.setValue(i);
            if (test(i)) {
                assertEq(noComments(target.innerHTML), `<p>#0: ${i}</p>`);
            } else {
                assertEq(noComments(target.innerHTML), "");
            }
        }
    },

    () => {
        let unmounted = false;
        const Foo = () => (
            new viewmill.Insertion(() => () => unmounted = true)
        );
        const { unmount } = viewmill.view({}, () => (
            viewmill.cond(
                () => true,
                () => viewmill.el("<ul><!></ul>", (container, unmountSignal) => {
                    viewmill.unmountOn(
                        unmountSignal,
                        viewmill.insert(
                            viewmill.list(
                                () => [1].map(
                                    () => (
                                        viewmill.el("<li><!></li>", (container, unmountSignal) => {
                                            viewmill.unmountOn(
                                                unmountSignal,
                                                viewmill.insert(
                                                    viewmill.expr(
                                                        () => viewmill.cmp(Foo, {})
                                                    ),
                                                    container.firstChild!,
                                                    container.firstChild!.firstChild
                                                )
                                            )
                                        })
                                    )
                                )
                            ),
                            container.firstChild!,
                            container.firstChild!.firstChild
                        )
                    );
                }),
                () => null
            )
        )).insert(
            document.createElement("div")
        );
        assertEq(unmounted, false);
        unmount();
        assertEq(unmounted, true);
    }
];

const output = document.getElementById("app")!;
output.innerHTML = `<p>Running ${cases.length} tests...</p>`;

window.onerror = () => {
    output.innerHTML += `<h1>Failed!</h1>`;
};

cases.forEach((c) => c());
output.innerHTML += `<h1>Done</h1><p>It's ok if nothing failed</p>`;

function noComments(s: string) {
    return s.replace(/(<!--[^-]*-->)/g, "");
}

function assert(expr: unknown, msg?: string) {
    if (!expr) {
        throw new Error(msg ?? "The expression isn't truthy");
    }
}

function assertEq(a: unknown, b: unknown) {
    assert(a === b, `${a} !== ${b}`);
}

function assertArrayEq(a: unknown[], b: unknown[]) {
    assertEq(a.length, b.length);
    for (let i = 0; i < a.length; i += 1) {
        assertEq(a[i], b[i]);
    }
}
