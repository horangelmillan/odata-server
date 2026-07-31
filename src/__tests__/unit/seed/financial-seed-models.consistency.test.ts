import { describe, it, expect } from "vitest";
import { SEED_TABLES } from "../../../../scripts/seed/financial-seed-models.js";
import { odataModels } from "../../../common/service/odata/odata-models.js";

// DT2 (ciclo 14): las definiciones de columnas del seed (financial-seed-models.ts)
// deben coincidir con las de los modelos de dominio. Si se añade una columna a un
// modelo OData sin actualizar el seed (o viceversa), este test rompe el CI.
describe("consistencia seed ↔ modelos de dominio (DT2)", () => {
    it("toda tabla del seed tiene un modelo OData con el mismo nombre de tabla", () => {
        const modelByTable = new Map(
            odataModels.map((m) => {
                const meta = (m as { getMetadata?: () => { tableMetadata: { tableIdentifier: string } } }).getMetadata?.();
                return [meta?.tableMetadata.tableIdentifier, m];
            }),
        );
        for (const table of SEED_TABLES) {
            expect(
                modelByTable.has(table.tableName),
                `tabla '${table.tableName}' del seed sin modelo OData correspondiente`,
            ).toBe(true);
        }
    });

    it("las columnas del seed coinciden con las del modelo OData (ambas direcciones)", () => {
        for (const table of SEED_TABLES) {
            const model = odataModels.find((m) => {
                const meta = (m as { getMetadata?: () => { tableMetadata: { tableIdentifier: string } } }).getMetadata?.();
                return meta?.tableMetadata.tableIdentifier === table.tableName;
            });
            expect(model, `modelo para '${table.tableName}' no encontrado`).toBeTruthy();

            const meta = (model as { getMetadata: () => { columnMetadata: { propertyKey: string }[] } }).getMetadata();
            const domainColumns = new Set(meta.columnMetadata.map((c) => c.propertyKey));
            const seedColumns = new Set(Object.keys(table.columns));

            for (const col of seedColumns) {
                expect(
                    domainColumns.has(col),
                    `columna '${col}' del seed sin equivalente en el modelo '${table.tableName}'`,
                ).toBe(true);
            }
            for (const col of domainColumns) {
                expect(
                    seedColumns.has(col),
                    `columna '${col}' del modelo '${table.tableName}' sin equivalente en el seed`,
                ).toBe(true);
            }
        }
    });
});
