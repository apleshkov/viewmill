import { FormItem, FormValues } from "./items";

export type ResultItem = {
    valid: boolean
    message?: string
};

export type Result = {
    values: FormValues
    valid: boolean
    items: {
        [P in keyof FormValues]: ResultItem
    }
};

export function validate(form: HTMLFormElement, formItems: FormItem[]): Result {
    const collection = form.elements;
    const values = {};
    formItems.forEach(({ id }) => {
        const entry = collection.namedItem(id);
        if (entry instanceof HTMLInputElement) {
            if (entry.type === "checkbox") {
                values[id] = entry.checked;
            } else {
                values[id] = entry.value;
            }
        }
    });
    let valid = true;
    const items: Result["items"] = {};
    formItems.forEach((item) => {
        const { id } = item;
        console.log(id, values[id]);
        if (item.validate) {
            try {
                item.validate(values);
                items[id] = { valid: true };
            } catch (e) {
                valid = false;
                items[id] = {
                    valid: false,
                    message: e.message
                };
            }
        } else {
            items[id] = { valid: true };
        }
    });
    return { values, valid, items };
}