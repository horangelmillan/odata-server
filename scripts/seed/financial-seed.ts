import "reflect-metadata";
import { config } from "dotenv";
import { Sequelize, DataTypes } from "sequelize";
import { generateFinancialData, validateSeedData, REFERENCE_DATE, type SeedData } from "./financial-seed-data.js";

config();

const dbConfig = {
    dialect: "postgres" as const,
    host: process.env.DEV_HOST || "localhost",
    port: Number(process.env.DEV_PORT) || 5432,
    username: process.env.DEV_USERNAME || "postgres",
    password: process.env.DEV_PASSWORD || "secret",
    database: process.env.DEV_DB || "odata_dev",
};

async function main() {
    const args = process.argv.slice(2);
    const reset = args.includes("--reset");

    // 1. Generar y validar ANTES de tocar la BD (fail fast: no se vacía si el dataset es inválido).
    const data: SeedData = generateFinancialData();
    const violations = validateSeedData(data);
    if (violations.length > 0) {
        console.error(`Seed data inválido (${violations.length} violaciones de invariantes):`);
        for (const v of violations.slice(0, 20)) console.error(`  - ${v}`);
        process.exit(1);
    }

    const seq = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
        host: dbConfig.host,
        port: dbConfig.port,
        dialect: dbConfig.dialect,
        logging: false,
    });

    await seq.authenticate();
    console.log("Connected to database.");

    // Fuente de verdad de columnas: src/core/finance/<dominio>/model/*.odata.model.ts.
    // Estas definiciones locales deben mantenerse alineadas con los modelos de dominio
    // (el seed es standalone: no importa el dataSource de la app).
    const Company = seq.define("companies", {
        id: { type: DataTypes.STRING, primaryKey: true },
        nombre: DataTypes.STRING,
        moneda: DataTypes.STRING,
        pais: DataTypes.STRING,
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
    }, { tableName: "companies", timestamps: true });

    const Customer = seq.define("customers", {
        id: { type: DataTypes.STRING, primaryKey: true },
        nombre: DataTypes.STRING,
        companyId: DataTypes.STRING,
        pais: DataTypes.STRING,
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
    }, { tableName: "customers", timestamps: true });

    const Supplier = seq.define("suppliers", {
        id: { type: DataTypes.STRING, primaryKey: true },
        nombre: DataTypes.STRING,
        pais: DataTypes.STRING,
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
    }, { tableName: "suppliers", timestamps: true });

    const GlAccount = seq.define("glaccounts", {
        id: { type: DataTypes.STRING, primaryKey: true },
        nombre: DataTypes.STRING,
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
    }, { tableName: "glaccounts", timestamps: true });

    const Invoice = seq.define("invoices", {
        id: { type: DataTypes.STRING, primaryKey: true },
        companyId: DataTypes.STRING,
        customerId: DataTypes.STRING,
        fecha: DataTypes.DATE,
        importe: DataTypes.DECIMAL,
        moneda: DataTypes.STRING,
        estado: DataTypes.STRING,
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
    }, { tableName: "invoices", timestamps: true });

    const SupplierInvoice = seq.define("supplierinvoices", {
        id: { type: DataTypes.STRING, primaryKey: true },
        supplierId: DataTypes.STRING,
        fecha: DataTypes.DATE,
        importe: DataTypes.DECIMAL,
        moneda: DataTypes.STRING,
        estado: DataTypes.STRING,
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
    }, { tableName: "supplierinvoices", timestamps: true });

    const InvoiceItem = seq.define("invoiceitems", {
        id: { type: DataTypes.STRING, primaryKey: true },
        invoiceId: DataTypes.STRING,
        glAccountId: DataTypes.STRING,
        material: DataTypes.STRING,
        cantidad: DataTypes.INTEGER,
        importe: DataTypes.DECIMAL,
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
    }, { tableName: "invoiceitems", timestamps: true });

    const Payment = seq.define("payments", {
        id: { type: DataTypes.STRING, primaryKey: true },
        invoiceId: DataTypes.STRING,
        fecha: DataTypes.DATE,
        importe: DataTypes.DECIMAL,
        metodo: DataTypes.STRING,
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
    }, { tableName: "payments", timestamps: true });

    if (reset) {
        console.log("Dropping and re-creating tables...");
        await seq.sync({ force: true });
    }

    console.log("Clearing existing data...");
    for (const model of [Payment, InvoiceItem, Invoice, SupplierInvoice, Customer, Supplier, GlAccount, Company]) {
        await model.destroy({ where: {}, truncate: true, cascade: true });
    }

    console.log(`Seeding financial data (referencia temporal: ${REFERENCE_DATE})...`);
    await Company.bulkCreate(data.companies);
    await Customer.bulkCreate(data.customers);
    await Supplier.bulkCreate(data.suppliers);
    await GlAccount.bulkCreate(data.glAccounts);
    await Invoice.bulkCreate(data.invoices);
    await SupplierInvoice.bulkCreate(data.supplierInvoices);
    await InvoiceItem.bulkCreate(data.invoiceItems);
    await Payment.bulkCreate(data.payments);

    // 2. Verificación post-inserción: los conteos en BD deben coincidir con lo generado.
    const counts = {
        companies: await Company.count(),
        customers: await Customer.count(),
        suppliers: await Supplier.count(),
        glaccounts: await GlAccount.count(),
        invoices: await Invoice.count(),
        supplierinvoices: await SupplierInvoice.count(),
        invoiceitems: await InvoiceItem.count(),
        payments: await Payment.count(),
    };
    const expected = {
        companies: data.companies.length,
        customers: data.customers.length,
        suppliers: data.suppliers.length,
        glaccounts: data.glAccounts.length,
        invoices: data.invoices.length,
        supplierinvoices: data.supplierInvoices.length,
        invoiceitems: data.invoiceItems.length,
        payments: data.payments.length,
    };
    for (const [table, count] of Object.entries(counts)) {
        const want = expected[table as keyof typeof expected];
        if (count !== want) {
            console.error(`Post-seed check falló: ${table} = ${count}, esperado ${want}`);
            await seq.close();
            process.exit(1);
        }
    }

    console.log("Seed complete:", JSON.stringify(counts));
    await seq.close();
}

main().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
});
