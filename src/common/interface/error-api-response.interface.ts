import { StatusCodes } from "http-status-codes";

export interface ApiErrorResponse {
    statusCode: StatusCodes;
    message: string;
    classError: string;
    result?: any;
    results?: any[];
}
