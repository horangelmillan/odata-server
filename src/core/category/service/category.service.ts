import { BaseService } from "../../../common/interface/base-service.interface.js";
import { CategoryCreateDTO, CategoryUpdateDTO } from "../dto/category.dto.js";
import { CategoryModel } from "../model/category.model.js";
import { ICategory } from "../interface/category.interface.js";

class CategoryService implements BaseService {
    async findById(id: number): Promise<ICategory | null> {
        return await CategoryModel.findOne({ where: { id } });
    }

    async findAll(options: object): Promise<ICategory[]> {
        return await CategoryModel.findAll(options);
    }

    async create(data: CategoryCreateDTO): Promise<ICategory> {
        return await CategoryModel.create(data);
    }

    async update(data: CategoryUpdateDTO, id: number): Promise<[affectedCount: number]> {
        return await CategoryModel.update(data, { where: { id } });
    }

    async delete(id: number): Promise<number> {
        return await CategoryModel.destroy({ where: { id } });
    }
}

const categoryService: CategoryService = new CategoryService();
export { categoryService };
