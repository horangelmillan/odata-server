import { NextFunction, Request, Response } from "express";
import { getReasonPhrase, StatusCodes } from "http-status-codes";
import { HttpException } from "../../../common/exception/http.exception.js";
import { ApiResponse } from "../../../common/interface/api-response.interface.js";
import { BaseController } from "../../../common/interface/base-controller.interface.js";
import { ProductCreateDTO, ProductUpdateDTO } from "../dto/product.dto.js";
import { IProduct } from "../interface/product.interface.js";
import { productService } from "../service/product.service.js";

class ProductController implements BaseController {
    async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const products: IProduct[] = await productService.findAll({});
            const response: ApiResponse<IProduct> = {
                statusCode: StatusCodes.OK,
                message: getReasonPhrase(StatusCodes.OK),
                results: products,
            };
            res.json(response);
        } catch (error) {
            next(error);
        }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            const product = await productService.findById(id);
            if (!product) {
                throw new HttpException(StatusCodes.NOT_FOUND, `Producto ${id} no encontrado`);
            }
            const response: ApiResponse<IProduct> = {
                statusCode: StatusCodes.OK,
                message: getReasonPhrase(StatusCodes.OK),
                result: product,
            };
            res.json(response);
        } catch (error) {
            next(error);
        }
    }

    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const data: ProductCreateDTO = req.dto as ProductCreateDTO;
            const result = await productService.create(data);
            const response: ApiResponse<IProduct> = {
                statusCode: StatusCodes.CREATED,
                message: "Producto creado exitosamente",
                result,
            };
            res.status(StatusCodes.CREATED).json(response);
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            const existing = await productService.findById(id);
            if (!existing) {
                throw new HttpException(StatusCodes.NOT_FOUND, `Producto ${id} no encontrado`);
            }
            const data: ProductUpdateDTO = req.dto as ProductUpdateDTO;
            const result = await productService.update(data, id);
            const response: ApiResponse<typeof result> = {
                statusCode: StatusCodes.OK,
                message: "Producto actualizado exitosamente",
                result,
            };
            res.json(response);
        } catch (error) {
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            const existing = await productService.findById(id);
            if (!existing) {
                throw new HttpException(StatusCodes.NOT_FOUND, `Producto ${id} no encontrado`);
            }
            await productService.delete(id);
            const response: ApiResponse<null> = {
                statusCode: StatusCodes.OK,
                message: "Producto eliminado exitosamente",
            };
            res.json(response);
        } catch (error) {
            next(error);
        }
    }
}

const productController: ProductController = new ProductController();
export { productController };
