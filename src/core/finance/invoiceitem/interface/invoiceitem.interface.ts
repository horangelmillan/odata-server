export interface IInvoiceItem {
    id: string;
    invoiceId: string;
    glAccountId: string;
    material: string;
    cantidad: number;
    importe: number;
}
