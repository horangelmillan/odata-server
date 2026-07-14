import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../../common/service/odata/odata.service.js", () => {
    const { Router } = require("express");
    return { oDataExpressApp: Router() };
});

vi.mock("../../core/product/model/product.model.js", () => ({
    ProductModel: {
        findOne: vi.fn(),
        findAll: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        destroy: vi.fn(),
    },
}));

import expressApp from "../../main.js";
import { ProductModel } from "../../core/product/model/product.model.js";

const mockProducts = [
    { id: 1, nombre: "Laptop", precio: 1500, categoria: "Electrónica" },
    { id: 2, nombre: "Mouse", precio: 50, categoria: "Periféricos" },
];

describe("Product API", () => {
    let app: ReturnType<typeof expressApp>;

    beforeEach(() => {
        vi.clearAllMocks();
        app = expressApp();
    });

    describe("GET /api/core/products", () => {
        it("should return all products", async () => {
            vi.mocked(ProductModel.findAll).mockResolvedValue(mockProducts);

            const res = await request(app).get("/api/core/products");

            expect(res.status).toBe(200);
            expect(res.body).toEqual({
                statusCode: 200,
                message: "OK",
                results: mockProducts,
            });
        });

        it("should return empty array when no products", async () => {
            vi.mocked(ProductModel.findAll).mockResolvedValue([]);

            const res = await request(app).get("/api/core/products");

            expect(res.status).toBe(200);
            expect(res.body.results).toEqual([]);
        });
    });

    describe("GET /api/core/products/:id", () => {
        it("should return product by id", async () => {
            vi.mocked(ProductModel.findOne).mockResolvedValue(mockProducts[0]);

            const res = await request(app).get("/api/core/products/1");

            expect(res.status).toBe(200);
            expect(res.body.result).toEqual(mockProducts[0]);
        });

        it("should return 404 when product not found", async () => {
            vi.mocked(ProductModel.findOne).mockResolvedValue(null);

            const res = await request(app).get("/api/core/products/999");

            expect(res.status).toBe(404);
            expect(res.body.message).toBe("Producto 999 no encontrado");
        });
    });

    describe("POST /api/core/products", () => {
        it("should create product and return 201", async () => {
            const payload = { nombre: "Teclado", precio: 200, categoria: "Periféricos" };
            const created = { id: 3, ...payload };
            vi.mocked(ProductModel.create).mockResolvedValue(created);

            const res = await request(app).post("/api/core/products").send(payload);

            expect(res.status).toBe(201);
            expect(res.body.result).toEqual(created);
            expect(res.body.message).toBe("Producto creado exitosamente");
        });

        it("should return 400 when body is invalid", async () => {
            const res = await request(app).post("/api/core/products").send({ precio: -5 });

            expect(res.status).toBe(400);
            expect(res.body.classError).toBe("JSONValidatorException");
        });

        it("should return 400 when nombre is missing", async () => {
            const res = await request(app).post("/api/core/products").send({
                precio: 100,
                categoria: "Test",
            });

            expect(res.status).toBe(400);
        });

        it("should return 400 when extra fields are sent", async () => {
            const res = await request(app).post("/api/core/products").send({
                nombre: "Test",
                precio: 100,
                categoria: "Test",
                extraField: "should not be allowed",
            });

            expect(res.status).toBe(400);
        });
    });

    describe("PUT /api/core/products/:id", () => {
        const validPayload = { nombre: "Laptop Pro", precio: 2000, categoria: "Electrónica" };

        it("should update product and return 200", async () => {
            vi.mocked(ProductModel.findOne).mockResolvedValue(mockProducts[0]);
            vi.mocked(ProductModel.update).mockResolvedValue([1]);

            const res = await request(app).put("/api/core/products/1").send(validPayload);

            expect(res.status).toBe(200);
            expect(res.body.result).toEqual([1]);
            expect(res.body.message).toBe("Producto actualizado exitosamente");
        });

        it("should return 404 when product not found", async () => {
            vi.mocked(ProductModel.findOne).mockResolvedValue(null);

            const res = await request(app).put("/api/core/products/999").send(validPayload);

            expect(res.status).toBe(404);
        });

        it("should return 400 when body is invalid", async () => {
            vi.mocked(ProductModel.findOne).mockResolvedValue(mockProducts[0]);

            const res = await request(app).put("/api/core/products/1").send({ precio: "not-a-number" });

            expect(res.status).toBe(400);
        });
    });

    describe("DELETE /api/core/products/:id", () => {
        it("should delete product and return 200", async () => {
            vi.mocked(ProductModel.findOne).mockResolvedValue(mockProducts[0]);
            vi.mocked(ProductModel.destroy).mockResolvedValue(1);

            const res = await request(app).delete("/api/core/products/1");

            expect(res.status).toBe(200);
            expect(res.body.message).toBe("Producto eliminado exitosamente");
        });

        it("should return 404 when product not found", async () => {
            vi.mocked(ProductModel.findOne).mockResolvedValue(null);

            const res = await request(app).delete("/api/core/products/999");

            expect(res.status).toBe(404);
        });
    });
});
