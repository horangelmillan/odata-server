import { transformAndValidate, ClassType } from "class-transformer-validator";
import { ValidationError } from "class-validator";
import type { Transaction } from "sequelize";
import { PaymentCreateDTO, PaymentUpdateDTO } from "../dto/payment.dto.js";
import { PaymentODataController } from "../controller/payment.odata.controller.js";
import { InvoiceODataController } from "../../invoice/controller/invoice.odata.controller.js";
import { recalcInvoiceStatus } from "../../invoice/service/invoice.service.js";
import {
    odataWriteService,
    type ODataBaseModel,
    type WriteResult,
} from "../../../../common/service/odata/odata-write.service.js";
import { JSONValidatorException } from "../../../../common/exception/json-validator.exception.js";

function modelOf(controller: PaymentODataController): ODataBaseModel {
    return controller.getBaseModel() as unknown as ODataBaseModel;
}

function invoiceModelOf(): ODataBaseModel {
    const controller = new InvoiceODataController();
    return controller.getBaseModel() as unknown as ODataBaseModel;
}

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

class PaymentService {
    private controller = new PaymentODataController();

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
        const dto = await validate(PaymentCreateDTO, data);
        const model = modelOf(this.controller);
        return await odataWriteService.runInTransaction(async (tx: Transaction) => {
            const result = await odataWriteService.create(model, dto as unknown as Record<string, unknown>, tx);
            await recalcInvoiceStatus(invoiceModelOf(), dto.invoiceId, tx);
            return result;
        });
    }

    async update(id: string, data: unknown): Promise<WriteResult> {
        const dto = await validate(PaymentUpdateDTO, data);
        const model = modelOf(this.controller);
        return await odataWriteService.runInTransaction(async (tx: Transaction) => {
            const oldPayment = await odataWriteService.findByPk(model, id, tx);
            const result = await odataWriteService.update(model, id, dto as unknown as Record<string, unknown>, tx);
            const invoiceId = dto.invoiceId ?? (oldPayment?.["invoiceId"] as string);
            if (invoiceId) {
                await recalcInvoiceStatus(invoiceModelOf(), invoiceId, tx);
            }
            return result;
        });
    }

    async remove(id: string): Promise<unknown> {
        const model = modelOf(this.controller);
        return await odataWriteService.runInTransaction(async (tx: Transaction) => {
            const oldPayment = await odataWriteService.findByPk(model, id, tx);
            const result = await odataWriteService.remove(model, id, tx);
            const invoiceId = oldPayment?.["invoiceId"] as string;
            if (invoiceId) {
                await recalcInvoiceStatus(invoiceModelOf(), invoiceId, tx);
            }
            return result;
        });
    }
}

const paymentService: PaymentService = new PaymentService();
export { paymentService };