import "reflect-metadata";
import { config } from "dotenv";
import { Sequelize } from "sequelize";
import { generateFinancialData, validateSeedData, REFERENCE_DATE, type SeedData } from "./financial-seed-data.js";
import { SEED_TABLES } from "./financial-seed-models.js";

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
    // Definiciones locales centralizadas en financial-seed-models.ts (DT2, ciclo 14):
    // el test de consistencia verifica que coinciden con los modelos de dominio
    // (el seed es standalone: no importa el dataSource de la app).
    const models = SEED_TABLES.map((t) =>
        seq.define(t.tableName, t.columns as never, { tableName: t.tableName, timestamps: true }),
    );
    const byTable = Object.fromEntries(SEED_TABLES.map((t, i) => [t.tableName, models[i]]));
    const Company = byTable["companies"];
    const Customer = byTable["customers"];
    const Supplier = byTable["suppliers"];
    const GlAccount = byTable["glaccounts"];
    const Invoice = byTable["invoices"];
    const SupplierInvoice = byTable["supplierinvoices"];
    const InvoiceItem = byTable["invoiceitems"];
    const Payment = byTable["payments"];
    const SupplierInvoiceItem = byTable["supplierinvoiceitems"];
    const SupplierPayment = byTable["supplierpayments"];

    if (reset) {
        console.log("Dropping and re-creating tables...");
        await seq.sync({ force: true });
    }

    console.log("Clearing existing data...");
    for (const model of [Payment, InvoiceItem, Invoice, SupplierInvoice, Customer, Supplier, GlAccount, Company, SupplierPayment, SupplierInvoiceItem]) {
        await model.destroy({ where: {}, truncate: true, cascade: true });
    }

    console.log(`Seeding financial data (referencia temporal: ${REFERENCE_DATE})...`);
    await Company.bulkCreate(data.companies as any[]);
    await Customer.bulkCreate(data.customers as any[]);
    await Supplier.bulkCreate(data.suppliers as any[]);
    await GlAccount.bulkCreate(data.glAccounts as any[]);
    await Invoice.bulkCreate(data.invoices as any[]);
    await SupplierInvoice.bulkCreate(data.supplierInvoices as any[]);
    await InvoiceItem.bulkCreate(data.invoiceItems as any[]);
    await Payment.bulkCreate(data.payments as any[]);
    await SupplierInvoiceItem.bulkCreate(data.supplierInvoiceItems as any[]);
    await SupplierPayment.bulkCreate(data.supplierPayments as any[]);

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
        supplierinvoiceitems: await SupplierInvoiceItem.count(),
        supplierpayments: await SupplierPayment.count(),
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
        supplierinvoiceitems: data.supplierInvoiceItems.length,
        supplierpayments: data.supplierPayments.length,
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
