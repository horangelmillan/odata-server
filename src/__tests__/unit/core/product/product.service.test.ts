import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../core/product/model/product.model.js", () => ({
    ProductModel: {
        findOne: vi.fn(),
        findAll: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        destroy: vi.fn(),
    },
}));

import { productService } from "../../../../core/product/service/product.service.js";
import { ProductModel } from "../../../../core/product/model/product.model.js";

const mockProduct = { id: 1, nombre: "Laptop", precio: 1500, categoria: "Electrónica" };
const mockProducts = [
    mockProduct,
    { id: 2, nombre: "Mouse", precio: 50, categoria: "Periféricos" },
];

describe("ProductService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("findAll", () => {
        it("should return all products", async () => {
            vi.mocked(ProductModel.findAll).mockResolvedValue(mockProducts);

            const result = await productService.findAll({});

            expect(result).toEqual(mockProducts);
            expect(ProductModel.findAll).toHaveBeenCalledOnce();
        });
    });

    describe("findById", () => {
        it("should return product when found", async () => {
            vi.mocked(ProductModel.findOne).mockResolvedValue(mockProduct);

            const result = await productService.findById(1);

            expect(result).toEqual(mockProduct);
            expect(ProductModel.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
        });

        it("should return null when not found", async () => {
            vi.mocked(ProductModel.findOne).mockResolvedValue(null);

            const result = await productService.findById(999);

            expect(result).toBeNull();
        });
    });

    describe("create", () => {
        it("should create and return product", async () => {
            const data = { nombre: "Teclado", precio: 200, categoria: "Periféricos" };
            vi.mocked(ProductModel.create).mockResolvedValue({ id: 3, ...data });

            const result = await productService.create(data);

            expect(result).toEqual({ id: 3, ...data });
            expect(ProductModel.create).toHaveBeenCalledWith(data);
        });
    });

    describe("update", () => {
        it("should update and return affected count", async () => {
            vi.mocked(ProductModel.update).mockResolvedValue([1]);

            const result = await productService.update({ nombre: "Laptop Pro" }, 1);

            expect(result).toEqual([1]);
            expect(ProductModel.update).toHaveBeenCalledWith(
                { nombre: "Laptop Pro" },
                { where: { id: 1 } },
            );
        });
    });

    describe("delete", () => {
        it("should delete and return deleted count", async () => {
            vi.mocked(ProductModel.destroy).mockResolvedValue(1);

            const result = await productService.delete(1);

            expect(result).toBe(1);
            expect(ProductModel.destroy).toHaveBeenCalledWith({ where: { id: 1 } });
        });
    });
});
