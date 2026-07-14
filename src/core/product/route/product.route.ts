import express, { Router } from "express";
import { ValidatorMiddleware } from "../../../common/middleware/json-validator.middleware.js";
import { productController } from "../controller/product.controller.js";
import { ProductCreateDTO, ProductUpdateDTO } from "../dto/product.dto.js";

const productRouter: Router = express.Router();

productRouter.get("/", productController.getAll);
productRouter.get("/:id", productController.getById);
productRouter.post("/", ValidatorMiddleware.validateBodyWithDTO(ProductCreateDTO), productController.create);
productRouter.put("/:id", ValidatorMiddleware.validateBodyWithDTO(ProductUpdateDTO), productController.update);
productRouter.delete("/:id", productController.delete);

export { productRouter };
