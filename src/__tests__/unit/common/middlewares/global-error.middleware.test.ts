import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { GlobalErrorMiddleware } from "../../../../common/middleware/global-error.middleware.js";
import { HttpException } from "../../../../common/exception/http.exception.js";
import { JSONValidatorException } from "../../../../common/exception/json-validator.exception.js";
import { ValidationError } from "class-validator";

function mockReqRes() {
    const json = vitest.fn();
    const status = vitest.fn(() => ({ json }));
    const res = { status, json } as unknown as Response;
    const req = {} as Request;
    const next = vitest.fn() as NextFunction;
    return { req, res, json, status, next };
}

describe("GlobalErrorMiddleware", () => {
    it("should handle HttpException", () => {
        const { req, res, json, status, next } = mockReqRes();
        const handler = GlobalErrorMiddleware.globalErrorHandler();
        const error = new HttpException(StatusCodes.NOT_FOUND, "Not found");

        handler(error, req, res, next);

        expect(status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
        expect(json).toHaveBeenCalledWith({
            statusCode: StatusCodes.NOT_FOUND,
            message: "Not found",
            classError: "HttpException",
        });
    });

    it("should handle HttpException with result", () => {
        const { req, res, json, status, next } = mockReqRes();
        const handler = GlobalErrorMiddleware.globalErrorHandler();
        const error = new HttpException(StatusCodes.BAD_REQUEST, "Bad", { field: "error" });

        handler(error, req, res, next);

        expect(json).toHaveBeenCalledWith({
            statusCode: StatusCodes.BAD_REQUEST,
            message: "Bad",
            classError: "HttpException",
            result: { field: "error" },
        });
    });

    it("should handle JSONValidatorException", () => {
        const { req, res, json, status, next } = mockReqRes();
        const handler = GlobalErrorMiddleware.globalErrorHandler();
        const errors = [new ValidationError()];
        const error = new JSONValidatorException("Validation failed", errors);

        handler(error, req, res, next);

        expect(status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
        expect(json).toHaveBeenCalledWith({
            statusCode: StatusCodes.BAD_REQUEST,
            message: "Validation failed",
            classError: "JSONValidatorException",
            results: errors,
        });
    });

    it("should handle generic Error", () => {
        const { req, res, json, status, next } = mockReqRes();
        const handler = GlobalErrorMiddleware.globalErrorHandler();
        const error = new Error("Something went wrong");

        handler(error, req, res, next);

        expect(status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
        expect(json).toHaveBeenCalledWith({
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
            message: "Something went wrong",
            classError: "Error",
        });
    });
});
