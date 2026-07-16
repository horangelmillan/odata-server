import { ODataControler, QueryParser } from "@phrasecode/odata";
import { CustomerOData } from "../model/customer.odata.model.js";

export class CustomerODataController extends ODataControler {
    constructor() {
        super({
            model: CustomerOData,
            endpoint: "finance/customer-odata",
            allowedMethod: ["get", "post", "put", "delete"],
        });
    }

    public async get(query: QueryParser) {
        const params = query.getParams();
        if (!params.top || params.top > 100) {
            query.setTop(100);
        }
        const result = await this.queryable<CustomerOData>(query);
        return result;
    }
}
