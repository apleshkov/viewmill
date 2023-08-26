import FormView from "./form-view";
import { FormItem } from "./items";
import { validate } from "./validation";

const formItems: FormItem[] = [
    {
        id: "firstName",
        validate({ firstName = "" }) {
            if (!firstName.length) {
                throw new Error("At least 1 character")
            }
        }
    },
    {
        id: "lastName",
        validate({ lastName = "" }) {
            if (!lastName.length) {
                throw new Error("At least 1 character")
            }
        }
    },
    {
        id: "shouldConfirmPassword"
    },
    {
        id: "password",
        validate({ password = "" }) {
            if (password.length < 3) {
                throw new Error("At least 3 characters");
            }
        }
    },
    {
        id: "confirmedPassword",
        validate({ password = "", confirmedPassword, shouldConfirmPassword }) {
            if (shouldConfirmPassword) {
                if (password.length === 0 || password !== confirmedPassword) {
                    throw new Error("Password don't match");
                }
            }
        }
    },
    {
        id: "producesError"
    },
    {
        id: "description"
    },
    {
        id: "agree",
        validate({ agree = false }) {
            if (!agree) {
                throw new Error("You need to check this box to submit!");
            }
        }
    }
];

const view = FormView();

const { querySelector } = view.insert(document.getElementById("app")!);

querySelector("#shouldConfirmPassword")?.addEventListener("change", (e) => {
    const input = e.target as HTMLInputElement;
    view.model.shouldConfirmPassword.setValue(input.checked);
});

querySelector("form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const { validationResult, loadingState } = view.model;
    const r = validate(e.target as HTMLFormElement, formItems);
    validationResult.setValue(r);
    if (r.valid) {
        loadingState.setValue({ loading: true });
        const { producesError } = r.values;
        setTimeout(() => {
            if (producesError) {
                loadingState.setValue({ error: "Something went wrong" });
            } else {
                loadingState.setValue({ success: "Submitted!" });
            }
        }, 1500);
    }
});
