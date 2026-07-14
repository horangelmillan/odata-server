import { ValidationError } from "class-validator";
import { JSONValidatorException } from "../../../../common/exception/json-validator.exception.js";

describe("JSONValidatorException", () => {
    it("should store message and errors", () => {
        const errors = [new ValidationError()];
        const ex = new JSONValidatorException("Validation failed", errors);
        expect(ex.getMessage()).toBe("Validation failed");
        expect(ex.getErrors()).toBe(errors);
        expect(ex.name).toBe("JSONValidatorException");
    });

    it("should be instance of Error", () => {
        const ex = new JSONValidatorException("msg", []);
        expect(ex).toBeInstanceOf(Error);
    });
});
