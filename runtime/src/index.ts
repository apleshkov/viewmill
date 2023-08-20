export function listen(
    target: EventTarget,
    eventName: string,
    cb: EventListener | null,
    deps?: Live<unknown>[] | null,
    signal?: AbortSignal,
) {
    if (deps && deps.length > 0) {
        let currentListener: EventListener | null = null;
        const update = () => {
            if (currentListener) {
                target.removeEventListener(eventName, currentListener);
            }
            target.addEventListener(eventName, cb, { signal });
            currentListener = cb;
        };
        listenDeps(deps, update, signal);
        update();
    } else {
        target.addEventListener(eventName, cb, { signal });
    }
}

// Live

export type ChangeEventValue<T> = { newValue: T, oldValue: T, userData?: unknown };

export class Live<T> {

    private emitter = new EventTarget();

    constructor(protected currentValue: T) {
    }

    getValue(): T {
        return this.currentValue;
    }

    public listen<V extends ChangeEventValue<T>>(
        cb: (v: V) => void,
        signal?: AbortSignal
    ) {
        const listener = ((e: CustomEvent<V>) => cb(e.detail)) as EventListener;
        this.emitter.addEventListener("change", listener, { signal });
    }

    protected emit(detail: ChangeEventValue<T>) {
        const e = new CustomEvent("change", { detail });
        this.emitter.dispatchEvent(e);
    }
}

function listenDeps(
    deps: Live<unknown>[] | null | undefined,
    cb: (v: ChangeEventValue<unknown>) => void,
    signal?: AbortSignal
) {
    if (deps && deps.length > 0) {
        deps.forEach((d) => {
            d.listen(cb, signal);
        });
    }
}

class ReadonlyLive<T> extends Live<T> {

    public constructor(
        readValue: () => T,
        deps?: Live<unknown>[] | null,
        signal?: AbortSignal
    ) {
        super(readValue());
        listenDeps(deps, () => {
            const newValue = readValue();
            if (this.currentValue !== newValue) {
                const oldValue = this.currentValue;
                this.currentValue = newValue;
                this.emit({ newValue, oldValue });
            }
        }, signal);
    }
}

export function live<T>(
    readValue: () => T,
    deps?: Live<unknown>[] | null,
    destruct?: [number, (value: T) => unknown[]] | null,
    signal?: AbortSignal,
): Live<T> | Live<unknown>[] {
    if (destruct) {
        const [count, fn] = destruct;
        return Array.from({ length: count }, (_, i) => (
            new ReadonlyLive(
                () => fn(readValue())[i],
                deps,
                signal
            )
        ));
    } else {
        return new ReadonlyLive(readValue, deps, signal);
    }
}

// Param

export class Param<T> extends Live<T> {

    private compare: ((a: T, b: T) => boolean) | undefined;

    setValue(newValue: T, userData?: unknown) {
        const equals = this.compare
            ? this.compare(this.currentValue, newValue)
            : this.currentValue === newValue;
        if (!equals) {
            const oldValue = this.currentValue;
            this.currentValue = newValue;
            this.emit({ newValue, oldValue, userData });
        }
    }

    updateValue(update: (v: T) => T, userData?: unknown) {
        this.setValue(update(this.currentValue), userData);
    }

    setComparator(cmp: (a: T, b: T) => boolean) {
        this.compare = cmp;
    }
}

export function param<T>(initial: T): Param<T> {
    return new Param(initial);
}

// Unmount

export type Unmounter = (removing: boolean) => void;

export function unmountOn(signal: AbortSignal, unmounter: Unmounter | null) {
    if (unmounter) {
        if (signal.aborted) {
            unmounter(false);
        } else {
            signal.addEventListener("abort", () => unmounter(false));
        }
    }
}

// Insert

export class Insertion {
    constructor(
        public insert: (target: Node, anchor: Node | null) => Unmounter | null
    ) { }
}

export type Insertable = (
    string | boolean | number |
    null | undefined |
    Node |
    Insertion |
    Iterable<Insertable>
);

