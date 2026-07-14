import { Request, Response, NextFunction } from "express";

export class ODataContextMiddleware {
    static handler(req: Request, res: Response, next: NextFunction) {
        if (req.path.includes("$metadata")) {
            req.url = "/$metadata";
        }
        res.set("OData-Version", "4.0");
        next();
    }
}
