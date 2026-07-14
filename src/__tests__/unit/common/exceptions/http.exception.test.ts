import { StatusCodes } from "http-status-codes";
import { HttpException } from "../../../../common/exception/http.exception.js";

describe("HttpException", () => {
    it("should set status code and message", () => {
        const ex = new HttpException(StatusCodes.NOT_FOUND, "Not found");
        expect(ex.getStatusCode()).toBe(StatusCodes.NOT_FOUND);
        expect(ex.getMessage()).toBe("Not found");
        expect(ex.name).toBe("HttpException");
    });

    it("should set default message from status code", () => {
        const ex = new HttpException(StatusCodes.OK);
        expect(ex.getMessage()).toBe("OK");
    });

    it("should store optional result", () => {
        const result = { id: 1 };
        const ex = new HttpException(StatusCodes.BAD_REQUEST, "Error", result);
        expect(ex.getResult()).toEqual(result);
    });

    it("should return undefined result when not set", () => {
        const ex = new HttpException(StatusCodes.BAD_REQUEST);
        expect(ex.getResult()).toBeUndefined();
    });

    it("should be instanceof Error", () => {
        const ex = new HttpException(StatusCodes.BAD_REQUEST);
        expect(ex).toBeInstanceOf(Error);
    });
});
