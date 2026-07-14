import { describe, it, expect, vi } from "vitest";
import request from "supertest";

const mockProducts = [
    { id: 1, nombre: "Laptop", precio: 1500, categoria: "Electrónica" },
    { id: 2, nombre: "Mouse", precio: 50, categoria: "Periféricos" },
    { id: 3, nombre: "Monitor", precio: 300, categoria: "Electrónica" },
];

type FilterNode =
    | { logicalOperator: "and" | "or"; conditions: FilterNode[] }
    | { leftExpression: any; operator: string; rightExpression: any };

function evalExpr(expr: any, row: Record<string, any>): any {
    if (expr.type === "field") {
        return (row as any)[expr.field.name];
    }
    if (expr.type === "literal") {
        return expr.value;
    }
    throw new Error(`Unsupported expression type: ${expr.type}`);
}

function evalFilter(node: FilterNode, row: Record<string, any>): boolean {
    if ("logicalOperator" in node) {
        if (node.logicalOperator === "and") {
            return node.conditions.every((c) => evalFilter(c, row));
        }
        return node.conditions.some((c) => evalFilter(c, row));
    }
    const left = evalExpr(node.leftExpression, row);
    const right = evalExpr(node.rightExpression, row);
    switch (node.operator) {
        case "gt":
            return left > right;
        case "ge":
            return left >= right;
        case "lt":
            return left < right;
        case "le":
            return left <= right;
        case "eq":
            return left === right;
        case "ne":
            return left !== right;
        default:
            throw new Error(`Unsupported operator: ${node.operator}`);
    }
}

function fakeExecute(query: any) {
    const params = query.getParams();
    const filtered = params.filter
        ? mockProducts.filter((p) => evalFilter(params.filter as FilterNode, p))
        : mockProducts.slice();
    const total = filtered.length;
    let data = filtered;
    if (params.skip) data = data.slice(params.skip);
    if (params.top) data = data.slice(0, params.top);
    const response: Record<string, any> = { value: data, meta: { totalExecutionTime: 0 } };
    if (params.count) response["@odata.count"] = total;
    return Promise.resolve(response);
}

vi.mock("../../common/service/odata/datasource.js", () => ({
    dataSource: {
        getMetadata: vi.fn(() => ({})),
        execute: vi.fn((query: any) => fakeExecute(query)),
    },
}));

import expressApp from "../../main.js";

describe("OData SAPUI5 compat — Fase A (key access) y Fase B ($count)", () => {
    const app = () => expressApp();

    describe("GET /odata/product-odata/$count", () => {
        it("returns the plain total count (text/plain, no $filter)", async () => {
            const res = await request(app()).get("/odata/product-odata/$count");

            expect(res.status).toBe(200);
            expect(res.headers["content-type"]).toContain("text/plain");
            expect(res.text).toBe("3");
        });

        it("applies $filter and returns the filtered count", async () => {
            const res = await request(app()).get(
                "/odata/product-odata/$count?$filter=precio gt 100",
            );

            expect(res.status).toBe(200);
            expect(res.headers["content-type"]).toContain("text/plain");
            expect(res.text).toBe("2");
        });

        it("returns 0 when $filter matches nothing", async () => {
            const res = await request(app()).get(
                "/odata/product-odata/$count?$filter=precio gt 9999",
            );

            expect(res.status).toBe(200);
            expect(res.text).toBe("0");
        });

        it("ignores $top/$skip so the count is never paginated", async () => {
            const res = await request(app()).get(
                "/odata/product-odata/$count?$filter=precio gt 100&$top=1&$skip=1",
            );

            expect(res.status).toBe(200);
            expect(res.text).toBe("2");
        });

        it("decodes a percent-encoded query string (curl/CMD scenario with %26/%20)", async () => {
            const res = await request(app()).get(
                "/odata/product-odata/$count?%24filter=precio%20gt%20100%26%24top=1%26%24skip=1",
            );

            expect(res.status).toBe(200);
            expect(res.text).toBe("2");
        });
    });

    describe("GET /odata/product-odata/:id (Fase A)", () => {
        it("returns the entity matching the key", async () => {
            const res = await request(app()).get("/odata/product-odata/2");

            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({ id: 2, nombre: "Mouse", precio: 50 });
        });

        it("returns 404 for an unknown key", async () => {
            const res = await request(app()).get("/odata/product-odata/999");

            expect(res.status).toBe(404);
        });

        it("does not treat $count as a key (precedence check)", async () => {
            const res = await request(app()).get("/odata/product-odata/$count");

            expect(res.status).toBe(200);
            expect(res.text).toBe("3");
        });
    });

    describe("GET /odata/product-odata (collection)", () => {
        it("returns the full collection with @odata.count when $count=true", async () => {
            const res = await request(app()).get(
                "/odata/product-odata?$filter=precio gt 100&$count=true",
            );

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("@odata.count", 2);
            expect(res.body.value).toHaveLength(2);
        });
    });
});
