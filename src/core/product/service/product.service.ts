import { transformAndValidate, ClassType } from "class-transformer-validator";
import { ValidationError } from "class-validator";
import { ProductCreateDTO, ProductUpdateDTO } from "../dto/product.dto.js";
import { ProductODataController } from "../controller/product.odata.controller.js";
import {
    odataWriteService,
    type ODataBaseModel,
    type WriteResult,
} from "../../../common/service/odata/odata-write.service.js";
import { JSONValidatorException } from "../../../common/exception/json-validator.exception.js";

// Servicio OData-first del dominio `product`. Es la única capa de orquestación:
// la lectura delega en el `ODataControler` (mismo query parser que /odata/product-odata)
// y la escritura en `odataWriteService` (reusa la instancia Sequelize del datasource).
// Toda escritura se valida con los DTOs `class-validator` (F4: la validación vive
// en el dominio; `odata-write.routes.ts` delega aquí y convierte el fallo de
// validación en un 400 OData v4).

function modelOf(controller: ProductODataController): ODataBaseModel {
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

class ProductService {
    private controller = new ProductODataController();

    async findAll(query: unknown): Promise<unknown> {
        return await this.controller.get(query as never);
    }

    async findById(id: number): Promise<unknown> {
        const model = modelOf(this.controller);
        const result = await odataWriteService.runInTransaction((tx) =>
            odataWriteService.findByPk(model, id, tx),
        );
        return result;
    }

    async create(data: unknown): Promise<WriteResult> {
        const dto = await validate(ProductCreateDTO, data);
        const model = modelOf(this.controller);
        return await odataWriteService.runInTransaction((tx) =>
            odataWriteService.create(model, dto as unknown as Record<string, unknown>, tx),
        );
    }

    async update(id: number, data: unknown): Promise<WriteResult> {
        const dto = await validate(ProductUpdateDTO, data);
        const model = modelOf(this.controller);
        return await odataWriteService.runInTransaction((tx) =>
            odataWriteService.update(model, id, dto as unknown as Record<string, unknown>, tx),
        );
    }

    async remove(id: number): Promise<unknown> {
        const model = modelOf(this.controller);
        return await odataWriteService.runInTransaction((tx) =>
            odataWriteService.remove(model, id, tx),
        );
    }
}

const productService: ProductService = new ProductService();
export { productService };
