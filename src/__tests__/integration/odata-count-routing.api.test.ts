import { describe, it, expect, vi } from "vitest";
import express from "express";
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
    if (expr.type === "field") return (row as any)[expr.field.name];
    if (expr.type === "literal") return expr.value;
    throw new Error(`Unsupported expression type: ${expr.type}`);
}
function evalFilter(node: FilterNode, row: Record<string, any>): boolean {
    if ("logicalOperator" in node) {
        return node.logicalOperator === "and"
            ? node.conditions.every((c) => evalFilter(c, row))
            : node.conditions.some((c) => evalFilter(c, row));
    }
    const left = evalExpr(node.leftExpression, row);
    const right = evalExpr(node.rightExpression, row);
    switch (node.operator) {
        case "gt": return left > right;
        case "ge": return left >= right;
        case "lt": return left < right;
        case "le": return left <= right;
        case "eq": return left === right;
        case "ne": return left !== right;
        default: throw new Error(`Unsupported operator: ${node.operator}`);
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

import { oDataExpressApp } from "../../common/service/odata/odata.service.js";

describe("OData /$count routing end-to-end (real oDataExpressApp)", () => {
    const app = () => {
        const a = express();
        a.use("/odata", oDataExpressApp);
        return a;
    };

    it("matches /$count (Fase B) and returns the plain total count", async () => {
        const res = await request(app()).get("/odata/demo/product-odata/$count");
        expect(res.status).toBe(200);
        expect(res.headers["content-type"]).toContain("text/plain");
        expect(res.text).toBe("3");
    });

    it("matches /$count?$filter=... and applies the filter to the count", async () => {
        const res = await request(app()).get(
            "/odata/demo/product-odata/$count?$filter=precio gt 100",
        );
        expect(res.status).toBe(200);
        expect(res.text).toBe("2");
    });

    it("matches /$count with an encoded query (?%24filter=...%26$top=1)", async () => {
        const res = await request(app()).get(
            "/odata/demo/product-odata/$count?%24filter=precio%20gt%20100%26%24top=1%26%24skip=1",
        );
        expect(res.status).toBe(200);
        expect(res.text).toBe("2");
    });

    it("does NOT treat $count as a key (precedence over /:id)", async () => {
        const res = await request(app()).get("/odata/demo/product-odata/$count");
        expect(res.status).toBe(200);
        expect(res.text).toBe("3");
    });
});
