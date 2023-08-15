export function listen(
    target: EventTarget,
    eventName: string,
    cb: EventListener | null,
    deps?: Live<unknown>[] | null,
    signal?: AbortSignal,
) {
    if (deps) {
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
    if (deps) {
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
    deps: Live<unknown>[] | null,
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

// Insert

export type Remover = () => void;

export class Insertion {
    constructor(public insert: (target: Node, anchor: Node | null) => Remover | null) {
    }
}

export type Insertable = (
    string | boolean | number |
    null | undefined |
    Node |
    Insertion |
    Iterable<Insertable>
);

export function insert(input: Insertable, target: Node, anchor: Node | null = null): Remover | null {
    if (input === null || typeof input === "undefined") {
        return null;
    } else if (input instanceof Insertion) {
        return input.insert(target, anchor);
    } else if (input instanceof DocumentFragment) {
        switch (input.childNodes.length) {
            case 0:
                return null;
            case 1:
                return insert(input.firstChild, target, anchor);
            default:
                const span = new NodeSpan(target, anchor);
                span.append(input);
                return () => span.remove();
        }
    } else if (input instanceof Node) {
        target.insertBefore(input, anchor);
        return () => target.removeChild(input);
    } else if (typeof input === "object" && typeof input[Symbol.iterator] === "function") {
        const list: (Remover | null)[] = [];
        for (const entry of input) {
            const rm = insert(entry, target, anchor);
            list.push(rm);
        }
        return () => list.forEach(safeRemove);
    } else {
        const txt = document.createTextNode(String(input));
        target.insertBefore(txt, anchor);
        return () => target.removeChild(txt);
    }
}

export function safeRemove(rm: Remover | null) {
    if (typeof rm === "function") {
        rm();
    }
}

export class NodeSpan {

    private container: Node;
    private start: Node;
    private end: Node;

    constructor(target: Node, anchor: Node | null, name: string = "span") {
        this.container = target;
        this.end = target.insertBefore(document.createComment(name + ":end"), anchor);
        this.start = target.insertBefore(document.createComment(name + ":start"), this.end);
    }

    append(input: Insertable) {
        if (input instanceof Node) {
            this.container.insertBefore(input, this.end);
        } else {
            insert(input, this.container, this.end);
        }
    }

    *elementGenerator(): Generator<Element> {
        let current: Node | null | undefined = this.start;
        while (current && current !== this.end) {
            if (current instanceof Element) {
                yield current;
            }
            current = current?.nextSibling;
        }
    }

    clear() {
        const range = document.createRange();
        range.setStartAfter(this.start);
        range.setEndBefore(this.end);
        range.deleteContents();
    }

    remove() {
        this.clear();
        this.container.removeChild(this.start);
        this.container.removeChild(this.end);
    }
}

//

export function list<T extends Iterable<Insertable>>(
    input: () => T,
    deps?: Live<unknown>[],
    signal?: AbortSignal
): Insertable {
    return new Insertion((target, anchor) => {
        const span = new NodeSpan(target, anchor);
        span.append(input());
        if (deps) {
            const update = () => {
                const frag = document.createDocumentFragment();
                insert(input(), frag, null);
                span.clear();
                span.append(frag);
            };
            listenDeps(deps, update, signal);
        }
        return () => span.remove();
    });
}

export function cond(
    test: () => unknown,
    cons: () => Insertable,
    alt: () => Insertable,
    deps?: Live<unknown>[],
    signal?: AbortSignal
): Insertable {
    if (deps) {
        return new Insertion((target, anchor) => {
            let rm: Remover | null = null;
            const update = () => {
                safeRemove(rm);
                rm = insert(test() ? cons() : alt(), target, anchor);
            };
            listenDeps(deps, update, signal);
            update();
            return () => safeRemove(rm);
        });
    } else {
        return test() ? cons() : alt();
    }
}

export function expr(
    input: () => Insertable,
    deps?: Live<unknown>[],
    signal?: AbortSignal
): Insertable {
    return new Insertion((target, anchor) => {
        let rm = insert(input(), target, anchor);
        const update = () => {
            safeRemove(rm);
            rm = insert(input(), target, anchor);
        };
        listenDeps(deps, update, signal);
        return () => safeRemove(rm);
    });
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

export function el(html: string, fn?: (container: Node) => void): Insertable {
    const frag = (() => {
        const t = document.createElement("template");
        t.innerHTML = html;
        return t.content;
    })();
    return new Insertion((target, anchor) => {
        if (fn) {
            const container = frag.cloneNode(true);
            fn(container);
            return insert(container, target, anchor);
        } else {
            return insert(frag, target, anchor);
        }
    });
}

export function cmp<I extends Insertable, P>(
    create: (
        props: P,
        opts: { unmountSignal: AbortSignal }
    ) => I,
    props: P,
    unmountSignal: AbortSignal
): Insertable {
    return create(props, { unmountSignal });
}

export function view<M extends object>(model: M, insertable: (model: M, unmountSignal: AbortSignal) => Insertable) {
    return {
        model,
        insert(target: Node, anchor: Node | null) {
            const abortController = new AbortController();
            const unmountSignal = abortController.signal;
            const span = new NodeSpan(target, anchor, "view");
            span.append(insertable(model, unmountSignal));
            return {
                unmountSignal,
                querySelector(selectors: string): Element | null {
                    for (const el of span.elementGenerator()) {
                        const result = el.matches(selectors) ? el : el.querySelector(selectors);
                        if (result) {
                            return result;
                        }
                    }
                    return null;
                },
                querySelectorAll(selectors: string): Element[] {
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
                    span.remove();
                },
                unmount() {
                    abortController.abort();
                }
            };
        }
    };
}