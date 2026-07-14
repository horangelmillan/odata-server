import { ValidationError } from "class-validator";

export class JSONValidatorException extends Error {
    private errors: ValidationError[];

    constructor(message: string, errors: ValidationError[]) {
        super(message);
        this.name = "JSONValidatorException";
        this.errors = errors;
    }

    getErrors(): ValidationError[] {
        return this.errors;
    }

    getMessage(): string {
        return this.message;
    }
}
