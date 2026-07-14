import { describe, it, expect, vi } from "vitest";
import request from "supertest";

vi.mock("../../common/service/odata/odata.service.js", () => {
    const { Router } = require("express");
    return { oDataExpressApp: Router() };
});

import expressApp from "../../main.js";

describe("Error handling", () => {
    it("should return 404 for unknown routes", async () => {
        const app = expressApp();
        const res = await request(app).get("/api/nonexistent");

        expect(res.status).toBe(404);
    });

    it("should return 404 for unknown nested routes", async () => {
        const app = expressApp();
        const res = await request(app).get("/api/core/nonexistent");

        expect(res.status).toBe(404);
    });
});
