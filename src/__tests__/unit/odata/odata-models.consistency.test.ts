import { describe, it, expect } from "vitest";
import { odataModels } from "../../../common/service/odata/odata-models.js";
import { domainRegistrations } from "../../../core/main.js";

// DT1 (ciclo 14): si un dominio nuevo se registra en core/main.ts sin añadir
// su modelo a odata-models.ts (o viceversa), este test rompe el CI.
describe("consistencia odata-models ↔ domainRegistrations (DT1)", () => {
    it("todo modelo central tiene un dominio registrado (mismo nombre de clase)", () => {
        const registeredNames = new Set(
            domainRegistrations.map((r) => (r.model as { name?: string }).name),
        );
        for (const model of odataModels) {
            expect(
                registeredNames.has((model as { name: string }).name),
                `modelo '${(model as { name: string }).name}' falta en domainRegistrations (core/main.ts)`,
            ).toBe(true);
        }
    });

    it("todo dominio registrado tiene su modelo en odata-models.ts", () => {
        const modelNames = new Set(
            odataModels.map((m) => (m as { name: string }).name),
        );
        for (const reg of domainRegistrations) {
            expect(
                modelNames.has((reg.model as { name: string }).name),
                `dominio '${(reg.model as { name: string }).name}' falta en odata-models.ts`,
            ).toBe(true);
        }
    });
});
