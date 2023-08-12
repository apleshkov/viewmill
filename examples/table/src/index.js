import Data from "./data";
import TableView from "./table-view";
import * as runtime from "viewmill-runtime";

const view = new TableView(
    [
        { key: 'firstName', title: 'First', sortable: true },
        { key: 'lastName', title: 'Last', sortable: true },
        {
            key: 'phone',
            title: 'Phone',
            render: ({ phone }) => runtime.el(`<code>${phone}</code>`)
        },
        {
            key: 'email',
            title: 'E-mail',
            sortable: true,
            render: ({ email }) => runtime.el(`<a href="mailto:${email}">${email}</a>`)
        }
    ],
    { type: "loading" }
);

const remoteData = Data(42);

function load() {
    const { state, page, sorting } = view.model;
    if (state.getValue()?.type !== "loading") {
        state.setValue({ type: "loading" });
    }
    const params = {
        page: page.getValue(),
        sorting: sorting.getValue()
    };
    remoteData.fetch(params).then((data) => {
        state.setValue({ type: "loaded", data });
    });
}

load();
view.model.sorting.listen(() => load());
view.model.page.listen(() => load());

const { querySelector } = view.insert(document.getElementById("app"));

querySelector("thead")?.addEventListener("click", (e) => {
    e.preventDefault();
    let field = e.target.getAttribute("data-col");
    if (typeof field === "string" && field.length > 0) {
        const { sorting } = view.model;
        let v = sorting.getValue();
        if (v && v.field === field) {
            const order = v.order === "asc" ? "desc" : "asc";
            sorting.setValue({ field, order });
        } else {
            sorting.setValue({ field, order: "asc" });
        }
    }
});

querySelector("[data-pagination]")?.addEventListener("click", (e) => {
    e.preventDefault();
    let page = e.target.getAttribute("data-page");
    if (typeof page === "string" && page.length > 0) {
        page = Number.parseInt(page);
        view.model.page.setValue(page);
    }
});
