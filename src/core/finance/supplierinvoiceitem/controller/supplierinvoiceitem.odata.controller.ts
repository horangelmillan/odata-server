import { ODataControler } from "../../../../common/service/odata/odata-runtime.js";
import type { QueryParser } from "@phrasecode/odata";
import { SupplierInvoiceItemOData } from "../model/supplierinvoiceitem.odata.model.js";

export class SupplierInvoiceItemODataController extends ODataControler {
    constructor() {
        super({
            model: SupplierInvoiceItemOData,
            endpoint: "finance/supplierinvoiceitem-odata",
            allowedMethod: ["get", "post", "put", "delete"],
        });
    }

    public async get(query: QueryParser) {
        const params = query.getParams();
        if (!params.top || params.top > 100) {
            query.setTop(100);
        }
        const result = await this.queryable<SupplierInvoiceItemOData>(query);
        return result;
    }
}
