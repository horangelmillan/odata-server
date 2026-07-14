import { describe, it, expect, vi } from "vitest";
import request from "supertest";

vi.mock("../../common/service/odata/odata.service.js", () => {
    const { Router } = require("express");
    const router = Router();
    router.get("/products", (req: any, res: any) => {
        res.json({
            "@odata.context": "$metadata#products",
            value: [
                { id: 1, nombre: "Laptop", precio: 1500, categoria: "Electrónica" },
            ],
        });
    });
    router.get("/:path", (req: any, res: any) => {
        if (req.params.path === "$metadata") {
            res.set("Content-Type", "application/xml");
            res.send('<?xml version="1.0" encoding="utf-8"?><edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices/></edmx:Edmx>');
        } else {
            res.status(404).json({ error: "not found" });
        }
    });
    return { oDataExpressApp: router };
});

import expressApp from "../../main.js";

describe("OData endpoint", () => {
    it("should serve odata endpoint under /odata", async () => {
        const app = expressApp();
        const res = await request(app).get("/odata/products");

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("@odata.context");
        expect(res.body).toHaveProperty("value");
    });

    it("should include OData-Version header", async () => {
        const app = expressApp();
        const res = await request(app).get("/odata/products");

        expect(res.headers["odata-version"]).toBe("4.0");
    });

    it("should serve $metadata", async () => {
        const app = expressApp();
        const res = await request(app).get("/odata/$metadata");

        expect(res.status).toBe(200);
        expect(res.headers["content-type"]).toContain("xml");
    });

    it("should expose OData-Version header via CORS", async () => {
        const app = expressApp();
        const res = await request(app).options("/odata/products");

        const exposedHeaders = (res.headers["access-control-expose-headers"] || "").toLowerCase();
        expect(exposedHeaders).toContain("odata-version");
    });
});
