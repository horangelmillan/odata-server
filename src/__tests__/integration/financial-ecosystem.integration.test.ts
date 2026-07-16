import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import type { Express } from "express";
import expressApp from "../../main.js";
import { dataSource } from "../../common/service/odata/datasource.js";

const odataSeq = (dataSource as unknown as { sequelizerAdaptor: { sequelize: any } }).sequelizerAdaptor.sequelize;

async function dbReady(): Promise<boolean> {
    try {
        await odataSeq.authenticate();
        return true;
    } catch {
        return false;
    }
}

const dbAvailable = await dbReady();

describe("Financial ecosystem queries (F4)", () => {
    const app = expressApp();
    const Company = odataSeq.models.companies;
    const Customer = odataSeq.models.customers;
    const Supplier = odataSeq.models.suppliers;
    const GlAccount = odataSeq.models.glaccounts;
    const Invoice = odataSeq.models.invoices;
    const SupplierInvoice = odataSeq.models.supplierinvoices;
    const InvoiceItem = odataSeq.models.invoiceitems;
    const Payment = odataSeq.models.payments;

    beforeAll(async () => {
        if (!dbAvailable) return;
        await odataSeq.sync({ alter: true });
        await Payment.destroy({ where: {} });
        await InvoiceItem.destroy({ where: {} });
        await Invoice.destroy({ where: {} });
        await SupplierInvoice.destroy({ where: {} });
        await Customer.destroy({ where: {} });
        await Supplier.destroy({ where: {} });
        await GlAccount.destroy({ where: {} });
        await Company.destroy({ where: {} });

        // 1 company
        await Company.create({ id: "1000", nombre: "Grupo Test SA", moneda: "EUR", pais: "ES" });

        // 8 customers
        for (let i = 1; i <= 8; i++) {
            const id = `C${String(i).padStart(4, "0")}`;
            await Customer.create({ id, nombre: `Cliente ${i}`, companyId: "1000", pais: i % 2 === 0 ? "FR" : "ES" });
        }

        // 6 suppliers
        for (let i = 1; i <= 6; i++) {
            const id = `S${String(i).padStart(4, "0")}`;
            await Supplier.create({ id, nombre: `Proveedor ${i}`, pais: i % 3 === 0 ? "DE" : "ES" });
        }

        // 5 glAccounts
        for (let i = 1; i <= 5; i++) {
            const id = `${i}000`;
            await GlAccount.create({ id, nombre: `Cuenta ${i}000` });
        }

        // 10 invoices: 5 PENDIENTE, 3 PAGADA, 2 VENCIDA
        const estados = ["PENDIENTE", "PENDIENTE", "PENDIENTE", "PENDIENTE", "PENDIENTE", "PAGADA", "PAGADA", "PAGADA", "VENCIDA", "VENCIDA"];
        for (let i = 1; i <= 10; i++) {
            const id = `INV${String(i).padStart(5, "0")}`;
            const customerIdx = ((i - 1) % 8) + 1;
            const customerId = `C${String(customerIdx).padStart(4, "0")}`;
            await Invoice.create({ id, companyId: "1000", customerId, fecha: `2026-0${Math.min(i, 9)}-15`, importe: i * 100, moneda: "EUR", estado: estados[i - 1] });
        }

        // InvoiceItems: 2 por invoice
        for (let i = 1; i <= 10; i++) {
            const invId = `INV${String(i).padStart(5, "0")}`;
            await InvoiceItem.create({ id: `II${String(i).padStart(5, "0")}A`, invoiceId: invId, glAccountId: "1000", material: `MAT-A${i}`, cantidad: 1, importe: i * 60 });
            await InvoiceItem.create({ id: `II${String(i).padStart(5, "0")}B`, invoiceId: invId, glAccountId: "2000", material: `MAT-B${i}`, cantidad: 2, importe: i * 40 });
        }

        // 5 SupplierInvoices
        for (let i = 1; i <= 5; i++) {
            const id = `SI${String(i).padStart(5, "0")}`;
            const supplierIdx = ((i - 1) % 6) + 1;
            const supplierId = `S${String(supplierIdx).padStart(4, "0")}`;
            await SupplierInvoice.create({ id, supplierId, fecha: `2026-0${i}-20`, importe: i * 200, moneda: "EUR", estado: "PENDIENTE" });
        }

        // Payments for PAGADA invoices (INV00006, INV00007, INV00008)
        for (let i = 6; i <= 8; i++) {
            const invId = `INV${String(i).padStart(5, "0")}`;
            await Payment.create({ id: `P${String(i).padStart(5, "0")}`, invoiceId: invId, fecha: "2026-02-01", importe: i * 100, metodo: "TRANSFER" });
        }
    });



    it("company devuelve 1 sociedad (seed)", async () => {
        const res = await request(app).get("/odata/finance/company-odata");
        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        expect(value.length).toBe(1);
        expect(value[0].nombre).toBe("Grupo Test SA");
    });

    it("customer?$count=true devuelve 8 clientes", async () => {
        const res = await request(app).get("/odata/finance/customer-odata?$count=true");
        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        expect(value.length).toBe(8);
    });

    it("invoice?$filter=estado eq 'PENDIENTE'&$expand=customer solo pendientes", async () => {
        const res = await request(app).get("/odata/finance/invoice-odata?$filter=estado eq 'PENDIENTE'&$expand=customer");
        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        expect(value.length).toBe(5);
        for (const inv of value) {
            expect(inv.estado).toBe("PENDIENTE");
            expect(inv).toHaveProperty("customer");
            expect(inv.customer).toHaveProperty("id");
        }
    });

    it("invoice?$filter=estado eq 'PAGADA' devuelve 3 pagadas", async () => {
        const res = await request(app).get("/odata/finance/invoice-odata?$filter=estado eq 'PAGADA'");
        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        expect(value.length).toBe(3);
    });

    it("invoice?$filter=estado eq 'VENCIDA' devuelve 2 vencidas", async () => {
        const res = await request(app).get("/odata/finance/invoice-odata?$filter=estado eq 'VENCIDA'");
        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        expect(value.length).toBe(2);
    });

    it("invoice?$expand=items($expand=glAccount) navegación profunda", async () => {
        const res = await request(app).get("/odata/finance/invoice-odata?$expand=items($expand=glAccount)");
        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        expect(value.length).toBe(10);
        const inv = value[0];
        expect(inv).toHaveProperty("items");
        expect(inv.items.length).toBe(2);
        expect(inv.items[0]).toHaveProperty("glAccount");
        expect(inv.items[0].glAccount).toHaveProperty("id");
    });

    it("payment?$expand=invoice resuelve la factura", async () => {
        const res = await request(app).get("/odata/finance/payment-odata?$expand=invoice");
        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        expect(value.length).toBe(3);
        for (const pay of value) {
            expect(pay).toHaveProperty("invoice");
            expect(pay.invoice).toHaveProperty("id");
        }
    });

    it("$metadata expone las 8 entidades financieras con navegaciones", async () => {
        const res = await request(app).get("/odata/$metadata").set("Accept", "application/json");
        expect(res.status).toBe(200);
        const meta = res.body as Record<string, any>;
        const container = meta["ODataServer.Container"];

        const financeSets = Object.keys(container).filter(k => k.endsWith("-odata") && k !== "product-odata" && k !== "category-odata");
        const names = financeSets.map(k => container[k].$Type?.replace("ODataServer.", ""));
        expect(names).toContain("CompanyOData");
        expect(names).toContain("CustomerOData");
        expect(names).toContain("SupplierOData");
        expect(names).toContain("GlAccountOData");
        expect(names).toContain("InvoiceOData");
        expect(names).toContain("SupplierInvoiceOData");
        expect(names).toContain("InvoiceItemOData");
        expect(names).toContain("PaymentOData");

        const invType = meta["ODataServer.InvoiceOData"];
        expect(invType.$kind).toBe("EntityType");
        expect(invType.customer.$kind).toBe("NavigationProperty");
        expect(invType.customer.$Type).toBe("ODataServer.CustomerOData");
        expect(invType.items.$Type).toBe("Collection(ODataServer.InvoiceItemOData)");
        expect(invType.company.$Type).toBe("ODataServer.CompanyOData");
    });

    it("supplier devuelve 6 proveedores", async () => {
        const res = await request(app).get("/odata/finance/supplier-odata?$count=true");
        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        expect(value.length).toBe(6);
    });

    it("glaccount devuelve 5 cuentas", async () => {
        const res = await request(app).get("/odata/finance/glaccount-odata?$count=true");
        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        expect(value.length).toBe(5);
    });

    it("supplierinvoice devuelve 5 facturas de proveedor", async () => {
        const res = await request(app).get("/odata/finance/supplierinvoice-odata?$count=true");
        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        expect(value.length).toBe(5);
    });
});
