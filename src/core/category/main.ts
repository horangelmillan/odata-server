import express, { Router } from "express";
import { categoryRouter } from "./route/category.route.js";

const CategoryRouter: Router = express.Router();

CategoryRouter.use("/", categoryRouter);

export { CategoryRouter };
