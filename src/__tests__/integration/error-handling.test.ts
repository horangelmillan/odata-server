import { describe, it, expect, vi } from "vitest";
import request from "supertest";

vi.mock("../../common/service/odata/odata.service.js", () => {
    const { Router } = require("express");
    return { oDataExpressApp: Router() };
});

import expressApp from "../../main.js";

describe("Error handling", () => {
    it("should return 404 for unknown OData routes", async () => {
        const app = expressApp();
        const res = await request(app).get("/odata/nonexistent");

        expect(res.status).toBe(404);
    });

    it("should return 404 for unknown nested OData routes", async () => {
        const app = expressApp();
        const res = await request(app).get("/odata/unknown-entity/nonexistent");

        expect(res.status).toBe(404);
    });

    it("F3: /api is not mounted — REST surface removed", async () => {
        const app = expressApp();
        const res = await request(app).get("/api/core/products");

        expect(res.status).toBe(404);
    });
});
