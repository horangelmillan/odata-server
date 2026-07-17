import { GlAccountOData } from "./model/glaccount.odata.model.js";
import { GlAccountODataController } from "./controller/glaccount.odata.controller.js";
import { glAccountService } from "./service/glaccount.service.js";
import type { DomainRegistration } from "../../../common/service/odata/odata-registration.interface.js";

export { GlAccountOData, GlAccountODataController, glAccountService };

export const glAccountRegistration: DomainRegistration = {
    model: GlAccountOData,
    controller: new GlAccountODataController(),
    writeService: glAccountService,
};
