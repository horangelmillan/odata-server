import { CategoryOData } from "./model/category.odata.model.js";
import { CategoryODataController } from "./controller/category.odata.controller.js";
import { categoryService } from "./service/category.service.js";
import type { DomainRegistration } from "../../../common/service/odata/odata-registration.interface.js";

export { CategoryOData, CategoryODataController, categoryService };

export const categoryRegistration: DomainRegistration = {
    model: CategoryOData,
    controller: new CategoryODataController(),
    writeService: categoryService,
};
