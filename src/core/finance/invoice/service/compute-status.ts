export const PAYMENT_TERM_DAYS = 30;

export interface PaymentSum {
    importe: number;
}

export function computeInvoiceStatus(
    fecha: string,
    importe: number,
    payments: PaymentSum[],
    referenceDate: string = new Date().toISOString().split("T")[0]
): string {
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.importe), 0);

    if (totalPaid >= Number(importe) - 0.01) {
        return "PAGADA";
    }

    const invoiceDate = new Date(fecha).getTime();
    const refDate = new Date(referenceDate).getTime();
    const daysSinceInvoice = (refDate - invoiceDate) / (1000 * 60 * 60 * 24);

    if (daysSinceInvoice > PAYMENT_TERM_DAYS) {
        return "VENCIDA";
    }

    return "PENDIENTE";
}
