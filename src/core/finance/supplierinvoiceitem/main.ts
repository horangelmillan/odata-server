import { SupplierInvoiceItemOData } from "./model/supplierinvoiceitem.odata.model.js";
import { SupplierInvoiceItemODataController } from "./controller/supplierinvoiceitem.odata.controller.js";
import { supplierInvoiceItemService } from "./service/supplierinvoiceitem.service.js";
import type { DomainRegistration } from "../../../common/service/odata/odata-registration.interface.js";

export { SupplierInvoiceItemOData, SupplierInvoiceItemODataController, supplierInvoiceItemService };

export const supplierInvoiceItemRegistration: DomainRegistration = {
    model: SupplierInvoiceItemOData,
    controller: new SupplierInvoiceItemODataController(),
    writeService: supplierInvoiceItemService,
};
