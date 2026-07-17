import { ODataControler } from "@phrasecode/odata";
import { WriteResult } from "./odata-write.service.js";

export interface DomainWriteService {
    create(data: unknown): Promise<WriteResult>;
    update(id: string | number, data: unknown): Promise<WriteResult>;
}

export interface DomainRegistration {
    model: { new (...args: unknown[]): unknown };
    controller: ODataControler;
    writeService?: DomainWriteService;
}
