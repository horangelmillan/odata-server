export interface IInvoice {
    id: string;
    companyId: string;
    customerId: string;
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
