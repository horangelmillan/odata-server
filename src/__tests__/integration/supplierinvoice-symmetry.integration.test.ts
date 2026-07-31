import { describe, it, expect, beforeAll } from "vitest";
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

// DAP2 (ciclo 14): simetría estructural de supplierinvoice — items y pagos.
describe("SupplierInvoice symmetry (DAP2) contra Postgres", () => {
    const app = expressApp();
    const Supplier = odataSeq.models.suppliers;
    const GlAccount = odataSeq.models.glaccounts;
    const SupplierInvoice = odataSeq.models.supplierinvoices;
    const SupplierInvoiceItem = odataSeq.models.supplierinvoiceitems;
    const SupplierPayment = odataSeq.models.supplierpayments;

    beforeAll(async () => {
        if (!dbAvailable) return;
        await odataSeq.sync({ alter: true });
        await SupplierPayment.destroy({ where: {} });
        await SupplierInvoiceItem.destroy({ where: {} });
        await SupplierInvoice.destroy({ where: {} });
        await Supplier.destroy({ where: {} });
        await GlAccount.destroy({ where: {} });

        const gl = await GlAccount.create({ id: "000300", nombre: "Compras de materiales" });
        const gl2 = await GlAccount.create({ id: "000600", nombre: "Suministros" });
        const supplier = await Supplier.create({ id: "S0001", nombre: "Proveedor Test", pais: "DE" });
        await SupplierInvoice.create({ id: "SI00001", supplierId: "S0001", fecha: "2026-01-20", dueDate: "2026-02-19", importe: 500, netAmount: 413.22, taxAmount: 86.78, grossAmount: 500, docNumber: "5100000001", moneda: "EUR", estado: "PAGADA" });
        await SupplierInvoiceItem.create({ id: "SII00001", supplierInvoiceId: "SI00001", glAccountId: "000300", material: "MAT-F", cantidad: 2, importe: 500 });
        await SupplierPayment.create({ id: "SP00001", supplierInvoiceId: "SI00001", fecha: "2026-02-01", importe: 500, metodo: "TRANSFER" });
        expect(gl).toBeTruthy();
        expect(gl2).toBeTruthy();
    });

    it("supplierinvoice?$expand=items anida las líneas de gasto", async () => {
        const res = await request(app).get("/odata/finance/supplierinvoice-odata?$expand=items");
        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        expect(value.length).toBeGreaterThan(0);
        for (const si of value) {
            checkExpand(si, "items");
            if (si.id === "SI00001") {
                expect(si.items.length).toBe(1);
                expect(si.items[0].id).toBe("SII00001");
                expect(si.items[0].material).toBe("MAT-F");
            }
        }
    });

    it("supplierinvoice?$expand=payments anida los pagos", async () => {
        const res = await request(app).get("/odata/finance/supplierinvoice-odata?$expand=payments");
        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        expect(value.length).toBeGreaterThan(0);
        for (const si of value) {
            checkExpand(si, "payments");
            if (si.id === "SI00001") {
                expect(si.payments.length).toBe(1);
                expect(si.payments[0].id).toBe("SP00001");
                expect(si.payments[0].metodo).toBe("TRANSFER");
            }
        }
    });

    it("supplierinvoice?$expand=items,payments anida ambos", async () => {
        const res = await request(app).get("/odata/finance/supplierinvoice-odata?$expand=items,payments");
        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        expect(value.length).toBeGreaterThan(0);
        for (const si of value) {
            checkExpand(si, "items");
            checkExpand(si, "payments");
        }
    });

    it("supplierinvoiceitem?$expand=supplierInvoice,glAccount navega padre y cuenta", async () => {
        const res = await request(app).get("/odata/finance/supplierinvoiceitem-odata?$expand=supplierInvoice,glAccount");
        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        expect(value.length).toBeGreaterThan(0);
        for (const item of value) {
            checkExpand(item, "supplierInvoice");
            checkExpand(item, "glAccount");
        }
    });

    it("supplierpayment?$expand=supplierInvoice anida la factura", async () => {
        const res = await request(app).get("/odata/finance/supplierpayment-odata?$expand=supplierInvoice");
        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        expect(value.length).toBeGreaterThan(0);
        for (const pay of value) {
            checkExpand(pay, "supplierInvoice");
        }
    });

    it("CRUD: POST/PATCH/DELETE sobre supplierinvoiceitem-odata", async () => {
        const post = await request(app)
            .post("/odata/finance/supplierinvoiceitem-odata")
            .send({ id: "SII99999", supplierInvoiceId: "SI00001", glAccountId: "000300", material: "MAT-TEST", cantidad: 2, importe: 50 });
        expect(post.status).toBe(201);

        const patch = await request(app)
            .patch("/odata/finance/supplierinvoiceitem-odata('SII99999')")
            .send({ cantidad: 3 });
        expect(patch.status).toBe(200);

        const del = await request(app).delete("/odata/finance/supplierinvoiceitem-odata('SII99999')");
        expect(del.status).toBe(204);
    });

    it("CRUD: POST/DELETE sobre supplierpayment-odata", async () => {
        const post = await request(app)
            .post("/odata/finance/supplierpayment-odata")
            .send({ id: "SP99999", supplierInvoiceId: "SI00001", fecha: "2026-03-01", importe: 10, metodo: "CHECK" });
        expect(post.status).toBe(201);

        const del = await request(app).delete("/odata/finance/supplierpayment-odata('SP99999')");
        expect(del.status).toBe(204);
    });

    it("validación: body con campo extra en item -> 400", async () => {
        const res = await request(app)
            .post("/odata/finance/supplierinvoiceitem-odata")
            .send({ id: "SII88888", supplierInvoiceId: "SI00001", glAccountId: "000300", material: "X", cantidad: 1, importe: 1, hack: true });
        expect(res.status).toBe(400);
    });
});
