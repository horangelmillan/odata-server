export interface IPayment {
    id: string;
    invoiceId: string;
    fecha: string;
    importe: number;
    metodo: string;
}
