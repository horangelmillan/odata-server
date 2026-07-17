import { InvoiceItemOData } from "./model/invoiceitem.odata.model.js";
import { InvoiceItemODataController } from "./controller/invoiceitem.odata.controller.js";
import { invoiceItemService } from "./service/invoiceitem.service.js";
import type { DomainRegistration } from "../../../common/service/odata/odata-registration.interface.js";

export { InvoiceItemOData, InvoiceItemODataController, invoiceItemService };

export const invoiceItemRegistration: DomainRegistration = {
    model: InvoiceItemOData,
    controller: new InvoiceItemODataController(),
    writeService: invoiceItemService,
};
