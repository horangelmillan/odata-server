import { transformAndValidate, ClassType } from "class-transformer-validator";
import { ValidationError } from "class-validator";
import type { Transaction } from "sequelize";
import { InvoiceCreateDTO, InvoiceUpdateDTO } from "../dto/invoice.dto.js";
import { InvoiceODataController } from "../controller/invoice.odata.controller.js";
import { PaymentOData } from "../../payment/model/payment.odata.model.js";
import { computeInvoiceStatus } from "./compute-status.js";
import {
    odataWriteService,
    type ODataBaseModel,
    type WriteResult,
} from "../../../../common/service/odata/odata-write.service.js";
import { modelOf } from "../../../../common/service/odata/odata-model-of.js";
import { JSONValidatorException } from "../../../../common/exception/json-validator.exception.js";


async function validate<T extends object>(dto: ClassType<T>, data: unknown): Promise<T> {
    try {
        return (await transformAndValidate(dto, data as object, {
            validator: {
                validationError: { target: false },
                whitelist: true,
                forbidNonWhitelisted: true,
            },
        })) as T;
    } catch (error: unknown) {
        if (error instanceof Array && error.every((e) => e instanceof ValidationError)) {
            throw new JSONValidatorException(`Error validando ${dto.name}`, error);
        }
        throw error;
    }
}

export async function recalcInvoiceStatus(model: ODataBaseModel, id: string, tx: Transaction): Promise<void> {
    const invoice = await odataWriteService.findByPk(model, id, tx);
    if (!invoice) return;

    const paymentModel = new PaymentOData();
    const payments = await odataWriteService.findAll(
        paymentModel as unknown as ODataBaseModel,
        { invoiceId: id },
        tx,
    );

    const newEstado = computeInvoiceStatus(
        invoice["fecha"] as string,
        Number(invoice["importe"]),
        payments.map((p) => ({ importe: Number(p["importe"]) })),
        new Date().toISOString().split("T")[0],
        invoice["dueDate"] as string | undefined,
    );

    if (newEstado !== invoice["estado"]) {
        await odataWriteService.update(model, id, { estado: newEstado } as Record<string, unknown>, tx);
    }
}

class InvoiceService {
    private controller = new InvoiceODataController();

    async findAll(query: unknown): Promise<unknown> {
        return await this.controller.get(query as never);
    }

    async findById(id: string): Promise<unknown> {
        const model = modelOf(this.controller);
        const result = await odataWriteService.runInTransaction((tx) =>
            odataWriteService.findByPk(model, id, tx),
        );
        return result;
    }

    async create(data: unknown): Promise<WriteResult> {
        const dto = await validate(InvoiceCreateDTO, data);
        const model = modelOf(this.controller);
        const today = new Date().toISOString().split("T")[0];
        const dueDate = dto.dueDate ?? new Date(new Date(dto.fecha).getTime() + 30 * 86400000).toISOString().split("T")[0];
        dto.estado = computeInvoiceStatus(dto.fecha, dto.importe, [], today, dueDate);
        return await odataWriteService.runInTransaction((tx) =>
            odataWriteService.create(model, dto as unknown as Record<string, unknown>, tx),
        );
    }

    async update(id: string, data: unknown): Promise<WriteResult> {
        const dto = await validate(InvoiceUpdateDTO, data);
        const model = modelOf(this.controller);
        return await odataWriteService.runInTransaction(async (tx) => {
            const result = await odataWriteService.update(model, id, dto as unknown as Record<string, unknown>, tx);
            await recalcInvoiceStatus(model, id, tx);
            return result;
        });
    }

    async remove(id: string): Promise<unknown> {
        const model = modelOf(this.controller);
        return await odataWriteService.runInTransaction((tx) =>
            odataWriteService.remove(model, id, tx),
        );
    }
}

const invoiceService: InvoiceService = new InvoiceService();
export { invoiceService };