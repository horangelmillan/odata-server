import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import expressApp from "../../main.js";
import { db } from "../../common/service/ORM/sequelize.service.js";
import { ProductModel } from "../../core/product/model/product.model.js";
import { CategoryModel } from "../../core/category/model/category.model.js";

async function dbReady(): Promise<boolean> {
    try {
        await db.authenticate();
        return true;
    } catch {
        return false;
    }
}

// Top-level await: detecta Postgres (docker) en tiempo de recolección para
// poder saltar el suite de integración de forma determinista cuando no hay BD.
const dbAvailable = await dbReady();

// Regresión del pendiente (1) de Sesión 7: el $Endpoint del $metadata debe
// coincidir con la ruta kebab registrada por el router parcheado. No requiere BD.
describe("OData $metadata: naming kebab coherente con la ruta (Fase E)", () => {
    const app = expressApp();

    it("emite $Endpoint en kebab-case igual a la ruta registrada", async () => {
        const res = await request(app).get("/odata/$metadata");

        expect(res.status).toBe(200);
        const meta = res.body as Record<string, any>;
        expect(meta.entities.ProductOData.$Endpoint).toBe("/product-odata");
        expect(meta.entities.CategoryOData.$Endpoint).toBe("/category-odata");
    });
});

describe.skipIf(!dbAvailable)("OData $expand contra Postgres (Fase E)", () => {
    const app = expressApp();

    beforeAll(async () => {
        await db.sync({ alter: true });
        await CategoryModel.destroy({ where: {} });
        await ProductModel.destroy({ where: {} });

        const electronics = await CategoryModel.create({ nombre: "Electrónica" });
        await ProductModel.create({ nombre: "Laptop", precio: 1500, categoria: "Electrónica", categoriaId: electronics.id });
        await ProductModel.create({ nombre: "Mouse", precio: 25, categoria: "Electrónica", categoriaId: electronics.id });
        await ProductModel.create({ nombre: "Teclado", precio: 40, categoria: "Electrónica", categoriaId: electronics.id });
    });

    afterAll(async () => {
        await db.close();
    });

    it("product?$expand=category anida la categoría en cada producto", async () => {
        const res = await request(app).get("/odata/product-odata?$expand=category");

        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        expect(Array.isArray(value)).toBe(true);
        expect(value.length).toBeGreaterThan(0);

        for (const product of value) {
            expect(product).toHaveProperty("category");
            expect(product.category).toHaveProperty("id");
            expect(product.category).toHaveProperty("nombre");
            expect(product.categoriaId).toBe(product.category.id);
        }
    });

    it("category?$expand=products anida la colección de productos", async () => {
        const res = await request(app).get("/odata/category-odata?$expand=products");

        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        expect(Array.isArray(value)).toBe(true);
        expect(value.length).toBeGreaterThan(0);

        for (const category of value) {
            expect(category).toHaveProperty("products");
            expect(Array.isArray(category.products)).toBe(true);
            expect(category.products.length).toBeGreaterThan(0);
            for (const product of category.products) {
                expect(product.categoriaId).toBe(category.id);
            }
        }
    });

    it("product?$expand=category&$count=true devuelve @odata.count y la expansión", async () => {
        const res = await request(app).get("/odata/product-odata?$expand=category&$count=true");

        expect(res.status).toBe(200);
        const body = res.body as Record<string, any>;
        expect(body["@odata.count"]).toBeGreaterThan(0);
        expect(Array.isArray(body.value)).toBe(true);
        expect(body.value[0]).toHaveProperty("category");
        expect(body.value[0].category).toHaveProperty("id");
    });
});
