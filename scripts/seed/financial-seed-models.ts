import { DataTypes } from "sequelize";

// DT2 (ciclo 14): definiciones de columnas de las tablas financieras,
// extraídas de financial-seed.ts para poder verificar su consistencia contra
// los modelos de dominio (src/core/finance/<dominio>/model/*.odata.model.ts).
// El seed las consume vía seq.define; el test de consistencia compara las
// claves contra la metadata de los modelos OData, de modo que añadir una
// columna al modelo de dominio sin actualizarla aquí rompe el CI.

export interface SeedTableDef {
    tableName: string;
    /** nombre de columna -> definición Sequelize (DataTypes) */
    columns: Record<string, unknown>;
}

export const SEED_TABLES: SeedTableDef[] = [
    {
        tableName: "companies",
        columns: {
            id: { type: DataTypes.STRING, primaryKey: true },
            nombre: DataTypes.STRING,
            moneda: DataTypes.STRING,
            pais: DataTypes.STRING,
            createdAt: DataTypes.DATE,
            updatedAt: DataTypes.DATE,
        },
    },
    {
        tableName: "customers",
        columns: {
            id: { type: DataTypes.STRING, primaryKey: true },
            nombre: DataTypes.STRING,
            companyId: DataTypes.STRING,
            pais: DataTypes.STRING,
            createdAt: DataTypes.DATE,
            updatedAt: DataTypes.DATE,
        },
    },
    {
        tableName: "suppliers",
        columns: {
            id: { type: DataTypes.STRING, primaryKey: true },
            nombre: DataTypes.STRING,
            pais: DataTypes.STRING,
            createdAt: DataTypes.DATE,
            updatedAt: DataTypes.DATE,
        },
    },
    {
        tableName: "glaccounts",
        columns: {
            id: { type: DataTypes.STRING, primaryKey: true },
            nombre: DataTypes.STRING,
            createdAt: DataTypes.DATE,
            updatedAt: DataTypes.DATE,
        },
    },
    {
        tableName: "invoices",
        columns: {
            id: { type: DataTypes.STRING, primaryKey: true },
            companyId: DataTypes.STRING,
            customerId: DataTypes.STRING,
            fecha: DataTypes.DATE,
            dueDate: DataTypes.DATE,
            importe: DataTypes.DECIMAL,
            netAmount: DataTypes.DECIMAL,
            taxAmount: DataTypes.DECIMAL,
            grossAmount: DataTypes.DECIMAL,
            docNumber: DataTypes.STRING,
            moneda: DataTypes.STRING,
            estado: DataTypes.STRING,
            createdAt: DataTypes.DATE,
            updatedAt: DataTypes.DATE,
        },
    },
    {
        tableName: "supplierinvoices",
        columns: {
            id: { type: DataTypes.STRING, primaryKey: true },
            supplierId: DataTypes.STRING,
            fecha: DataTypes.DATE,
            dueDate: DataTypes.DATE,
            importe: DataTypes.DECIMAL,
            netAmount: DataTypes.DECIMAL,
            taxAmount: DataTypes.DECIMAL,
            grossAmount: DataTypes.DECIMAL,
            docNumber: DataTypes.STRING,
            moneda: DataTypes.STRING,
            estado: DataTypes.STRING,
            createdAt: DataTypes.DATE,
            updatedAt: DataTypes.DATE,
        },
    },
    {
        tableName: "invoiceitems",
        columns: {
            id: { type: DataTypes.STRING, primaryKey: true },
            invoiceId: DataTypes.STRING,
            glAccountId: DataTypes.STRING,
            material: DataTypes.STRING,
            cantidad: DataTypes.INTEGER,
            importe: DataTypes.DECIMAL,
            createdAt: DataTypes.DATE,
            updatedAt: DataTypes.DATE,
        },
    },
    {
        tableName: "payments",
        columns: {
            id: { type: DataTypes.STRING, primaryKey: true },
            invoiceId: DataTypes.STRING,
            fecha: DataTypes.DATE,
            importe: DataTypes.DECIMAL,
            metodo: DataTypes.STRING,
            createdAt: DataTypes.DATE,
            updatedAt: DataTypes.DATE,
        },
    },
    {
        tableName: "supplierinvoiceitems",
        columns: {
            id: { type: DataTypes.STRING, primaryKey: true },
            supplierInvoiceId: DataTypes.STRING,
            glAccountId: DataTypes.STRING,
            material: DataTypes.STRING,
            cantidad: DataTypes.INTEGER,
            importe: DataTypes.DECIMAL,
            createdAt: DataTypes.DATE,
            updatedAt: DataTypes.DATE,
        },
    },
    {
        tableName: "supplierpayments",
        columns: {
            id: { type: DataTypes.STRING, primaryKey: true },
            supplierInvoiceId: DataTypes.STRING,
            fecha: DataTypes.DATE,
            importe: DataTypes.DECIMAL,
            metodo: DataTypes.STRING,
            createdAt: DataTypes.DATE,
            updatedAt: DataTypes.DATE,
        },
    },
];
