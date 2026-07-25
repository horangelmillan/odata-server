/**
 * Generador puro y determinista del ecosistema financiero simulado (tipo S/4HANA Cloud).
 *
 * Sin IO ni Sequelize: produce objetos planos que `financial-seed.ts` inserta en BD.
 *
 * Determinismo (ciclo 11, decisión D2 — actualiza D5 del ciclo 06):
 * - PRNG mulberry32 con semilla constante (`SEED_CONSTANT`).
 * - "Hoy" del dataset fijo en `REFERENCE_DATE` (las fechas nunca derivan con el reloj).
 *
 * Reglas de coherencia (ciclo 11, F2):
 * - `estado` DERIVADO de fecha + pagos (convención: vencimiento = fecha + 30 días):
 *   PAGADA ⇔ Σ pagos = importe · VENCIDA ⇔ vencida sin pagos · PENDIENTE ⇔ resto.
 * - Toda fecha de pago ≥ fecha de su factura.
 * - `importe` de factura = Σ importes de sus líneas (las líneas se generan primero,
 *   con precio de catálogo × cantidad, así cantidad e importe son coherentes).
 * - Las líneas de venta solo usan cuentas de ingreso (000100 mercancías / 000200 servicios).
 * - `createdAt`/`updatedAt` = fecha del documento (maestros: fecha fija de alta).
 */

// ---------------------------------------------------------------------------
// Constantes del dataset
// ---------------------------------------------------------------------------

export const SEED_CONSTANT = 20260715;
export const REFERENCE_DATE = "2026-07-15";
export const PAYMENT_TERM_DAYS = 30;

export const COMPANY_ID = "1000";
export const INVOICE_COUNT = 150;
export const SUPPLIER_INVOICE_COUNT = 20;

/** Objetivo exacto de ciclo de vida para las 150 facturas (60% / 25% / 15%). */
export const STATUS_TARGET = { PAGADA: 90, PENDIENTE: 37, VENCIDA: 23 } as const;

export const REVENUE_MATERIAL_ACCOUNT = "000100"; // Ventas de mercancías
export const REVENUE_SERVICE_ACCOUNT = "000200"; // Prestación de servicios

const MASTER_CREATED_AT = "2025-07-15T00:00:00.000Z";

// ---------------------------------------------------------------------------
// Tipos (filas planas listas para insertar)
// ---------------------------------------------------------------------------

export interface CompanyRow { id: string; nombre: string; moneda: string; pais: string; createdAt: string; updatedAt: string; }
export interface CustomerRow { id: string; nombre: string; companyId: string; pais: string; createdAt: string; updatedAt: string; }
export interface SupplierRow { id: string; nombre: string; pais: string; createdAt: string; updatedAt: string; }
export interface GlAccountRow { id: string; nombre: string; createdAt: string; updatedAt: string; }
export interface InvoiceRow { id: string; companyId: string; customerId: string; fecha: string; importe: number; moneda: string; estado: string; createdAt: string; updatedAt: string; }
export interface SupplierInvoiceRow { id: string; supplierId: string; fecha: string; importe: number; moneda: string; estado: string; createdAt: string; updatedAt: string; }
export interface InvoiceItemRow { id: string; invoiceId: string; glAccountId: string; material: string; cantidad: number; importe: number; createdAt: string; updatedAt: string; }
export interface PaymentRow { id: string; invoiceId: string; fecha: string; importe: number; metodo: string; createdAt: string; updatedAt: string; }

export interface SeedData {
    companies: CompanyRow[];
    customers: CustomerRow[];
    suppliers: SupplierRow[];
    glAccounts: GlAccountRow[];
    invoices: InvoiceRow[];
    invoiceItems: InvoiceItemRow[];
    supplierInvoices: SupplierInvoiceRow[];
    payments: PaymentRow[];
}

// ---------------------------------------------------------------------------
// PRNG determinista (mulberry32) + helpers
// ---------------------------------------------------------------------------

