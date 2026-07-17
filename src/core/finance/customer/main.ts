import { CustomerOData } from "./model/customer.odata.model.js";
import { CustomerODataController } from "./controller/customer.odata.controller.js";
import { customerService } from "./service/customer.service.js";
import type { DomainRegistration } from "../../../common/service/odata/odata-registration.interface.js";

export { CustomerOData, CustomerODataController, customerService };

export const customerRegistration: DomainRegistration = {
    model: CustomerOData,
    controller: new CustomerODataController(),
    writeService: customerService,
};
