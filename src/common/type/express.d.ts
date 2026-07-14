import { BaseDTO } from "../dto/base.dto.js";

declare global {
    namespace Express {
        interface Request {
            dto?: BaseDTO | BaseDTO[];
            user?: any;
        }
    }
}
