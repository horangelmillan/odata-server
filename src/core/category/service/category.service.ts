import { transformAndValidate, ClassType } from "class-transformer-validator";
import { ValidationError } from "class-validator";
import { CategoryCreateDTO, CategoryUpdateDTO } from "../dto/category.dto.js";
import { CategoryODataController } from "../controller/category.odata.controller.js";
import { odataWriteService, type ODataBaseModel } from "../../../common/service/odata/odata-write.service.js";
import { JSONValidatorException } from "../../../common/exception/json-validator.exception.js";

// Servicio OData-first del dominio `category`. Es la única capa de orquestación:
// la lectura delega en el `ODataControler` (mismo query parser que /odata/category-odata)
// y la escritura en `odataWriteService` (reusa la instancia Sequelize del datasource).
// Toda escritura se valida con los DTOs `class-validator` antes de tocar la BD.

function modelOf(controller: CategoryODataController): ODataBaseModel {
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

class CategoryService {
    private controller = new CategoryODataController();

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

    async create(data: unknown): Promise<unknown> {
        const dto = await validate(CategoryCreateDTO, data);
        const model = modelOf(this.controller);
        return await odataWriteService.runInTransaction((tx) =>
            odataWriteService.create(model, dto as unknown as Record<string, unknown>, tx),
        );
    }

    async update(id: number, data: unknown): Promise<unknown> {
        const dto = await validate(CategoryUpdateDTO, data);
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

const categoryService: CategoryService = new CategoryService();
export { categoryService };
