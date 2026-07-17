import { SupplierOData } from "./model/supplier.odata.model.js";
import { SupplierODataController } from "./controller/supplier.odata.controller.js";
import { supplierService } from "./service/supplier.service.js";
import type { DomainRegistration } from "../../../common/service/odata/odata-registration.interface.js";

export { SupplierOData, SupplierODataController, supplierService };

export const supplierRegistration: DomainRegistration = {
    model: SupplierOData,
    controller: new SupplierODataController(),
    writeService: supplierService,
};
