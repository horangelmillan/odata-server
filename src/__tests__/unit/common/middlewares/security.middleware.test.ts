import { Request, Response, NextFunction } from "express";
import { security } from "../../../../common/middleware/security.middleware.js";

describe("Security middleware", () => {
    describe("hashPassword", () => {
        it("should hash password when present in body", async () => {
            const req = { body: { password: "secret123" } } as Request<{}, { password?: string }, { password?: string }>;
            const res = {} as Response;
            const next = vitest.fn() as NextFunction;

            await security.hashPassword(req, res, next);

            expect(req.body.password).not.toBe("secret123");
            expect(req.body.password).toMatch(/^\$2[ab]\$\d+\$/);
            expect(next).toHaveBeenCalledOnce();
        });

        it("should call next without hashing when no password", async () => {
            const req = { body: {} } as Request<{}, { password?: string }, { password?: string }>;
            const res = {} as Response;
            const next = vitest.fn() as NextFunction;

            await security.hashPassword(req, res, next);

            expect(req.body.password).toBeUndefined();
            expect(next).toHaveBeenCalledOnce();
        });
    });

    describe("comparePassword", () => {
        it("should return true for matching password", async () => {
            const { hash } = await import("bcrypt");
            const hashed = await hash("secret123", 4);

            const result = await security.comparePassword("secret123", hashed);

            expect(result).toBe(true);
        });

        it("should throw for non-matching password", async () => {
            const { hash } = await import("bcrypt");
            const hashed = await hash("secret123", 4);

            await expect(security.comparePassword("wrong", hashed)).rejects.toThrow("Invalid credentials");
        });
    });

    describe("protectUserAccounts", () => {
        it("should call next when user owns the account", () => {
            const req = { params: { id: "1" }, user: { id: "1" } } as unknown as Request;
            const res = {} as Response;
            const next = vitest.fn() as NextFunction;

            security.protectUserAccounts(req, res, next);

            expect(next).toHaveBeenCalledOnce();
            expect(next).not.toHaveBeenCalledWith(expect.any(Error));
        });

        it("should call next with error when user does not own account", () => {
            const req = { params: { id: "1" }, user: { id: "2" } } as unknown as Request;
            const res = {} as Response;
            const next = vitest.fn() as NextFunction;

            security.protectUserAccounts(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(Error));
        });
    });

    describe("protectSession", () => {
        it("should call next with error when no token provided", async () => {
            const req = { headers: {} } as Request;
            const res = {} as Response;
            const next = vitest.fn() as NextFunction;

            await security.protectSession(req, res, next, vitest.fn());

            expect(next).toHaveBeenCalledWith(expect.any(Error));
        });
    });
});
