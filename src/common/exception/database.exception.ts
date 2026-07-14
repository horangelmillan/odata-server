import { StatusCodes } from "http-status-codes";
import { HttpException } from "./http.exception.js";

export class DatabaseException extends HttpException {
    constructor(message: string = "Database error occurred") {
        super(StatusCodes.INTERNAL_SERVER_ERROR, message);
        this.name = "DatabaseException";
    }
}
