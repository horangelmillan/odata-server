export const PAYMENT_TERM_DAYS = 30;

export interface PaymentSum {
    importe: number;
}

/**
 * Calcula el estado de una factura según su vencimiento y pagos.
 *
 * Reglas (f2.5 + ciclo 11):
 * - PAGADA ⇔ Σ pagos ≥ importe.
 * - VENCIDA ⇔ fecha de vencimiento (dueDate, o fallback fecha + 30d) ya pasó
 *   y no está pagada.
 * - PENDIENTE ⇔ resto (no vencida, sin pago completo).
 */
export function computeInvoiceStatus(
    fecha: string,
    importe: number,
    payments: PaymentSum[],
    referenceDate: string = new Date().toISOString().split("T")[0],
    dueDate?: string
): string {
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.importe), 0);

    if (totalPaid >= Number(importe) - 0.01) {
        return "PAGADA";
    }

    const due = dueDate
        ? new Date(dueDate).getTime()
        : new Date(fecha).getTime() + PAYMENT_TERM_DAYS * 86400000;
    const refDate = new Date(referenceDate).getTime();

    if (refDate > due) {
        return "VENCIDA";
    }

    return "PENDIENTE";
}