export function insert(input: Insertable, target: Node, anchor: Node | null = null): Unmounter | null {
    if (anchor && anchor.parentNode !== target) {
        return null;
    }
    if (input === null || typeof input === "undefined") {
        return null;
    } else if (input instanceof Insertion) {
        return input.insert(target, anchor);
    } else if (input instanceof DocumentFragment) {
        return insertFragment(input, target, anchor);
    } else if (input instanceof Node) {
        target.insertBefore(input, anchor);
        return (removing) => {
            if (removing) target.removeChild(input);
        };
    } else if (typeof input === "object" && typeof input[Symbol.iterator] === "function") {
        const list: (Unmounter | null)[] = [];
        for (const entry of input) {
            list.push(
                insert(entry, target, anchor)
            );
        }
        return (removing) => list.forEach((u) => u?.(removing));
    } else {
        const txt = document.createTextNode(String(input));
        target.insertBefore(txt, anchor);
        return (removing) => {
            if (removing) target.removeChild(txt);
        };
    }
}

function insertFragment(input: DocumentFragment, target: Node, anchor: Node | null = null): Unmounter | null {
    const len = input.childNodes.length;
    if (len === 0) {
        return null;
    } else if (len === 1) {
        return insert(input.firstChild, target, anchor);
    } else {
        const end = target.insertBefore(document.createComment("frag:end"), anchor);
        const start = target.insertBefore(document.createComment("frag:start"), end);
        target.insertBefore(input, end);
        return (removing) => {
            if (removing) {
                const range = document.createRange();
                range.setStartAfter(start);
                range.setEndBefore(end);
                range.deleteContents();
                target.removeChild(start);
                target.removeChild(end);
            }
        };
    }
}

export class NodeSpan {

    private container: Node;
    private start: Node;
    private end: Node;

    private unmounters: (Unmounter | null)[] = [];

    constructor(target: Node, anchor: Node | null = null, name: string = "span") {
        this.container = target;
        this.end = target.insertBefore(document.createComment(name + ":end"), anchor);
        this.start = target.insertBefore(document.createComment(name + ":start"), this.end);
    }

    public append(input: Insertable) {
        this.unmounters.push(
            insert(input, this.container, this.end)
        );
    }

    public *elementGenerator(): Generator<Element> {
        let current: Node | null | undefined = this.start;
        while (current && current !== this.end) {
            if (current instanceof Element) {
                yield current;
            }
            current = current?.nextSibling;
        }
    }

    private unmountContents() {
        this.unmounters.forEach((u) => u?.(false));
        this.unmounters = [];
    }

    public clear() {
        this.unmountContents();
        const range = document.createRange();
        range.setStartAfter(this.start);
        range.setEndBefore(this.end);
        range.deleteContents();
    }

    public unmount(removing: boolean) {
        if (removing) {
            this.clear();
            this.container.removeChild(this.start);
            this.container.removeChild(this.end);
        } else {
            this.unmountContents();
        }
    }
}

export function list<T extends Iterable<Insertable>>(
    input: () => T,
    deps?: Live<unknown>[]
): Insertable {
    return new Insertion((target, anchor) => {
        let abortController: AbortController | undefined;
        const span = new NodeSpan(target, anchor);
        span.append(input());
        if (deps && deps.length > 0) {
            const update = () => {
                span.clear();
                span.append(input());
            };
            const ac = new AbortController();
            listenDeps(deps, update, ac.signal);
            abortController = ac;
        }
        return (removing) => {
            abortController?.abort();
            span.unmount(removing);
        };
    });
}

export function cond(
    test: () => unknown,
    cons: () => Insertable,
    alt: () => Insertable,
    deps?: Live<unknown>[]
): Insertable {
    if (deps && deps.length > 0) {
        return new Insertion((target, anchor) => {
            const a = target.insertBefore(
                document.createComment("cond"),
                anchor
            );
            const abortController = new AbortController();
            let un: Unmounter | null = null;
            const update = () => {
                un?.(true);
                un = insert(test() ? cons() : alt(), target, a);
            };
            listenDeps(deps, update, abortController.signal);
            update();
            return (removing) => {
                abortController.abort();
                un?.(removing);
                if (removing) {
                    target.removeChild(a);
                }
            };
        });
    } else {
        return test() ? cons() : alt();
    }
}

