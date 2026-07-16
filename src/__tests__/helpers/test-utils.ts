import { IProduct } from "../../core/demo/product/interface/product.interface.js";

export function createProductPayload(overrides?: Partial<IProduct>): Record<string, unknown> {
    return {
        nombre: "Producto Test",
        precio: 100,
        categoria: "Electrónica",
        ...overrides,
    };
}

export function createInvalidProductPayload(): Record<string, unknown> {
    return {
        nombre: 123,
        precio: -5,
    };
}
