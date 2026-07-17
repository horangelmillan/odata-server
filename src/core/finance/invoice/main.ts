import { InvoiceOData } from "./model/invoice.odata.model.js";
import { InvoiceODataController } from "./controller/invoice.odata.controller.js";
import { invoiceService } from "./service/invoice.service.js";
import type { DomainRegistration } from "../../../common/service/odata/odata-registration.interface.js";

export { InvoiceOData, InvoiceODataController, invoiceService };

export const invoiceRegistration: DomainRegistration = {
    model: InvoiceOData,
    controller: new InvoiceODataController(),
    writeService: invoiceService,
};
