import { describe, it, expect } from "vitest";
import { createDataSource } from "../../../common/service/odata/datasource.js";
import { domainRegistrations } from "../../../core/main.js";

// RF1 (ciclo 16, F1): el datasource se compone desde los registros de dominio
// (sin BD: getMetadata es puramente de metadata).
const dataSource = createDataSource(domainRegistrations.map((r) => r.model));

describe("OData navigation metadata (Fase D)", () => {
    const metadata = dataSource.getMetadata([], "/odata") as any;

    it("registers 'category' NavigationProperty on ProductOData", () => {
        const nav = metadata.entities.ProductOData.category;
        expect(nav.$Kind).toBe("NavigationProperty");
        expect(nav.$Type).toBe("CategoryOData");
        expect(nav.$ReferentialConstraint).toEqual({ categoriaId: "CategoryOData/id" });
    });

    it("registers 'products' NavigationProperty (collection) on CategoryOData", () => {
        const nav = metadata.entities.CategoryOData.products;
        expect(nav.$Kind).toBe("NavigationProperty");
        expect(nav.$Type).toBe("Collection(ProductOData)");
    });
});
