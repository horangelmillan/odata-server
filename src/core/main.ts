import express, { Router } from "express";

import { ProductRouter } from "./product/main.js";

const CoreRouter: Router = express.Router();

CoreRouter.use("/products", ProductRouter);

export { CoreRouter };
