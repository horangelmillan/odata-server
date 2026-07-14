import { Request, Response, NextFunction } from "express";
import { IsString } from "class-validator";
import { ValidatorMiddleware } from "../../../../common/middleware/json-validator.middleware.js";
import { BaseDTO } from "../../../../common/dto/base.dto.js";
import { JSONValidatorException } from "../../../../common/exception/json-validator.exception.js";

class TestDTO extends BaseDTO {
    @IsString()
    name!: string;
}

function mockReqRes(body: unknown) {
    const req = { body } as Request;
    const json = vitest.fn();
    const status = vitest.fn(() => ({ json }));
    const res = { status, json } as unknown as Response;
    const next = vitest.fn() as NextFunction;
    return { req, res, next };
}

describe("ValidatorMiddleware", () => {
    it("should call next() when body is valid", async () => {
        const { req, res, next } = mockReqRes({ name: "test" });
        const middleware = ValidatorMiddleware.validateBodyWithDTO(TestDTO);

        await middleware(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(next).not.toHaveBeenCalledWith(expect.any(JSONValidatorException));
    });

    it("should call next with JSONValidatorException when body is invalid", async () => {
        const { req, res, next } = mockReqRes({ name: 123 });
        const middleware = ValidatorMiddleware.validateBodyWithDTO(TestDTO);

        await middleware(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(next).toHaveBeenCalledWith(expect.any(JSONValidatorException));
    });

    it("should set req.dto when body is valid", async () => {
        const { req, res, next } = mockReqRes({ name: "test" });
        const middleware = ValidatorMiddleware.validateBodyWithDTO(TestDTO);

        await middleware(req, res, next);

        expect(req.dto).toBeDefined();
        expect((req.dto as TestDTO).name).toBe("test");
    });
});
