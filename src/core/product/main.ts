import express, { Router } from "express";
import { productRouter } from "./route/product.route.js";

const ProductRouter: Router = express.Router();

ProductRouter.use("/", productRouter);

export { ProductRouter };
