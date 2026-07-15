import { describe, it, expect } from "vitest";
import { dataSource } from "../../../common/service/odata/datasource.js";

// Regresión de Fase G: el recorte de navegación es puramente a nivel de query
// (buildInclude sobre el include de Sequelize). El CSDL del $metadata NO debe
// cambiar: las NavigationProperty siguen expuestas y no aparecen opciones de
// recorte en el documento de metadata. No requiere BD.
describe("OData navigation metadata: recorte no altera el CSDL (Fase G)", () => {
    const metadata = dataSource.getMetadata([], "/odata") as any;

    it("mantiene NavigationProperty 'products' (colección) en CategoryOData", () => {
        const nav = metadata.entities.CategoryOData.products;
        expect(nav.$Kind).toBe("NavigationProperty");
        expect(nav.$Type).toBe("Collection(ProductOData)");
    });

    it("mantiene NavigationProperty 'category' en ProductOData", () => {
        const nav = metadata.entities.ProductOData.category;
        expect(nav.$Kind).toBe("NavigationProperty");
        expect(nav.$Type).toBe("CategoryOData");
    });
});
