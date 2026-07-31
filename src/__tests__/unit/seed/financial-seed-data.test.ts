import { describe, it, expect } from "vitest";
import {
    generateFinancialData,
    validateSeedData,
    REFERENCE_DATE,
    STATUS_TARGET,
} from "../../../../scripts/seed/financial-seed-data.js";

describe("financial-seed-data (generador determinista, ciclo 11)", () => {
    const data = generateFinancialData();

    it("es determinista: dos ejecuciones producen el mismo dataset", () => {
        const again = generateFinancialData();
        expect(JSON.stringify(again)).toBe(JSON.stringify(data));
    });

    it("cumple todos los invariantes de coherencia", () => {
        expect(validateSeedData(data)).toEqual([]);
    });

    it("volúmenes: 1 company, 12 customers, 6 suppliers, 10 glAccounts, 150 invoices, 20 supplierInvoices", () => {
        expect(data.companies.length).toBe(1);
        expect(data.customers.length).toBe(12);
        expect(data.suppliers.length).toBe(6);
        expect(data.glAccounts.length).toBe(10);
        expect(data.invoices.length).toBe(150);
        expect(data.supplierInvoices.length).toBe(20);
        expect(data.invoiceItems.length).toBeGreaterThanOrEqual(300);
        expect(data.payments.length).toBeGreaterThanOrEqual(95);
    });

    it("distribución exacta de estados 60/25/15 (90 PAGADA, 37 PENDIENTE, 23 VENCIDA)", () => {
        const byStatus = data.invoices.reduce<Record<string, number>>((acc, inv) => {
            acc[inv.estado] = (acc[inv.estado] ?? 0) + 1;
            return acc;
        }, {});
        expect(byStatus["PAGADA"]).toBe(STATUS_TARGET.PAGADA);
        expect(byStatus["PENDIENTE"]).toBe(STATUS_TARGET.PENDIENTE);
        expect(byStatus["VENCIDA"]).toBe(STATUS_TARGET.VENCIDA);
    });

    it("cobertura: los 12 clientes tienen ≥10 facturas (incluidos los 4 nuevos C0009–C0012)", () => {
        for (const c of data.customers) {
            const count = data.invoices.filter((inv) => inv.customerId === c.id).length;
            expect(count).toBeGreaterThanOrEqual(10);
        }
    });

    it("existen pagos a plazos (2 pagos misma factura) y pagos parciales (PENDIENTE con pago)", () => {
        const paymentsByInvoice = new Map<string, number>();
        for (const p of data.payments) {
            paymentsByInvoice.set(p.invoiceId, (paymentsByInvoice.get(p.invoiceId) ?? 0) + 1);
        }
        expect([...paymentsByInvoice.values()].some((n) => n === 2)).toBe(true);

        const pendientesConPago = new Set(
            data.payments
                .filter((p) => data.invoices.find((inv) => inv.id === p.invoiceId)?.estado === "PENDIENTE")
                .map((p) => p.invoiceId),
        );
        expect(pendientesConPago.size).toBeGreaterThan(0);
    });

    it("las fechas del dataset nunca superan la fecha de referencia", () => {
        for (const inv of data.invoices) expect(inv.fecha <= REFERENCE_DATE).toBe(true);
        for (const p of data.payments) expect(p.fecha <= REFERENCE_DATE).toBe(true);
        for (const si of data.supplierInvoices) expect(si.fecha <= REFERENCE_DATE).toBe(true);
        for (const sp of data.supplierPayments) expect(sp.fecha <= REFERENCE_DATE).toBe(true);
    });

    it("supplierInvoices recientes son PENDIENTE y antiguas PAGADA/VENCIDA (coherencia sin entidad pago)", () => {
        for (const si of data.supplierInvoices) {
            const daysAgo = Math.round((Date.parse(`${REFERENCE_DATE}T00:00:00.000Z`) - Date.parse(`${si.fecha}T00:00:00.000Z`)) / 86_400_000);
            if (daysAgo <= 30) expect(si.estado).toBe("PENDIENTE");
            else expect(["PAGADA", "VENCIDA"]).toContain(si.estado);
        }
    });

    // DAP2 (ciclo 14): simetría supplierinvoice — items y pagos de proveedor.
    it("DAP2: toda supplierInvoice tiene ≥1 línea de gasto y Σ líneas = importe", () => {
        expect(data.supplierInvoiceItems.length).toBeGreaterThanOrEqual(20);
        for (const si of data.supplierInvoices) {
            const items = data.supplierInvoiceItems.filter((it) => it.supplierInvoiceId === si.id);
            expect(items.length).toBeGreaterThanOrEqual(1);
            const sum = items.reduce((acc, it) => acc + it.importe, 0);
            expect(Math.abs(sum - si.importe)).toBeLessThanOrEqual(0.01);
        }
    });

    it("DAP2: las líneas de proveedor usan cuentas de GASTO (000300/000600), no de ingreso", () => {
        for (const item of data.supplierInvoiceItems) {
            expect(["000300", "000600"]).toContain(item.glAccountId);
        }
    });

    it("DAP2: los pagos de proveedor son coherentes con el estado derivado", () => {
        for (const si of data.supplierInvoices) {
            const paid = data.supplierPayments.filter((p) => p.supplierInvoiceId === si.id).reduce((acc, p) => acc + p.importe, 0);
            if (si.estado === "PAGADA") {
                expect(Math.abs(paid - si.importe)).toBeLessThanOrEqual(0.01);
            } else if (si.estado === "VENCIDA") {
                expect(paid).toBe(0);
            } else {
                expect(paid).toBeLessThan(si.importe);
            }
        }
    });

    it("DAP2: existen pagos de proveedor a plazos (2 pagos misma factura) y parciales (PENDIENTE con pago)", () => {
        const paymentsBySi = new Map<string, number>();
        for (const p of data.supplierPayments) {
            paymentsBySi.set(p.supplierInvoiceId, (paymentsBySi.get(p.supplierInvoiceId) ?? 0) + 1);
        }
        expect([...paymentsBySi.values()].some((n) => n === 2)).toBe(true);

        const pendientesConPago = new Set(
            data.supplierPayments
                .filter((p) => data.supplierInvoices.find((si) => si.id === p.supplierInvoiceId)?.estado === "PENDIENTE")
                .map((p) => p.supplierInvoiceId),
        );
        expect(pendientesConPago.size).toBeGreaterThan(0);
    });
});
