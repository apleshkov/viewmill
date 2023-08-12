export default (
    cols = [],
    state,
    page = 1,
    sorting
) => {
    const loading = state.type === "loading";
    const {
        results = [],
        info: {
            limit = 10,
            total = 10
        } = {}
    } = (state.data ?? {});
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
            <div class={`alert alert-danger mb-3 ${state.type === "error" ? "" : "d-none"}`}>
                {state.error}
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
                    {loading ? placeholder : null}
                    {
                        ...results.map((record) => (
                            <tr>
                                {...cols.map(({ key, render }) => (
                                    <td>{render ? render(record) : record[key]}</td>
                                ))}
                            </tr>
                        ))
                    }
                </tbody>
            </table>
            <div data-pagination class="d-flex justify-content-center">
                {
                    total > 0 && limit > 0 && total > limit
                        ? (
                            <div>
                                <ul class="pagination">
                                    {...Array.from({ length: Math.ceil(total / limit) }, (_, i) => i + 1).map((p) => {
                                        return (
                                            <li class={`page-item ${p === page ? "disabled" : ""}`}>
                                                <a data-page={p} href="#" class="page-link">{p}</a>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )
                        : null
                }
            </div>
        </div>
    );
};
