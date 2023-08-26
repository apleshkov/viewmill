export type FormValues = {
    firstName?: string
    lastName?: string
    shouldConfirmPassword?: boolean
    password?: string
    confirmedPassword?: string
    producesError?: boolean
    description?: string
    agree?: boolean
};

export type FormItem = {
    id: keyof FormValues
    validate?: (values: FormValues) => void
};
