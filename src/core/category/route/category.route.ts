import express, { Router } from "express";
import { ValidatorMiddleware } from "../../../common/middleware/json-validator.middleware.js";
import { categoryController } from "../controller/category.controller.js";
import { CategoryCreateDTO, CategoryUpdateDTO } from "../dto/category.dto.js";

const categoryRouter: Router = express.Router();

categoryRouter.get("/", categoryController.getAll);
categoryRouter.get("/:id", categoryController.getById);
categoryRouter.post("/", ValidatorMiddleware.validateBodyWithDTO(CategoryCreateDTO), categoryController.create);
categoryRouter.put("/:id", ValidatorMiddleware.validateBodyWithDTO(CategoryUpdateDTO), categoryController.update);
categoryRouter.delete("/:id", categoryController.delete);

export { categoryRouter };
