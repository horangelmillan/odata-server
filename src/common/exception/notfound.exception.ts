import { StatusCodes } from "http-status-codes";
import { HttpException } from "./http.exception.js";

export class NotFoundException extends HttpException {
    constructor(message: string = "Resource not found") {
        super(StatusCodes.NOT_FOUND, message);
        this.name = "NotFoundException";
    }
}
