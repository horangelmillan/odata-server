import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { domainRegistrations } from "../../../core/main.js";

// RF1 (ciclo 16, F1): odata-models.ts fue eliminado; los modelos viven en cada
// registro de dominio y el bootstrap los compone. Este archivo reemplaza al
// antiguo `odata-models.consistency.test.ts` (DT1 del ciclo 14) con:
//   1) invariantes de domainRegistrations (nombres/tablas/endpoints únicos),
//   2) test estructural: NINGÚN archivo de `src/common` importa `src/core`.

const commonRoot = resolve(fileURLToPath(new URL("../../../common/", import.meta.url)));
const coreRoot = resolve(fileURLToPath(new URL("../../../core/", import.meta.url)));

function listTsFiles(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
        const full = resolve(dir, entry);
        if (statSync(full).isDirectory()) {
            out.push(...listTsFiles(full));
        } else if (entry.endsWith(".ts")) {
            out.push(full);
        }
    }
    return out;
}

const IMPORT_RE = /(?:from|import)\s*["']([^"']+)["']|require\(\s*["']([^"']+)["']\s*\)/g;

function coreImportsIn(file: string): string[] {
    const content = readFileSync(file, "utf8");
    const violations: string[] = [];
    for (const match of content.matchAll(IMPORT_RE)) {
        const spec = match[1] ?? match[2];
        if (!spec || !spec.startsWith(".")) continue;
        const resolved = resolve(dirname(file), spec);
        if (resolved === coreRoot || resolved.startsWith(coreRoot + sep)) {
            violations.push(`${file.replace(commonRoot + sep, "common/")} -> ${spec}`);
        }
    }
    return violations;
}

describe("estructura modular (RF1, ciclo 16): common no importa core", () => {
    it("ningún archivo de src/common importa src/core", () => {
        const violations: string[] = [];
        for (const file of listTsFiles(commonRoot)) {
            violations.push(...coreImportsIn(file));
        }
        expect(violations, violations.join("\n")).toHaveLength(0);
    });
});

describe("invariantes de domainRegistrations (RF1, ciclo 16)", () => {
    it("los nombres de clase de los modelos son únicos", () => {
        const names = domainRegistrations.map((r) => (r.model as { name?: string }).name);
        expect(new Set(names).size).toBe(names.length);
    });

    it("los tableIdentifiers son únicos", () => {
        const tables = domainRegistrations.map((r) =>
            (r.model as { getMetadata?: () => { tableMetadata: { tableIdentifier: string } } })
                .getMetadata?.().tableMetadata.tableIdentifier,
        );
        expect(new Set(tables).size).toBe(tables.length);
    });

    it("los endpoints de los controladores son únicos", () => {
        const endpoints = domainRegistrations.map((r) => r.controller.getEndpoint());
        expect(new Set(endpoints).size).toBe(endpoints.length);
    });

    it("todo writeService presente expone create/update como funciones", () => {
        for (const reg of domainRegistrations) {
            if (!reg.writeService) continue;
            expect(typeof reg.writeService.create, `create de ${reg.controller.getBaseModel().getModelName()}`).toBe("function");
            expect(typeof reg.writeService.update, `update de ${reg.controller.getBaseModel().getModelName()}`).toBe("function");
        }
    });
});
