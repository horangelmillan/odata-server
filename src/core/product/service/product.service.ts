import { BaseService } from "../../../common/interface/base-service.interface.js";
import { ProductCreateDTO, ProductUpdateDTO } from "../dto/product.dto.js";
import { ProductModel } from "../model/product.model.js";
import { IProduct } from "../interface/product.interface.js";

class ProductService implements BaseService {
    async findById(id: number): Promise<IProduct | null> {
        return await ProductModel.findOne({ where: { id } });
    }

    async findAll(options: object): Promise<IProduct[]> {
        return await ProductModel.findAll(options);
    }

    async create(data: ProductCreateDTO): Promise<IProduct> {
        return await ProductModel.create(data);
    }

    async update(data: ProductUpdateDTO, id: number): Promise<[affectedCount: number]> {
        return await ProductModel.update(data, { where: { id } });
    }

    async delete(id: number): Promise<number> {
        return await ProductModel.destroy({ where: { id } });
    }
}

const productService: ProductService = new ProductService();
export { productService };
