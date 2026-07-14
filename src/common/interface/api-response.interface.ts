import { StatusCodes } from "http-status-codes";

export interface ApiResponse<T = any> {
    statusCode: StatusCodes;
    message: string;
    result?: T | any;
    results?: T[];
}
