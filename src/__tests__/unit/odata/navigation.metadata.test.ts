import { describe, it, expect } from "vitest";
import { dataSource } from "../../../common/service/odata/datasource.js";

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
