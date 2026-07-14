import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../core/product/service/product.service.js", () => ({
    productService: {
        findAll: vi.fn(),
        findById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
}));

import { productController } from "../../../../core/product/controller/product.controller.js";
import { productService } from "../../../../core/product/service/product.service.js";

function mockReqRes(overrides?: Record<string, unknown>) {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const res = { status, json } as unknown as Response;
    const req = { params: {}, dto: undefined, ...overrides } as unknown as Request;
    const next = vi.fn() as NextFunction;
    return { req, res, json, status, next };
}

describe("ProductController", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getAll", () => {
        it("should return all products with 200", async () => {
            const products = [{ id: 1, nombre: "Laptop", precio: 1500, categoria: "Electrónica" }];
            vi.mocked(productService.findAll).mockResolvedValue(products);
            const { req, res, json, status, next } = mockReqRes();

            await productController.getAll(req, res, next);

            expect(productService.findAll).toHaveBeenCalledOnce();
            expect(json).toHaveBeenCalledWith({
                statusCode: StatusCodes.OK,
                message: "OK",
                results: products,
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should call next on error", async () => {
            const error = new Error("DB error");
            vi.mocked(productService.findAll).mockRejectedValue(error);
            const { req, res, next } = mockReqRes();

            await productController.getAll(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });

    describe("getById", () => {
        it("should return product with 200 when found", async () => {
            const product = { id: 1, nombre: "Laptop", precio: 1500, categoria: "Electrónica" };
            vi.mocked(productService.findById).mockResolvedValue(product);
            const { req, res, json, status, next } = mockReqRes({ params: { id: "1" } });

            await productController.getById(req, res, next);

            expect(json).toHaveBeenCalledWith({
                statusCode: StatusCodes.OK,
                message: "OK",
                result: product,
            });
        });

        it("should call next with 404 when not found", async () => {
            vi.mocked(productService.findById).mockResolvedValue(null);
            const { req, res, next } = mockReqRes({ params: { id: "999" } });

            await productController.getById(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                statusCode: StatusCodes.NOT_FOUND,
            }));
        });
    });

    describe("create", () => {
        it("should return created product with 201", async () => {
            const data = { nombre: "Teclado", precio: 200, categoria: "Periféricos" };
            const created = { id: 3, ...data };
            vi.mocked(productService.create).mockResolvedValue(created);
            const { req, res, json, status, next } = mockReqRes({ dto: data });

            await productController.create(req, res, next);

            expect(productService.create).toHaveBeenCalledWith(data);
            expect(json).toHaveBeenCalledWith({
                statusCode: StatusCodes.CREATED,
                message: "Producto creado exitosamente",
                result: created,
            });
        });

        it("should call next on error", async () => {
            const error = new Error("Create failed");
            vi.mocked(productService.create).mockRejectedValue(error);
            const { req, res, next } = mockReqRes({ dto: {} });

            await productController.create(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });

    describe("update", () => {
        it("should return updated product with 200", async () => {
            const existing = { id: 1, nombre: "Laptop", precio: 1500, categoria: "Electrónica" };
            const data = { nombre: "Laptop Pro" };
            vi.mocked(productService.findById).mockResolvedValue(existing);
            vi.mocked(productService.update).mockResolvedValue([1]);
            const { req, res, json, status, next } = mockReqRes({ params: { id: "1" }, dto: data });

            await productController.update(req, res, next);

            expect(productService.update).toHaveBeenCalledWith(data, 1);
            expect(json).toHaveBeenCalledWith({
                statusCode: StatusCodes.OK,
                message: "Producto actualizado exitosamente",
                result: [1],
            });
        });

        it("should call next with 404 when product not found", async () => {
            vi.mocked(productService.findById).mockResolvedValue(null);
            const { req, res, next } = mockReqRes({ params: { id: "999" }, dto: {} });

            await productController.update(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                statusCode: StatusCodes.NOT_FOUND,
            }));
        });
    });

    describe("delete", () => {
        it("should delete and return 200", async () => {
            const existing = { id: 1, nombre: "Laptop", precio: 1500, categoria: "Electrónica" };
            vi.mocked(productService.findById).mockResolvedValue(existing);
            vi.mocked(productService.delete).mockResolvedValue(1);
            const { req, res, json, status, next } = mockReqRes({ params: { id: "1" } });

            await productController.delete(req, res, next);

            expect(productService.delete).toHaveBeenCalledWith(1);
            expect(json).toHaveBeenCalledWith({
                statusCode: StatusCodes.OK,
                message: "Producto eliminado exitosamente",
            });
        });

        it("should call next with 404 when product not found", async () => {
            vi.mocked(productService.findById).mockResolvedValue(null);
            const { req, res, next } = mockReqRes({ params: { id: "999" } });

            await productController.delete(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                statusCode: StatusCodes.NOT_FOUND,
            }));
        });
    });
});
