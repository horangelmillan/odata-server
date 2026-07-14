import { StatusCodes } from "http-status-codes";
import { DatabaseException } from "../../../../common/exception/database.exception.js";
import { HttpException } from "../../../../common/exception/http.exception.js";

describe("DatabaseException", () => {
    it("should have status 500", () => {
        const ex = new DatabaseException();
        expect(ex.getStatusCode()).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    });

    it("should have default message", () => {
        const ex = new DatabaseException();
        expect(ex.getMessage()).toBe("Database error occurred");
    });

    it("should accept custom message", () => {
        const ex = new DatabaseException("Custom DB error");
        expect(ex.getMessage()).toBe("Custom DB error");
    });

    it("should be instance of HttpException", () => {
        const ex = new DatabaseException();
        expect(ex).toBeInstanceOf(HttpException);
    });

    it("should have name DatabaseException", () => {
        const ex = new DatabaseException();
        expect(ex.name).toBe("DatabaseException");
    });
});
