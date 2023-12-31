// https://randomuser.me/documentation
const rawDataFields = ["name", "email", "phone"];

type RawData = {
    results: {
        name: { first: string, last: string }
        email: string
        phone: string
    }[]
};

export type Item = {
    firstName: string
    lastName: string
    email: string
    phone: string
};

export type Data = {
    results: Item[]
    info: {
        page: number
        limit: number
        total: number
    }
};

export type Sorting = {
    field: string,
    order: "asc" | "desc"
};

export type FetchParams = {
    page?: number
    limit?: number
    sorting?: Sorting
};

export default (max: number) => {
    let remoteItems: Item[] = [];

    async function loadAll(): Promise<Item[]> {
        const url = new URL("https://randomuser.me/api/");
        url.searchParams.set("inc", rawDataFields.join(","));
        url.searchParams.set("results", String(max));
        url.searchParams.set("noinfo", "");
        const res = await fetch(url);
        const json = await res.json() as RawData;
        remoteItems = json.results.map(
            ({ name, email, phone }) => ({
                firstName: name.first,
                lastName: name.last,
                email,
                phone
            })
        );
        return remoteItems;
    }

    return {
        async fetch(
            {
                page = 1,
                limit = 10,
                sorting
            }: FetchParams = {}
        ): Promise<Data> {
            let results = await loadAll();
            const total = results.length;
            if (sorting) {
                const { field, order } = sorting;
                results = [...results].sort((item1, item2) => {
                    const v1 = item1[field];
                    const v2 = item2[field];
                    let result = 0;
                    if (v1 > v2) {
                        result = 1;
                    } else if (v1 < v2) {
                        result = -1;
                    }
                    return order === "asc" ? result : -result;
                });
            }
            results = results.slice((page - 1) * limit, page * limit);
            return {
                results,
                info: { page, limit, total }
            };
        }
    };
};
