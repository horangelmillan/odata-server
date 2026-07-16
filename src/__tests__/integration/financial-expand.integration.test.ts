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

function checkExpand(result: any, navProp: string): void {
    expect(result).toHaveProperty(navProp);
    expect(result[navProp]).toBeTruthy();
}

describe("Financial $expand contra Postgres (F3)", () => {
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

        const company = await Company.create({ id: "1000", nombre: "Test SA", moneda: "EUR", pais: "ES" });
        const customer = await Customer.create({ id: "C0001", nombre: "Cliente Test", companyId: "1000", pais: "ES" });
        const supplier = await Supplier.create({ id: "S0001", nombre: "Proveedor Test", pais: "DE" });
        const gl = await GlAccount.create({ id: "0100", nombre: "Ventas" });
        const inv = await Invoice.create({ id: "I00001", companyId: "1000", customerId: "C0001", fecha: "2026-01-15", importe: 1000, moneda: "EUR", estado: "PENDIENTE" });
        await InvoiceItem.create({ id: "II00001", invoiceId: "I00001", glAccountId: "0100", material: "MAT-A", cantidad: 2, importe: 1000 });
        await SupplierInvoice.create({ id: "SI00001", supplierId: "S0001", fecha: "2026-01-20", importe: 500, moneda: "EUR", estado: "PAGADA" });
        await Payment.create({ id: "P00001", invoiceId: "I00001", fecha: "2026-02-01", importe: 1000, metodo: "TRANSFER" });

        await Customer.create({ id: "C0002", nombre: "Cliente Sin Facturas", companyId: "1000", pais: "FR" });
    });

    afterAll(async () => {
        if (dbAvailable) await odataSeq.close();
    });

    it("invoice?$expand=customer anida el cliente", async () => {
        const res = await request(app).get("/odata/finance/invoice-odata?$expand=customer");
        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        expect(value.length).toBeGreaterThan(0);
        for (const inv of value) {
            checkExpand(inv, "customer");
        }
    });

    it("invoice?$expand=items anida las líneas", async () => {
        const res = await request(app).get("/odata/finance/invoice-odata?$expand=items");
        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        expect(value.length).toBeGreaterThan(0);
        for (const inv of value) {
            checkExpand(inv, "items");
            if (inv.id === "I00001") {
                expect(inv.items.length).toBe(1);
                expect(inv.items[0].id).toBe("II00001");
            }
        }
    });

    it("invoice?$expand=items($expand=glAccount) navega items + glAccount", async () => {
        const res = await request(app).get("/odata/finance/invoice-odata?$expand=items($expand=glAccount)");
        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        expect(value.length).toBeGreaterThan(0);
        for (const inv of value) {
            checkExpand(inv, "items");
            for (const item of inv.items) {
                checkExpand(item, "glAccount");
            }
        }
    });

    it("invoice?$expand=customer,company anida ambos", async () => {
        const res = await request(app).get("/odata/finance/invoice-odata?$expand=customer,company");
        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        expect(value.length).toBeGreaterThan(0);
        for (const inv of value) {
            checkExpand(inv, "customer");
            checkExpand(inv, "company");
        }
    });

    it("supplierinvoice?$expand=supplier anida el proveedor", async () => {
        const res = await request(app).get("/odata/finance/supplierinvoice-odata?$expand=supplier");
        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        expect(value.length).toBeGreaterThan(0);
        for (const si of value) {
            checkExpand(si, "supplier");
        }
    });

    it("payment?$expand=invoice anida la factura", async () => {
        const res = await request(app).get("/odata/finance/payment-odata?$expand=invoice");
        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        expect(value.length).toBeGreaterThan(0);
        for (const pay of value) {
            checkExpand(pay, "invoice");
        }
    });

    it("customer?$expand=invoices anida las facturas del cliente", async () => {
        const res = await request(app).get("/odata/finance/customer-odata?$expand=invoices");
        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        expect(value.length).toBeGreaterThan(0);
        const c1 = value.find((c: any) => c.id === "C0001");
        expect(c1).toBeTruthy();
        checkExpand(c1, "invoices");
    });

    it("customer?$expand=invoices($expand=items) navega cliente→facturas→items", async () => {
        const res = await request(app).get("/odata/finance/customer-odata?$expand=invoices($expand=items)");
        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        expect(value.length).toBeGreaterThan(0);
        const c1 = value.find((c: any) => c.id === "C0001");
        expect(c1).toBeTruthy();
        checkExpand(c1, "invoices");
        if (c1.invoices.length > 0) {
            checkExpand(c1.invoices[0], "items");
        }
    });

    it("invoice?$filter=customerId eq 'C0001' filtra por cliente", async () => {
        const res = await request(app).get("/odata/finance/invoice-odata?$filter=customerId eq 'C0001'");
        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        expect(value.length).toBe(1);
        expect(value[0].customerId).toBe("C0001");
    });

    it("invoice?$filter=estado eq 'PENDIENTE' devuelve pendientes", async () => {
        const res = await request(app).get("/odata/finance/invoice-odata?$filter=estado eq 'PENDIENTE'");
        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        expect(value.length).toBeGreaterThan(0);
        for (const inv of value) {
            expect(inv.estado).toBe("PENDIENTE");
        }
    });
});
