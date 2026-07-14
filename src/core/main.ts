import express, { Router } from "express";

import { ProductRouter } from "./product/main.js";
import { CategoryRouter } from "./category/main.js";

const CoreRouter: Router = express.Router();

CoreRouter.use("/products", ProductRouter);
CoreRouter.use("/categories", CategoryRouter);

export { CoreRouter };
