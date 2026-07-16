import { ODataControler, QueryParser } from "@phrasecode/odata";
import { InvoiceItemOData } from "../model/invoiceitem.odata.model.js";

export class InvoiceItemODataController extends ODataControler {
    constructor() {
        super({
            model: InvoiceItemOData,
            endpoint: "finance/invoiceitem-odata",
            allowedMethod: ["get", "post", "put", "delete"],
        });
    }

    public async get(query: QueryParser) {
        const params = query.getParams();
        if (!params.top || params.top > 100) {
            query.setTop(100);
        }
        const result = await this.queryable<InvoiceItemOData>(query);
        return result;
    }
}
