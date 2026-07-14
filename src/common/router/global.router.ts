import express, { Router } from "express";
import { CoreRouter } from "../../core/main.js";

const GlobalRouter: Router = express.Router();

GlobalRouter.use("/core", CoreRouter);

export { GlobalRouter };
