import { ODataControler, QueryParser } from "@phrasecode/odata";
import { SupplierOData } from "../model/supplier.odata.model.js";

export class SupplierODataController extends ODataControler {
    constructor() {
        super({
            model: SupplierOData,
            endpoint: "finance/supplier-odata",
            allowedMethod: ["get", "post", "put", "delete"],
        });
    }

    public async get(query: QueryParser) {
        const params = query.getParams();
        if (!params.top || params.top > 100) {
            query.setTop(100);
        }
        const result = await this.queryable<SupplierOData>(query);
        return result;
    }
}
