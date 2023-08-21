import Data from "./data";
import TableView from "./table-view";
import * as runtime from "viewmill-runtime";

const view = TableView(
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
    ]
);

const remoteData = Data(42);

function load() {
    const {
        loading,
        results,
        error,
        total,
        page,
        sorting
    } = view.model;
    loading.setValue(true);
    const params = {
        page: page.getValue(),
        sorting: sorting.getValue()
    };
    remoteData.fetch(params)
        .then((data) => {
            loading.setValue(false);
            results.setValue(data.results);
            total.setValue(data.info.total);
        })
        .catch((reason) => {
            loading.setValue(false);
            error.setValue(reason);
        });
}

load();
view.model.sorting.listen(() => load());
view.model.page.listen(() => load());

const { querySelector } = view.insert(document.getElementById("app"));

querySelector("thead")?.addEventListener("click", (e) => {
    e.preventDefault();
    const field = (e.target as Element).getAttribute("data-col");
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
    const page = (e.target as Element).getAttribute("data-page");
    if (typeof page === "string" && page.length > 0) {
        view.model.page.setValue(
            Number.parseInt(page)
        );
    }
});
