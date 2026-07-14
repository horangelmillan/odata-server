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
    if (expr.type === "field") return (row as any)[expr.field.name];
    if (expr.type === "literal") return expr.value;
    throw new Error(`Unsupported expression type: ${expr.type}`);
}

function evalFilter(node: FilterNode, row: Record<string, any>): boolean {
    if ("logicalOperator" in node) {
        if (node.logicalOperator === "and") return node.conditions.every((c) => evalFilter(c, row));
        return node.conditions.some((c) => evalFilter(c, row));
    }
    const left = evalExpr(node.leftExpression, row);
    const right = evalExpr(node.rightExpression, row);
    switch (node.operator) {
        case "gt":
            return Number(left) > Number(right);
        case "ge":
            return Number(left) >= Number(right);
        case "lt":
            return Number(left) < Number(right);
        case "le":
            return Number(left) <= Number(right);
        case "eq":
            return left == right;
        case "ne":
            return left != right;
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

const BATCH_BOUNDARY = "batch_test";
const CHANGESET_BOUNDARY = "changeset_test";

function requestPart(url: string): string {
    return [
        "Content-Type: application/http",
        "Content-Transfer-Encoding: binary",
        "",
        `GET ${url} HTTP/1.1`,
        "Accept: application/json",
        "",
        "",
    ].join("\r\n");
}

function changesetPart(innerBody: string): string {
    return [
        `Content-Type: multipart/mixed; boundary=${CHANGESET_BOUNDARY}`,
        "Content-Transfer-Encoding: binary",
        "",
        innerBody,
        "",
    ].join("\r\n");
}

function buildBatch(blocks: string[], boundary: string = BATCH_BOUNDARY): string {
    const separator = `--${boundary}\r\n`;
    return blocks.map((block) => separator + block).join("") + `--${boundary}--\r\n`;
}

function buildChangeset(innerBlocks: string[], boundary: string = CHANGESET_BOUNDARY): string {
    const separator = `--${boundary}\r\n`;
    return innerBlocks.map((block) => separator + block).join("") + `--${boundary}--\r\n`;
}

function postBatch(body: string, boundary: string = BATCH_BOUNDARY) {
    return request(expressApp())
        .post("/odata/$batch")
        .set("Content-Type", `multipart/mixed; boundary=${boundary}`)
        .buffer(true)
        .parse((res: any, callback: (err: any, data?: string) => void) => {
            let data = "";
            res.on("data", (chunk: Buffer) => {
                data += chunk.toString("utf-8");
            });
            res.on("end", () => callback(null, data));
        })
        .send(body);
}

describe("OData SAPUI5 compat — Fase C.2 ($batch)", () => {
    describe("POST /odata/$batch — single GET request", () => {
        it("returns a multipart/mixed response with the entity collection", async () => {
            const res = await postBatch(buildBatch([requestPart("/product-odata")]));

            expect(res.status).toBe(200);
            expect(res.headers["content-type"]).toContain("multipart/mixed");
            expect(res.body).toContain("HTTP/1.1 200 OK");
            expect(res.body).toContain(`--${BATCH_BOUNDARY}`);
            expect(res.body).toContain(`"id":1`);
        });

        it("applies $filter from the batched request", async () => {
            const res = await postBatch(buildBatch([requestPart("/product-odata?$filter=precio%20gt%20100")]));

            expect(res.status).toBe(200);
            expect(res.body).toContain(`"id":1`);
            expect(res.body).toContain(`"id":3`);
            expect(res.body).not.toContain(`"id":2`);
        });

        it("supports key-access syntax inside the batch", async () => {
            const res = await postBatch(buildBatch([requestPart("/product-odata(1)")]));

            expect(res.status).toBe(200);
            expect(res.body).toContain(`"id":1`);
            expect(res.body).not.toContain(`"id":2`);
        });
    });

    describe("POST /odata/$batch — changeset with nested GET", () => {
        it("returns a nested multipart/mixed response", async () => {
            const inner = buildChangeset([requestPart("/product-odata(2)")]);
            const res = await postBatch(buildBatch([changesetPart(inner)]));

            expect(res.status).toBe(200);
            expect(res.headers["content-type"]).toContain("multipart/mixed");
            expect(res.body).toContain(`boundary=${CHANGESET_BOUNDARY}`);
            expect(res.body).toContain("HTTP/1.1 200 OK");
            expect(res.body).toContain(`"id":2`);
        });
    });

    describe("POST /odata/$batch — error handling", () => {
        it("responds 404 for an unknown entity set", async () => {
            const res = await postBatch(buildBatch([requestPart("/does-not-exist")]));

            expect(res.status).toBe(200);
            expect(res.body).toContain("404 Not Found");
        });

        it("responds 405 for non-GET methods inside the batch", async () => {
            const part = [
                "Content-Type: application/http",
                "Content-Transfer-Encoding: binary",
                "",
                "POST /product-odata HTTP/1.1",
                "Accept: application/json",
                "",
                "",
            ].join("\r\n");
            const res = await postBatch(buildBatch([part]));

            expect(res.status).toBe(200);
            expect(res.body).toContain("405 Method Not Allowed");
        });

        it("rejects an invalid Content-Type with 400", async () => {
            const res = await request(expressApp())
                .post("/odata/$batch")
                .set("Content-Type", "application/json")
                .send("{}");

            expect(res.status).toBe(400);
        });
    });
});