export function expr(
    input: () => Insertable,
    deps?: Live<unknown>[]
): Insertable {
    if (deps && deps.length > 0) {
        return new Insertion((target, anchor) => {
            const a = target.insertBefore(
                document.createComment("expr"),
                anchor
            );
            const abortController = new AbortController();
            let un: Unmounter | null = null;
            const update = () => {
                un?.(true);
                un = insert(input(), target, a);
            };
            listenDeps(deps, update, abortController.signal);
            update();
            return (removing) => {
                abortController.abort();
                un?.(removing);
                if (removing) {
                    target.removeChild(a);
                }
            };
        });
    } else {
        return input();
    }
}

export function attr(
    el: Element,
    name: string,
    value: (() => string) | string,
    deps?: Live<unknown>[],
    signal?: AbortSignal
) {
    if (typeof value === "function") {
        const update = () => {
            el.setAttribute(name, value());
        };
        listenDeps(deps, update, signal);
        update();
    } else {
        el.setAttribute(name, value);
    }
}

export function attrs(
    el: Element,
    values: (() => Record<string, string>) | Record<string, string>,
    deps?: Live<unknown>[],
    signal?: AbortSignal,
) {
    const update = (v: Record<string, string>) => {
        Object.keys(v).forEach((key) => (
            el.setAttribute(key, v[key])
        ))
    };
    if (typeof values === "function") {
        listenDeps(deps, () => update(values()), signal);
        update(values());
    } else {
        update(values);
    }
}

export function el(
    html: string,
    fn?: (container: Node, unmountSignal: AbortSignal) => void
): Insertable {
    const frag = (() => {
        const t = document.createElement("template");
        t.innerHTML = html;
        return t.content;
    })();
    return new Insertion((target, anchor) => {
        if (fn) {
            const abortController = new AbortController();
            const container = frag.cloneNode(true);
            fn(container, abortController.signal);
            const un = insert(container, target, anchor);
            return (removing) => {
                abortController.abort();
                un?.(removing);
            };
        } else {
            return insert(frag, target, anchor);
        }
    });
}

export function cmp<I extends Insertable, P>(
    create: (props: P) => I,
    props: P
): I {
    return create(props);
}

export type View<M extends object = {}> = {
    model: M;
    insert(target: Element, anchor?: Node | null): InsertedView;
};

export type InsertedView = {
    unmountSignal: AbortSignal;
    querySelector(selectors: string): Element | null;
    querySelectorAll(selectors: string): Element[];
    remove(): void;
    unmount(): void;
};

export function view<M extends object>(
    model: M,
    insertable: (model: M, unmountSignal: AbortSignal) => Insertable
): View<M> {
    return {
        model,
        insert(target, anchor = null) {
            const abortController = new AbortController();
            const unmountSignal = abortController.signal;
            const span = new NodeSpan(target, anchor, "view");
            span.append(insertable(model, unmountSignal));
            return {
                unmountSignal,
                querySelector(selectors) {
                    for (const el of span.elementGenerator()) {
                        const result = el.matches(selectors) ? el : el.querySelector(selectors);
                        if (result) {
                            return result;
                        }
                    }
                    return null;
                },
                querySelectorAll(selectors) {
                    let result: Element[] = [];
                    for (const el of span.elementGenerator()) {
                        if (el.matches(selectors)) {
                            result.push(el);
                        }
                        const list = el.querySelectorAll(selectors);
                        if (list.length > 0) {
                            result.push(...Array.from(list));
                        }
                    }
                    return result;
                },
                remove() {
                    abortController.abort();
                    span.unmount(true);
                },
                unmount() {
                    abortController.abort();
                    span.unmount(false);
                }
            };
        }
    };
}
