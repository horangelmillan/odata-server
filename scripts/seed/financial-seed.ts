import "reflect-metadata";
import { config } from "dotenv";
import { Sequelize, DataTypes } from "sequelize";

config();

function pad(n: number, width: number): string {
    return String(n).padStart(width, "0");
}

function dateStr(daysAgo: number): string {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split("T")[0];
}

function randomChoice<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

const METODOS = ["TRANSFER", "CARD", "CHECK"];

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

    const seq = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
        host: dbConfig.host,
        port: dbConfig.port,
        dialect: dbConfig.dialect,
        logging: false,
    });

    await seq.authenticate();
    console.log("Connected to database.");

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
        fecha: DataTypes.DATEONLY,
        importe: DataTypes.DECIMAL,
        moneda: DataTypes.STRING,
        estado: DataTypes.STRING,
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
    }, { tableName: "invoices", timestamps: true });

    const SupplierInvoice = seq.define("supplierinvoices", {
        id: { type: DataTypes.STRING, primaryKey: true },
        supplierId: DataTypes.STRING,
        fecha: DataTypes.DATEONLY,
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
        fecha: DataTypes.DATEONLY,
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

    console.log("Seeding financial data...");
    const company = await Company.create({
        id: "1000", nombre: "Servicios TI Horizonte S.A.", moneda: "EUR", pais: "ES",
    });

    const customers: any[] = [];
    const customerNames = [
        "Tecnología Avanzada SL", "Distribuciones del Sur SA", "Consultora Estratégica XXI",
        "Comercial del Norte SL", "Industrias Reunidas SA", "Servicios Logísticos Global SL",
        "Desarrollos Inmobiliarios MG SA", "Alimentación y Bebidas SL",
    ];
    for (let i = 0; i < customerNames.length; i++) {
        const c = await Customer.create({
            id: `C${pad(i + 1, 4)}`, nombre: customerNames[i],
            companyId: company.id, pais: randomChoice(["ES", "FR", "PT", "DE", "IT"]),
        });
        customers.push(c);
    }

    const suppliers: any[] = [];
    const supplierNames = [
        "Proveedora Industrial del Mediterráneo SA", "Suministros Técnicos SL",
        "Materias Primas Europa SA", "Servicios Auxiliares de Producción SL",
        "Logística Integral del Transporte SA", "Equipos y Maquinaria Pesada SL",
    ];
    const supplierPaises = ["ES", "DE", "IT", "ES", "PT", "FR"];
    for (let i = 0; i < supplierNames.length; i++) {
        const s = await Supplier.create({
            id: `S${pad(i + 1, 4)}`, nombre: supplierNames[i], pais: supplierPaises[i],
        });
        suppliers.push(s);
    }

    const glAccounts: any[] = [];
    const glAccountNames = [
        "Ventas de mercancías", "Prestación de servicios", "Compras de materiales",
        "Gastos de personal", "Arrendamientos", "Suministros",
        "Gastos financieros", "Amortizaciones", "Impuesto sobre beneficios", "Resultados extraordinarios",
    ];
    for (let i = 0; i < glAccountNames.length; i++) {
        const g = await GlAccount.create({
            id: `${pad(i + 1, 4)}00`, nombre: glAccountNames[i],
        });
        glAccounts.push(g);
    }

    const invoiceStatuses = ["PENDIENTE", "PAGADA", "VENCIDA"];
    const invoiceStatusWeights = [0.25, 0.60, 0.15];
    function weightedStatus(): string {
        const r = Math.random();
        let acc = 0;
        for (let i = 0; i < invoiceStatuses.length; i++) {
            acc += invoiceStatusWeights[i];
            if (r < acc) return invoiceStatuses[i];
        }
        return "PENDIENTE";
    }

    const invoices: any[] = [];
    const customerIds = customers.map((c: any) => c.id);
    for (let i = 0; i < 50; i++) {
        const daysAgo = Math.floor(Math.random() * 180) + 1;
        const importe = Math.round((Math.random() * 9500 + 500) * 100) / 100;
        const inv = await Invoice.create({
            id: `I${pad(i + 1, 5)}`, companyId: company.id,
            customerId: randomChoice(customerIds),
            fecha: dateStr(daysAgo),
            importe, moneda: "EUR", estado: weightedStatus(),
        });
        invoices.push(inv);
    }

    const supplierIds = suppliers.map((s: any) => s.id);
    for (let i = 0; i < 20; i++) {
        const daysAgo = Math.floor(Math.random() * 150) + 1;
        const importe = Math.round((Math.random() * 8000 + 200) * 100) / 100;
        await SupplierInvoice.create({
            id: `SI${pad(i + 1, 5)}`, supplierId: randomChoice(supplierIds),
            fecha: dateStr(daysAgo),
            importe, moneda: "EUR", estado: weightedStatus(),
        });
    }

    const materials = ["MAT-A", "MAT-B", "MAT-C", "MAT-D", "MAT-E"];
    let itemCounter = 0;
    for (const inv of invoices) {
        const numItems = Math.floor(Math.random() * 4) + 1;
        let remaining = Number(inv.importe);
        for (let j = 0; j < numItems; j++) {
            const isLast = j === numItems - 1;
            const itemImporte = isLast
                ? Math.round(remaining * 100) / 100
                : Math.round((remaining / (numItems - j)) * 100) / 100;
            remaining -= itemImporte;
            const cantidad = Math.floor(Math.random() * 10) + 1;
            itemCounter++;
            await InvoiceItem.create({
                id: `II${pad(itemCounter, 5)}`,
                invoiceId: inv.id,
                glAccountId: randomChoice(glAccounts.map((g: any) => g.id)),
                material: randomChoice(materials),
                cantidad, importe: itemImporte,
            });
        }
    }

    const paidInvoices = invoices.filter((inv: any) => inv.estado === "PAGADA");
    for (let i = 0; i < paidInvoices.length; i++) {
        const inv = paidInvoices[i];
        const daysAgo = Math.floor(Math.random() * 30) + 1;
        await Payment.create({
            id: `P${pad(i + 1, 5)}`, invoiceId: inv.id,
            fecha: dateStr(daysAgo), importe: inv.importe,
            metodo: randomChoice(METODOS),
        });
    }

    console.log("Seed complete.");
    await seq.close();
}

main().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
});
