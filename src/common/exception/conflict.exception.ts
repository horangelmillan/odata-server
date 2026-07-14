import { StatusCodes } from "http-status-codes";
import { HttpException } from "./http.exception.js";

export class ConflictException extends HttpException {
    constructor(message: string = "Resource already exists") {
        super(StatusCodes.CONFLICT, message);
        this.name = "ConflictException";
    }
}
