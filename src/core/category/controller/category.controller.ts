import { NextFunction, Request, Response } from "express";
import { getReasonPhrase, StatusCodes } from "http-status-codes";
import { HttpException } from "../../../common/exception/http.exception.js";
import { ApiResponse } from "../../../common/interface/api-response.interface.js";
import { BaseController } from "../../../common/interface/base-controller.interface.js";
import { CategoryCreateDTO, CategoryUpdateDTO } from "../dto/category.dto.js";
import { ICategory } from "../interface/category.interface.js";
import { categoryService } from "../service/category.service.js";

class CategoryController implements BaseController {
    async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const categories: ICategory[] = await categoryService.findAll({});
            const response: ApiResponse<ICategory> = {
                statusCode: StatusCodes.OK,
                message: getReasonPhrase(StatusCodes.OK),
                results: categories,
            };
            res.json(response);
        } catch (error) {
            next(error);
        }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            const category = await categoryService.findById(id);
            if (!category) {
                throw new HttpException(StatusCodes.NOT_FOUND, `Categoría ${id} no encontrada`);
            }
            const response: ApiResponse<ICategory> = {
                statusCode: StatusCodes.OK,
                message: getReasonPhrase(StatusCodes.OK),
                result: category,
            };
            res.json(response);
        } catch (error) {
            next(error);
        }
    }

    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const data: CategoryCreateDTO = req.dto as CategoryCreateDTO;
            const result = await categoryService.create(data);
            const response: ApiResponse<ICategory> = {
                statusCode: StatusCodes.CREATED,
                message: "Categoría creada exitosamente",
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
            const existing = await categoryService.findById(id);
            if (!existing) {
                throw new HttpException(StatusCodes.NOT_FOUND, `Categoría ${id} no encontrada`);
            }
            const data: CategoryUpdateDTO = req.dto as CategoryUpdateDTO;
            const result = await categoryService.update(data, id);
            const response: ApiResponse<typeof result> = {
                statusCode: StatusCodes.OK,
                message: "Categoría actualizada exitosamente",
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
            const existing = await categoryService.findById(id);
            if (!existing) {
                throw new HttpException(StatusCodes.NOT_FOUND, `Categoría ${id} no encontrada`);
            }
            await categoryService.delete(id);
            const response: ApiResponse<null> = {
                statusCode: StatusCodes.OK,
                message: "Categoría eliminada exitosamente",
            };
            res.json(response);
        } catch (error) {
            next(error);
        }
    }
}

const categoryController: CategoryController = new CategoryController();
export { categoryController };
