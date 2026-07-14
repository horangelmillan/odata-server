import { StatusCodes } from "http-status-codes";
import { NotFoundException } from "../../../../common/exception/notfound.exception.js";
import { HttpException } from "../../../../common/exception/http.exception.js";

describe("NotFoundException", () => {
    it("should have status 404", () => {
        const ex = new NotFoundException();
        expect(ex.getStatusCode()).toBe(StatusCodes.NOT_FOUND);
    });

    it("should have default message", () => {
        const ex = new NotFoundException();
        expect(ex.getMessage()).toBe("Resource not found");
    });

    it("should accept custom message", () => {
        const ex = new NotFoundException("Custom not found");
        expect(ex.getMessage()).toBe("Custom not found");
    });

    it("should be instance of HttpException", () => {
        const ex = new NotFoundException();
        expect(ex).toBeInstanceOf(HttpException);
    });
});
