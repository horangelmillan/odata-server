import { transformAndValidate, ClassType } from "class-transformer-validator";
import { ValidationError } from "class-validator";
import { SupplierInvoiceItemCreateDTO, SupplierInvoiceItemUpdateDTO } from "../dto/supplierinvoiceitem.dto.js";
import { SupplierInvoiceItemODataController } from "../controller/supplierinvoiceitem.odata.controller.js";
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

class SupplierInvoiceItemService {
    private controller = new SupplierInvoiceItemODataController();

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
        const dto = await validate(SupplierInvoiceItemCreateDTO, data);
        const model = modelOf(this.controller);
        return await odataWriteService.runInTransaction((tx) =>
            odataWriteService.create(model, dto as unknown as Record<string, unknown>, tx),
        );
    }

    async update(id: string, data: unknown): Promise<WriteResult> {
        const dto = await validate(SupplierInvoiceItemUpdateDTO, data);
        const model = modelOf(this.controller);
        return await odataWriteService.runInTransaction((tx) =>
            odataWriteService.update(model, id, dto as unknown as Record<string, unknown>, tx),
        );
    }

    async remove(id: string): Promise<unknown> {
        const model = modelOf(this.controller);
        return await odataWriteService.runInTransaction((tx) =>
            odataWriteService.remove(model, id, tx),
        );
    }
}

const supplierInvoiceItemService: SupplierInvoiceItemService = new SupplierInvoiceItemService();
export { supplierInvoiceItemService };
