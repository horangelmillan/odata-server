import { ODataControler, QueryParser } from "@phrasecode/odata";
import { SupplierInvoiceOData } from "../model/supplierinvoice.odata.model.js";

export class SupplierInvoiceODataController extends ODataControler {
    constructor() {
        super({
            model: SupplierInvoiceOData,
            endpoint: "finance/supplierinvoice-odata",
            allowedMethod: ["get", "post", "put", "delete"],
        });
    }

    public async get(query: QueryParser) {
        const params = query.getParams();
        if (!params.top || params.top > 100) {
            query.setTop(100);
        }
        const result = await this.queryable<SupplierInvoiceOData>(query);
        return result;
    }
}
