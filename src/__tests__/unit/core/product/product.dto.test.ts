import { validateSync } from "class-validator";
import { plainToInstance } from "class-transformer";
import { ProductCreateDTO, ProductUpdateDTO } from "../../../../core/product/dto/product.dto.js";

describe("Product DTOs", () => {
    describe("ProductCreateDTO", () => {
        it("should pass validation with valid data", () => {
            const dto = plainToInstance(ProductCreateDTO, {
                nombre: "Laptop",
                precio: 1500,
                categoria: "Electrónica",
            });

            const errors = validateSync(dto);
            expect(errors.length).toBe(0);
        });

        it("should fail when nombre is missing", () => {
            const dto = plainToInstance(ProductCreateDTO, {
                precio: 1500,
                categoria: "Electrónica",
            });

            const errors = validateSync(dto);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe("nombre");
        });

        it("should fail when precio is negative", () => {
            const dto = plainToInstance(ProductCreateDTO, {
                nombre: "Laptop",
                precio: -10,
                categoria: "Electrónica",
            });

            const errors = validateSync(dto);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe("precio");
        });

        it("should fail when categoria is missing", () => {
            const dto = plainToInstance(ProductCreateDTO, {
                nombre: "Laptop",
                precio: 1500,
            });

            const errors = validateSync(dto);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors.some((e) => e.property === "categoria")).toBe(true);
        });

        it("should allow optional id", () => {
            const dto = plainToInstance(ProductCreateDTO, {
                id: 1,
                nombre: "Laptop",
                precio: 1500,
                categoria: "Electrónica",
            });

            const errors = validateSync(dto);
            expect(errors.length).toBe(0);
        });
    });

    describe("ProductUpdateDTO", () => {
        it("should not validate id field even when present", () => {
            const dto = plainToInstance(ProductUpdateDTO, {
                id: 1,
                nombre: "Laptop",
                precio: 1500,
                categoria: "Electrónica",
            });

            const errors = validateSync(dto);
            const idErrors = errors.filter((e) => e.property === "id");
            expect(idErrors.length).toBe(0);
        });

        it("should pass validation with valid data", () => {
            const dto = plainToInstance(ProductUpdateDTO, {
                nombre: "Laptop",
                precio: 1500,
                categoria: "Electrónica",
            });

            const errors = validateSync(dto);
            expect(errors.length).toBe(0);
        });
    });
});
