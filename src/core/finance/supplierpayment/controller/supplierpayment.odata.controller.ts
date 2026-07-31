import { ODataControler, QueryParser } from "@phrasecode/odata";
import { SupplierPaymentOData } from "../model/supplierpayment.odata.model.js";

export class SupplierPaymentODataController extends ODataControler {
    constructor() {
        super({
            model: SupplierPaymentOData,
            endpoint: "finance/supplierpayment-odata",
            allowedMethod: ["get", "post", "put", "delete"],
        });
    }

    public async get(query: QueryParser) {
        const params = query.getParams();
        if (!params.top || params.top > 100) {
            query.setTop(100);
        }
        const result = await this.queryable<SupplierPaymentOData>(query);
        return result;
    }
}