export function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return function () {
        a |= 0; a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function randInt(rng: () => number, min: number, max: number): number {
    return min + Math.floor(rng() * (max - min + 1));
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
    return arr[Math.floor(rng() * arr.length)];
}

function shuffle<T>(rng: () => number, arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function round2(v: number): number {
    return Math.round(v * 100) / 100;
}

function pad(n: number, width: number): string {
    return String(n).padStart(width, "0");
}

// ---------------------------------------------------------------------------
// Fechas (siempre UTC; el dataset no depende de la zona horaria del host)
// ---------------------------------------------------------------------------

const MS_DAY = 86_400_000;

function toUtcMs(dateStr: string): number {
    return Date.parse(`${dateStr}T00:00:00.000Z`);
}

function fmtUtc(ms: number): string {
    return new Date(ms).toISOString().split("T")[0];
}

export function addDays(dateStr: string, days: number): string {
    return fmtUtc(toUtcMs(dateStr) + days * MS_DAY);
}

function minDate(a: string, b: string): string {
    return a <= b ? a : b;
}

function docTimestamps(fecha: string): { createdAt: string; updatedAt: string } {
    const ts = `${fecha}T00:00:00.000Z`;
    return { createdAt: ts, updatedAt: ts };
}

// ---------------------------------------------------------------------------
// Catálogos fijos
// ---------------------------------------------------------------------------

const CUSTOMER_NAMES = [
    "Tecnología Avanzada SL", "Distribuciones del Sur SA", "Consultora Estratégica XXI",
    "Comercial del Norte SL", "Industrias Reunidas SA", "Servicios Logísticos Global SL",
    "Desarrollos Inmobiliarios MG SA", "Alimentación y Bebidas SL",
    // Nuevos en el ciclo 11 (ampliación +100 facturas)
    "Farmacéutica del Levante SA", "Textiles y Confecciones Omega SL",
    "Energías Renovables del Ebro SA", "Construcciones del Pacífico SL",
] as const;

/** Países eurozona, mayoría ES (coherente con sociedad española y moneda EUR). */
const CUSTOMER_PAISES = ["ES", "ES", "FR", "PT", "ES", "DE", "ES", "IT", "ES", "FR", "ES", "PT"] as const;

const SUPPLIER_NAMES = [
    "Proveedora Industrial del Mediterráneo SA", "Suministros Técnicos SL",
    "Materias Primas Europa SA", "Servicios Auxiliares de Producción SL",
    "Logística Integral del Transporte SA", "Equipos y Maquinaria Pesada SL",
] as const;
const SUPPLIER_PAISES = ["ES", "DE", "IT", "ES", "PT", "FR"] as const;

const GL_ACCOUNT_NAMES = [
    "Ventas de mercancías", "Prestación de servicios", "Compras de materiales",
    "Gastos de personal", "Arrendamientos", "Suministros",
    "Gastos financieros", "Amortizaciones", "Impuesto sobre beneficios", "Resultados extraordinarios",
] as const;

/** Catálogo de líneas de venta: la cuenta se deriva del tipo (M1). */
const LINE_CATALOG = [
    { material: "MAT-A", glAccountId: REVENUE_MATERIAL_ACCOUNT, precio: 125.0, tipo: "MAT" },
    { material: "MAT-B", glAccountId: REVENUE_MATERIAL_ACCOUNT, precio: 349.95, tipo: "MAT" },
    { material: "MAT-C", glAccountId: REVENUE_MATERIAL_ACCOUNT, precio: 89.9, tipo: "MAT" },
    { material: "MAT-D", glAccountId: REVENUE_MATERIAL_ACCOUNT, precio: 560.0, tipo: "MAT" },
    { material: "MAT-E", glAccountId: REVENUE_MATERIAL_ACCOUNT, precio: 210.5, tipo: "MAT" },
    { material: "SRV-CONS", glAccountId: REVENUE_SERVICE_ACCOUNT, precio: 950.0, tipo: "SRV" },
    { material: "SRV-SOP", glAccountId: REVENUE_SERVICE_ACCOUNT, precio: 420.0, tipo: "SRV" },
    { material: "SRV-DEV", glAccountId: REVENUE_SERVICE_ACCOUNT, precio: 780.0, tipo: "SRV" },
] as const;

/** TRANSFER ponderada ~60% (método habitual B2B). */
const PAYMENT_METHODS = ["TRANSFER", "TRANSFER", "TRANSFER", "CARD", "CHECK"] as const;

const INVOICE_STATUSES = ["PENDIENTE", "PAGADA", "VENCIDA"] as const;

// ---------------------------------------------------------------------------
// Generador
// ---------------------------------------------------------------------------

export function generateFinancialData(referenceDate: string = REFERENCE_DATE): SeedData {
    const rng = mulberry32(SEED_CONSTANT);

    const companies: CompanyRow[] = [{
        id: COMPANY_ID, nombre: "Servicios TI Horizonte S.A.", moneda: "EUR", pais: "ES",
        createdAt: MASTER_CREATED_AT, updatedAt: MASTER_CREATED_AT,
    }];

    const customers: CustomerRow[] = CUSTOMER_NAMES.map((nombre, i) => ({
        id: `C${pad(i + 1, 4)}`, nombre, companyId: COMPANY_ID, pais: CUSTOMER_PAISES[i],
        createdAt: MASTER_CREATED_AT, updatedAt: MASTER_CREATED_AT,
    }));

    const suppliers: SupplierRow[] = SUPPLIER_NAMES.map((nombre, i) => ({
        id: `S${pad(i + 1, 4)}`, nombre, pais: SUPPLIER_PAISES[i],
        createdAt: MASTER_CREATED_AT, updatedAt: MASTER_CREATED_AT,
    }));

    const glAccounts: GlAccountRow[] = GL_ACCOUNT_NAMES.map((nombre, i) => ({
        id: `${pad(i + 1, 4)}00`, nombre,
        createdAt: MASTER_CREATED_AT, updatedAt: MASTER_CREATED_AT,
    }));

    // Pool de ciclo de vida con conteos exactos, barajado determinísticamente.
    const lifecyclePool = shuffle(rng, [
        ...Array<string>(STATUS_TARGET.PAGADA).fill("PAGADA"),
        ...Array<string>(STATUS_TARGET.PENDIENTE).fill("PENDIENTE"),
        ...Array<string>(STATUS_TARGET.VENCIDA).fill("VENCIDA"),
    ]);

    // Pool de clientes: cobertura garantizada (cada cliente ≥10) + 4 "premium" (M2).
    const customerPool = shuffle(rng, [
        ...customers.flatMap((c) => Array<string>(10).fill(c.id)),
        ...Array<string>(8).fill("C0001"), ...Array<string>(8).fill("C0002"),
        ...Array<string>(7).fill("C0003"), ...Array<string>(7).fill("C0004"),
    ]);

    const invoices: InvoiceRow[] = [];
    const invoiceItems: InvoiceItemRow[] = [];
    const payments: PaymentRow[] = [];
    let itemCounter = 0;

    for (let i = 0; i < INVOICE_COUNT; i++) {
        const invoiceNumber = i + 1;
        const id = `I${pad(invoiceNumber, 5)}`;
        const estado = lifecyclePool[i];
        const customerId = customerPool[i];

        // Ventana de fecha coherente con el ciclo de vida:
        // PAGADA: ≥2 días de antigüedad (margen para pagarla) · VENCIDA: >30 días (vencida) · PENDIENTE: ≤30 días.
        const daysAgo = estado === "PAGADA" ? randInt(rng, 2, 180)
            : estado === "VENCIDA" ? randInt(rng, 31, 180)
            : randInt(rng, 0, PAYMENT_TERM_DAYS);
        const fecha = addDays(referenceDate, -daysAgo);

        // Líneas primero: importe = Σ líneas (M4); cuenta según tipo de línea (M1).
        const numItems = randInt(rng, 1, 4);
        let sum = 0;
        for (let j = 0; j < numItems; j++) {
            const line = pick(rng, LINE_CATALOG);
            const cantidad = line.tipo === "MAT" ? randInt(rng, 1, 25) : randInt(rng, 1, 8);
            const importe = round2(line.precio * (0.9 + rng() * 0.2) * cantidad);
            sum += importe;
            itemCounter++;
            invoiceItems.push({
                id: `II${pad(itemCounter, 5)}`, invoiceId: id,
                glAccountId: line.glAccountId, material: line.material,
                cantidad, importe, ...docTimestamps(fecha),
            });
        }
        const importe = round2(sum);

        invoices.push({
            id, companyId: COMPANY_ID, customerId, fecha,
            importe, moneda: "EUR", estado, ...docTimestamps(fecha),
        });

        // Pagos coherentes con el estado (R4: siempre ≥ fecha de factura).
        if (estado === "PAGADA") {
            if (invoiceNumber % 9 === 0) {
                // Pago a plazos (M3): 60% + 40%, ambos dentro de la ventana de pago.
                const first = round2(importe * 0.6);
                const second = round2(importe - first);
                const f1 = minDate(addDays(fecha, randInt(rng, 5, 15)), referenceDate);
                const f2 = minDate(addDays(fecha, randInt(rng, 20, 40)), referenceDate);
                payments.push(
                    { id: `P${pad(payments.length + 1, 5)}`, invoiceId: id, fecha: f1, importe: first, metodo: pick(rng, PAYMENT_METHODS), ...docTimestamps(f1) },
                    { id: `P${pad(payments.length + 2, 5)}`, invoiceId: id, fecha: f2, importe: second, metodo: pick(rng, PAYMENT_METHODS), ...docTimestamps(f2) },
                );
            } else {
                const f = minDate(addDays(fecha, randInt(rng, 3, 40)), referenceDate);
                payments.push({
                    id: `P${pad(payments.length + 1, 5)}`, invoiceId: id, fecha: f,
                    importe, metodo: pick(rng, PAYMENT_METHODS), ...docTimestamps(f),
                });
            }
        } else if (estado === "PENDIENTE" && invoiceNumber % 12 === 0) {
            // Pago parcial (M3): la factura sigue PENDIENTE (Σ pagos < importe).
            const f = minDate(addDays(fecha, randInt(rng, 2, 10)), referenceDate);
            payments.push({
                id: `P${pad(payments.length + 1, 5)}`, invoiceId: id, fecha: f,
                importe: round2(importe / 2), metodo: pick(rng, PAYMENT_METHODS), ...docTimestamps(f),
            });
        }
    }

    // Facturas de proveedor: sin pagos en el modelo → estado coherente con la antigüedad.
    const supplierInvoices: SupplierInvoiceRow[] = [];
    const supplierPool = shuffle(rng, suppliers.flatMap((s, i) => Array<string>(i < 2 ? 4 : 3).fill(s.id)));
    for (let i = 0; i < SUPPLIER_INVOICE_COUNT; i++) {
        const daysAgo = randInt(rng, 1, 150);
        const fecha = addDays(referenceDate, -daysAgo);
        const estado = daysAgo <= PAYMENT_TERM_DAYS ? "PENDIENTE"
            : rng() < 0.75 ? "PAGADA" : "VENCIDA";
        supplierInvoices.push({
            id: `SI${pad(i + 1, 5)}`, supplierId: supplierPool[i], fecha,
            importe: round2(rng() * 8000 + 200), moneda: "EUR", estado, ...docTimestamps(fecha),
        });
    }

    return { companies, customers, suppliers, glAccounts, invoices, invoiceItems, supplierInvoices, payments };
}

// ---------------------------------------------------------------------------
// Validación de invariantes (usada por el seed antes de insertar y por tests)
// ---------------------------------------------------------------------------

export function validateSeedData(data: SeedData, referenceDate: string = REFERENCE_DATE): string[] {
    const errors: string[] = [];
    const TOL = 0.01;

    const expect = (cond: boolean, msg: string) => { if (!cond) errors.push(msg); };

    // 1. Volúmenes
    expect(data.companies.length === 1, `companies: ${data.companies.length} ≠ 1`);
    expect(data.customers.length === 12, `customers: ${data.customers.length} ≠ 12`);
    expect(data.suppliers.length === 6, `suppliers: ${data.suppliers.length} ≠ 6`);
    expect(data.glAccounts.length === 10, `glAccounts: ${data.glAccounts.length} ≠ 10`);
    expect(data.invoices.length === INVOICE_COUNT, `invoices: ${data.invoices.length} ≠ ${INVOICE_COUNT}`);
    expect(data.supplierInvoices.length === SUPPLIER_INVOICE_COUNT, `supplierInvoices: ${data.supplierInvoices.length} ≠ ${SUPPLIER_INVOICE_COUNT}`);

    // 2. IDs únicos
    for (const [name, rows] of Object.entries(data)) {
        const ids = (rows as { id: string }[]).map((r) => r.id);
        expect(new Set(ids).size === ids.length, `${name}: IDs duplicados`);
    }

    // 3. Integridad referencial
    const customerIds = new Set(data.customers.map((c) => c.id));
    const supplierIds = new Set(data.suppliers.map((s) => s.id));
    const glIds = new Set(data.glAccounts.map((g) => g.id));
    const invoiceById = new Map(data.invoices.map((inv) => [inv.id, inv]));

    for (const inv of data.invoices) {
        expect(inv.companyId === COMPANY_ID, `${inv.id}: companyId ${inv.companyId} ≠ ${COMPANY_ID}`);
        expect(customerIds.has(inv.customerId), `${inv.id}: customerId ${inv.customerId} inexistente`);
        expect(inv.moneda === "EUR", `${inv.id}: moneda ${inv.moneda}`);
        expect(INVOICE_STATUSES.includes(inv.estado as typeof INVOICE_STATUSES[number]), `${inv.id}: estado ${inv.estado} desconocido`);
    }
    for (const si of data.supplierInvoices) {
        expect(supplierIds.has(si.supplierId), `${si.id}: supplierId ${si.supplierId} inexistente`);
    }
    for (const item of data.invoiceItems) {
        expect(invoiceById.has(item.invoiceId), `${item.id}: invoiceId ${item.invoiceId} inexistente`);
        expect(glIds.has(item.glAccountId), `${item.id}: glAccountId ${item.glAccountId} inexistente`);
        // Líneas de venta solo en cuentas de ingreso (M1) y cuenta coherente con el tipo.
        const expectedGl = item.material.startsWith("SRV-") ? REVENUE_SERVICE_ACCOUNT : REVENUE_MATERIAL_ACCOUNT;
        expect(item.glAccountId === expectedGl, `${item.id}: cuenta ${item.glAccountId} ≠ ${expectedGl} para ${item.material}`);
    }
    for (const p of data.payments) {
        const inv = invoiceById.get(p.invoiceId);
        expect(inv !== undefined, `${p.id}: invoiceId ${p.invoiceId} inexistente`);
        if (inv) expect(p.fecha >= inv.fecha, `${p.id}: pago ${p.fecha} anterior a factura ${inv.fecha}`);
    }

    // 4. Σ líneas = importe de factura (M4)
    for (const inv of data.invoices) {
        const sum = data.invoiceItems.filter((it) => it.invoiceId === inv.id).reduce((acc, it) => acc + it.importe, 0);
        expect(Math.abs(sum - inv.importe) <= TOL, `${inv.id}: Σ líneas ${sum.toFixed(2)} ≠ importe ${inv.importe.toFixed(2)}`);
    }

    // 5. Estado derivado de fecha + pagos (R3): vencimiento = fecha + 30 días
    for (const inv of data.invoices) {
        const paidAmount = data.payments.filter((p) => p.invoiceId === inv.id).reduce((acc, p) => acc + p.importe, 0);
        const due = addDays(inv.fecha, PAYMENT_TERM_DAYS);
        if (inv.estado === "PAGADA") {
            expect(Math.abs(paidAmount - inv.importe) <= TOL, `${inv.id}: PAGADA pero Σ pagos ${paidAmount.toFixed(2)} ≠ ${inv.importe.toFixed(2)}`);
        } else if (inv.estado === "VENCIDA") {
            expect(due < referenceDate, `${inv.id}: VENCIDA pero vence ${due} ≥ ${referenceDate}`);
            expect(paidAmount === 0, `${inv.id}: VENCIDA con pagos (${paidAmount.toFixed(2)})`);
        } else {
            expect(paidAmount < inv.importe, `${inv.id}: PENDIENTE pero Σ pagos ${paidAmount.toFixed(2)} ≥ ${inv.importe.toFixed(2)}`);
            expect(due >= referenceDate, `${inv.id}: PENDIENTE pero venció ${due} < ${referenceDate}`);
        }
    }

    // 6. Cobertura de clientes (M2): todos con al menos una factura
    for (const c of data.customers) {
        expect(data.invoices.some((inv) => inv.customerId === c.id), `${c.id}: cliente sin facturas`);
    }

    return errors;
}
