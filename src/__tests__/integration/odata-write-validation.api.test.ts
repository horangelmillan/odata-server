import { describe, it, expect } from "vitest";
import request from "supertest";

// La validación DTO de escritura directa vive en `odata-write.routes.ts` y ocurre
// ANTES de tocar la BD, así que este test no necesita Postgres: el `dataSource`
// sólo define los modelos Sequelize (sin conexión) al importar la app.
// Ver docs/05-refactor-odata-as-domain/fases/f1-*.md §2.6.
import expressApp from "../../main.js";

describe("OData escritura directa: validación DTO (F1)", () => {
    const app = () => expressApp();

    it("POST /odata/product-odata con body inválido -> 400 OData v4", async () => {
        // Faltan `nombre` y `categoria`; `precio` es negativo e inválido.
        const res = await request(app())
            .post("/odata/product-odata")
            .send({ precio: -5 });

        expect(res.status).toBe(400);
        expect(res.body.error).toBeDefined();
        expect(res.body.error.code).toBe("400");
        expect(typeof res.body.error.message).toBe("string");
    });

    it("POST /odata/product-odata con campo extra no permitido -> 400 OData v4", async () => {
        const res = await request(app())
            .post("/odata/product-odata")
            .send({
                nombre: "Test",
                precio: 100,
                categoria: "Test",
                extraField: "not-allowed",
            });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("400");
    });

    it("PATCH /odata/product-odata/:id con body inválido -> 400 OData v4", async () => {
        const res = await request(app())
            .patch("/odata/product-odata/1")
            .send({ precio: "not-a-number" });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("400");
    });
});
