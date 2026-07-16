import { ODataControler, QueryParser } from "@phrasecode/odata";
import { InvoiceOData } from "../model/invoice.odata.model.js";

export class InvoiceODataController extends ODataControler {
    constructor() {
        super({
            model: InvoiceOData,
            endpoint: "finance/invoice-odata",
            allowedMethod: ["get", "post", "put", "delete"],
        });
    }

    public async get(query: QueryParser) {
        const params = query.getParams();
        if (!params.top || params.top > 100) {
            query.setTop(100);
        }
        const result = await this.queryable<InvoiceOData>(query);
        return result;
    }
}
