import { Item, Sorting } from "./data";

export type Column = {
    key: string
    title: string
    sortable?: boolean
    render?: (item: Item) => any
};

export default (
    cols: Column[],
    loading = true,
    results: Item[] = [],
    error?: unknown,
    page = 1,
    limit = 10,
    total = 0,
    sorting?: Sorting
) => {
    const showPagination = total > 0 && limit > 0 && total > limit;
    const pageCount = limit > 0 ? Math.ceil(total / limit) : 0;
    const placeholder = Array.from({ length: limit }).map(() => (
        <tr>
            {Array.from({ length: cols.length }).map(() => (
                <td class="placeholder-glow">
                    <span class="placeholder w-100"></span>
                </td>
            ))}
        </tr>
    ));
    return (
        <div class="position-relative">
            <div
                class={`alert alert-danger mb-3 ${error ? "" : "d-none"}`}
            >
                {error}
            </div>
            <table class="table">
                <thead>
                    <tr>
                        {...cols.map(({ key, title, sortable }) => {
                            return <th>
                                {sortable
                                    ? <a data-col={key} href="#">
                                        {title}
                                        {
                                            sorting && sorting.field === key
                                                ? (sorting.order === "asc" ? " ↑" : " ↓")
                                                : null
                                        }
                                    </a>
                                    : title
                                }
                            </th>;
                        })}
                    </tr>
                </thead>
                <tbody>
                    {
                        loading
                            ? placeholder
                            : <>{
                                ...results.map((record) => (
                                    <tr>
                                        {...cols.map(({ key, render }) => (
                                            <td>{render ? render(record) : record[key]}</td>
                                        ))}
                                    </tr>
                                ))
                            }</>
                    }
                </tbody>
            </table>
            <div
                data-pagination
                class={`d-flex justify-content-center ${showPagination ? "" : "d-none"}`}
            >
                <div>
                    <ul class="pagination">
                        {...Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => {
                            return (
                                <li class={`page-item ${p === page ? "disabled" : ""}`}>
                                    <a data-page={p} href="#" class="page-link">{p}</a>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
        </div>
    );
};
