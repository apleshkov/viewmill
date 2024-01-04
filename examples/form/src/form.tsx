import { Result, ResultItem } from "./validation";

export default (
    shouldConfirmPassword = true,
    validationResult?: Result,
    loadingState?: { loading?: boolean, success?: string, error?: string }
) => {
    const items = validationResult?.items;
    return <>
        {loadingState?.success && <div class="alert alert-success">{loadingState?.success}</div>}
        {loadingState?.error && <div class="alert alert-danger">{loadingState?.error}</div>}
        <form>
            <fieldset disabled={!!loadingState?.loading}>
                <div class="row gt-3 mb-3">
                    <div class="col">
                        <label for="firstName" class="form-label">First Name</label>
                        <input
                            id="firstName"
                            type="text"
                            class={`form-control ${cls(items?.firstName)}`}
                            autocomplete="off"
                        />
                        <div class="invalid-feedback">{err(items?.firstName)}</div>
                    </div>
                    <div class="col">
                        <label for="lastName" class="form-label">Last Name</label>
                        <input
                            id="lastName"
                            type="text"
                            class={`form-control ${cls(items?.lastName)}`}
                            autocomplete="off"
                        />
                        <div class="invalid-feedback">{err(items?.lastName)}</div>
                    </div>
                </div>
                <div class="form-check mb-3">
                    <input
                        id="shouldConfirmPassword"
                        type="checkbox"
                        checked={shouldConfirmPassword}
                        class={`form-check-input ${cls(items?.shouldConfirmPassword)}`}
                    />
                    <label class="form-check-label" for="shouldConfirmPassword">
                        Check to enable the password confirmation
                    </label>
                    <div class="invalid-feedback">{err(items?.shouldConfirmPassword)}</div>
                </div>
                <div class="row gt-3 mb-3">
                    <div class="col">
                        <label for="password" class="form-label">Password</label>
                        <input
                            id="password"
                            type="password"
                            class={`form-control ${cls(items?.password)}`}
                        />
                        <div class="invalid-feedback">{err(items?.password)}</div>
                    </div>
                    <div class={`col ${shouldConfirmPassword ? "" : "d-none"}`}>
                        <label for="confirmedPassword" class="form-label">Confirm Password</label>
                        <input
                            id="confirmedPassword"
                            type="password"
                            class={`form-control ${cls(items?.confirmedPassword)}`}
                        />
                        <div class="invalid-feedback">{err(items?.confirmedPassword)}</div>
                    </div>
                </div>
                <div class="form-check mb-3">
                    <input
                        id="producesError"
                        type="checkbox"
                        class={`form-check-input ${cls(items?.producesError)}`}
                    />
                    <label class="form-check-label" for="producesError">
                        Check to produce an error on submit
                    </label>
                    <div class="invalid-feedback">{err(items?.producesError)}</div>
                </div>
                <div class="mb-3">
                    <label for="description" class="form-label">Description</label>
                    <input
                        id="description"
                        type="text"
                        class={`form-control ${cls(items?.description)}`}
                        autocomplete="off"
                    />
                    <div class="form-text">Optional description</div>
                    <div class="invalid-feedback">{err(items?.description)}</div>
                </div>
                <div class="form-check mb-3">
                    <input
                        id="agree"
                        type="checkbox"
                        class={`form-check-input ${cls(items?.agree)}`}
                    />
                    <label class="form-check-label" for="agree">
                        Agree to submit
                    </label>
                    <div class="invalid-feedback">{err(items?.agree)}</div>
                </div>
                <div class="mt-4">
                    <button type="submit" class="btn btn-primary">Submit</button>
                </div>
            </fieldset>
        </form>
    </>;
};

function cls(item: ResultItem | undefined): string {
    return typeof item?.valid === "undefined" ? "" : (
        item.valid === true ? "is-valid" : "is-invalid"
    );
}

function err(item: ResultItem | undefined): string | undefined {
    if (item?.valid === false) {
        return item.message;
    }
}