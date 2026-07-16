import { ODataControler, QueryParser } from "@phrasecode/odata";
import { PaymentOData } from "../model/payment.odata.model.js";

export class PaymentODataController extends ODataControler {
    constructor() {
        super({
            model: PaymentOData,
            endpoint: "finance/payment-odata",
            allowedMethod: ["get", "post", "put", "delete"],
        });
    }

    public async get(query: QueryParser) {
        const params = query.getParams();
        if (!params.top || params.top > 100) {
            query.setTop(100);
        }
        const result = await this.queryable<PaymentOData>(query);
        return result;
    }
}
