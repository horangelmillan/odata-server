import { PaymentOData } from "./model/payment.odata.model.js";
import { PaymentODataController } from "./controller/payment.odata.controller.js";
import { paymentService } from "./service/payment.service.js";
import type { DomainRegistration } from "../../../common/service/odata/odata-registration.interface.js";

export { PaymentOData, PaymentODataController, paymentService };

export const paymentRegistration: DomainRegistration = {
    model: PaymentOData,
    controller: new PaymentODataController(),
    writeService: paymentService,
};
