import { StatusCodes, getReasonPhrase } from "http-status-codes";

export class HttpException extends Error {
    private result?: any;

    constructor(
        private statusCode: StatusCodes,
        message: string = getReasonPhrase(statusCode),
        result?: any,
    ) {
        super(message);
        this.name = "HttpException";
        this.result = result;
    }

    getStatusCode(): StatusCodes {
        return this.statusCode;
    }

    getMessage(): string {
        return this.message;
    }

    getResult(): any {
        return this.result;
    }
}
