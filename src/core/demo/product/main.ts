import { ProductOData } from "./model/product.odata.model.js";
import { ProductODataController } from "./controller/product.odata.controller.js";
import { productService } from "./service/product.service.js";
import type { DomainRegistration } from "../../../common/service/odata/odata-registration.interface.js";

export { ProductOData, ProductODataController, productService };

export const productRegistration: DomainRegistration = {
    model: ProductOData,
    controller: new ProductODataController(),
    writeService: productService,
};
