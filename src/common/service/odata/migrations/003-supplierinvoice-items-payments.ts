import type { QueryInterface } from "sequelize";
import { DataTypes } from "sequelize";

// DAP2 (ciclo 14): simetría estructural de supplierinvoice con invoice —
// items y pagos de proveedor. Dos tablas nuevas dedicadas (FK claras,
// fiel a S/4HANA: F-53 pagos de proveedor vs F-28 pagos de cliente).
export async function up({ context: qi }: { context: QueryInterface }): Promise<void> {
    await qi.createTable("supplierinvoiceitems", {
        id: { type: DataTypes.STRING, primaryKey: true },
        supplierInvoiceId: { type: DataTypes.STRING, allowNull: false },
        glAccountId: { type: DataTypes.STRING, allowNull: false },
        material: { type: DataTypes.STRING, allowNull: false },
        cantidad: { type: DataTypes.INTEGER, allowNull: false },
        importe: { type: DataTypes.DECIMAL, allowNull: false },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
    });

    await qi.createTable("supplierpayments", {
        id: { type: DataTypes.STRING, primaryKey: true },
        supplierInvoiceId: { type: DataTypes.STRING, allowNull: false },
        fecha: { type: DataTypes.DATE, allowNull: false },
        importe: { type: DataTypes.DECIMAL, allowNull: false },
        metodo: { type: DataTypes.STRING, allowNull: false },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
    });
}

export async function down({ context: qi }: { context: QueryInterface }): Promise<void> {
    await qi.dropTable("supplierpayments");
    await qi.dropTable("supplierinvoiceitems");
}
