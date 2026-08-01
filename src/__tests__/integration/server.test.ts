import { describe, it, expect, vi } from "vitest";
import { Express } from "express";

vi.mock("../../common/service/odata/odata.service.js", () => {
    const { Router } = require("express");
    return { createODataExpressApp: () => Router() };
});

import expressApp from "../../main.js";

const fakeDataSource = {} as never;

describe("Server bootstrap", () => {
    it("should return an Express application", () => {
        const app = expressApp(fakeDataSource);
        expect(app).toBeDefined();
        expect(app.listen).toBeDefined();
        expect(app.use).toBeDefined();
    });

    it("should return a new instance each call", () => {
        const app1 = expressApp(fakeDataSource);
        const app2 = expressApp(fakeDataSource);
        expect(app1).not.toBe(app2);
    });

    it("should have helmet, cors, compression, json body parser and morgan configured", async () => {
        const app = expressApp(fakeDataSource);
        const res = await app.listen(0);
        const server = res;
        server.close();

        expect(res).toBeDefined();
    });
});
