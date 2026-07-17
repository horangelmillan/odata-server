import { CompanyOData } from "./model/company.odata.model.js";
import { CompanyODataController } from "./controller/company.odata.controller.js";
import { companyService } from "./service/company.service.js";
import type { DomainRegistration } from "../../../common/service/odata/odata-registration.interface.js";

export { CompanyOData, CompanyODataController, companyService };

export const companyRegistration: DomainRegistration = {
    model: CompanyOData,
    controller: new CompanyODataController(),
    writeService: companyService,
};
