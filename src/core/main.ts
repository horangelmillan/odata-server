import express, { Router } from "express";

import { CategoryRouter } from "./category/main.js";

const CoreRouter: Router = express.Router();

CoreRouter.use("/categories", CategoryRouter);

export { CoreRouter };
