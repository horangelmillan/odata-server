import { SupplierPaymentOData } from "./model/supplierpayment.odata.model.js";
import { SupplierPaymentODataController } from "./controller/supplierpayment.odata.controller.js";
import { supplierPaymentService } from "./service/supplierpayment.service.js";
import type { DomainRegistration } from "../../../common/service/odata/odata-registration.interface.js";

export { SupplierPaymentOData, SupplierPaymentODataController, supplierPaymentService };

export const supplierPaymentRegistration: DomainRegistration = {
    model: SupplierPaymentOData,
    controller: new SupplierPaymentODataController(),
    writeService: supplierPaymentService,
};
