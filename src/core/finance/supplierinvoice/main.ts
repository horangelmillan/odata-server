import { SupplierInvoiceOData } from "./model/supplierinvoice.odata.model.js";
import { SupplierInvoiceODataController } from "./controller/supplierinvoice.odata.controller.js";
import { supplierInvoiceService } from "./service/supplierinvoice.service.js";
import type { DomainRegistration } from "../../../common/service/odata/odata-registration.interface.js";

export { SupplierInvoiceOData, SupplierInvoiceODataController, supplierInvoiceService };

export const supplierInvoiceRegistration: DomainRegistration = {
    model: SupplierInvoiceOData,
    controller: new SupplierInvoiceODataController(),
    writeService: supplierInvoiceService,
};
