import { StatusCodes } from "http-status-codes";
import { ConflictException } from "../../../../common/exception/conflict.exception.js";
import { HttpException } from "../../../../common/exception/http.exception.js";

describe("ConflictException", () => {
    it("should have status 409", () => {
        const ex = new ConflictException();
        expect(ex.getStatusCode()).toBe(StatusCodes.CONFLICT);
    });

    it("should have default message", () => {
        const ex = new ConflictException();
        expect(ex.getMessage()).toBe("Resource already exists");
    });

    it("should accept custom message", () => {
        const ex = new ConflictException("Custom conflict");
        expect(ex.getMessage()).toBe("Custom conflict");
    });

    it("should be instance of HttpException", () => {
        const ex = new ConflictException();
        expect(ex).toBeInstanceOf(HttpException);
    });
});
