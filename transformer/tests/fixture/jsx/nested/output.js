import * as viewmill from "viewmill-runtime";
export default function(a, b) {
    return viewmill.view({
        a: viewmill.param(a),
        b: viewmill.param(b)
    }, ({
        a,
        b
    }, unmountSignal)=>{
        const c = viewmill.live(()=>(a.getValue() + b.getValue()), [
            a,
            b
        ]);
        function f1(x) {
            return viewmill.el("<span><!></span>", (container)=>{
                const span__1 = container.firstChild;
                const anchor__1 = span__1.firstChild;
                viewmill.insert(viewmill.expr(()=>(a.getValue() + x + c.getValue()), [
                    a,
                    c
                ]), span__1, anchor__1);
            });
        }
        const f2 = (x)=>{
            return [
                x
            ];
        };
        const f3 = (x)=>viewmill.el("<div><!></div>", (container)=>{
                const div__1 = container.firstChild;
                const anchor__1 = div__1.firstChild;
                viewmill.insert(x, div__1, anchor__1);
            });
        class C1 {
            #foo = a.getValue();
            constructor(){
                this.#bar = c;
            }
            baz() {
                return this.#bar * a.getValue();
            }
        }
        const o1 = viewmill.live(()=>({
                get x () {
                    return a.getValue();
                },
                set x (newValue){
                    newValue + c.getValue();
                }
            }), [
            a,
            c
        ]);
        const loading = false;
        return [
            f1(123),
            ",",
            f2,
            ",",
            f3("text"),
            ",",
            new C1(),
            ",",
            viewmill.expr(()=>(o1.getValue()), [
                o1
            ])
        ];
    });
};
