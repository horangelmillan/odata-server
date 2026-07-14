import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { HttpException } from "../exception/http.exception.js";
import { JSONValidatorException } from "../exception/json-validator.exception.js";
import { ApiErrorResponse } from "../interface/error-api-response.interface.js";

export class GlobalErrorMiddleware {
    static globalErrorHandler() {
        return async (err: unknown, req: Request, res: Response, next: NextFunction) => {
            let apiError: ApiErrorResponse;
            let statusCode: StatusCodes;

            if (err instanceof JSONValidatorException) {
                const jsonValidatorException: JSONValidatorException = err as JSONValidatorException;
                statusCode = StatusCodes.BAD_REQUEST;
                apiError = {
                    statusCode: statusCode,
                    message: jsonValidatorException.getMessage(),
                    classError: jsonValidatorException.constructor.name,
                    results: jsonValidatorException.getErrors(),
                };
            } else if (err instanceof HttpException) {
                const httpException: HttpException = err as HttpException;
                statusCode = httpException.getStatusCode();
                apiError = {
                    statusCode: statusCode,
                    message: httpException.getMessage(),
                    classError: httpException.constructor.name,
                };

                const result = httpException.getResult();
                apiError.result = result ? result : undefined;
            } else {
                const error: Error = err as Error;
                statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
                apiError = {
                    statusCode: statusCode,
                    message: error.message,
                    classError: error.constructor.name,
                };
            }

            res.status(statusCode);
            res.json(apiError);
        };
    }
}
