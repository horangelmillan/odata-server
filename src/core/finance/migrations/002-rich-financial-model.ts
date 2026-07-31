import type { QueryInterface } from "sequelize";
import { DataTypes } from "sequelize";

// IF01 (ciclo 11): modelo financiero rico según f2.5/f2.6 original.
// Campos aditivos: docNumber, dueDate, netAmount, taxAmount, grossAmount.
// Los campos legacy (fecha, importe, moneda, estado) se conservan para no
// romper compatibilidad con clientes existentes; importe = grossAmount.
export async function up({ context: qi }: { context: QueryInterface }): Promise<void> {
    await qi.addColumn("invoices", "docNumber", { type: DataTypes.STRING, allowNull: true });
    await qi.addColumn("invoices", "dueDate", { type: DataTypes.DATE, allowNull: true });
    await qi.addColumn("invoices", "netAmount", { type: DataTypes.DECIMAL, allowNull: true });
    await qi.addColumn("invoices", "taxAmount", { type: DataTypes.DECIMAL, allowNull: true });
    await qi.addColumn("invoices", "grossAmount", { type: DataTypes.DECIMAL, allowNull: true });

    await qi.addColumn("supplierinvoices", "docNumber", { type: DataTypes.STRING, allowNull: true });
    await qi.addColumn("supplierinvoices", "dueDate", { type: DataTypes.DATE, allowNull: true });
    await qi.addColumn("supplierinvoices", "netAmount", { type: DataTypes.DECIMAL, allowNull: true });
    await qi.addColumn("supplierinvoices", "taxAmount", { type: DataTypes.DECIMAL, allowNull: true });
    await qi.addColumn("supplierinvoices", "grossAmount", { type: DataTypes.DECIMAL, allowNull: true });
}

export async function down({ context: qi }: { context: QueryInterface }): Promise<void> {
    await qi.removeColumn("supplierinvoices", "grossAmount");
    await qi.removeColumn("supplierinvoices", "taxAmount");
    await qi.removeColumn("supplierinvoices", "netAmount");
    await qi.removeColumn("supplierinvoices", "dueDate");
    await qi.removeColumn("supplierinvoices", "docNumber");

    await qi.removeColumn("invoices", "grossAmount");
    await qi.removeColumn("invoices", "taxAmount");
    await qi.removeColumn("invoices", "netAmount");
    await qi.removeColumn("invoices", "dueDate");
    await qi.removeColumn("invoices", "docNumber");
}
