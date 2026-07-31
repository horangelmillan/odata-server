export interface ISupplierInvoice {
    id: string;
    supplierId: string;
    fecha: string;
    dueDate?: string;
    importe: number;
    netAmount?: number;
    taxAmount?: number;
    grossAmount?: number;
    docNumber?: string;
    moneda: string;
    estado: string;
}
