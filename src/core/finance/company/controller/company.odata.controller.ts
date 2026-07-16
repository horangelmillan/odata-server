import { ODataControler, QueryParser } from "@phrasecode/odata";
import { CompanyOData } from "../model/company.odata.model.js";

export class CompanyODataController extends ODataControler {
    constructor() {
        super({
            model: CompanyOData,
            endpoint: "finance/company-odata",
            allowedMethod: ["get", "post", "put", "delete"],
        });
    }

    public async get(query: QueryParser) {
        const params = query.getParams();
        if (!params.top || params.top > 100) {
            query.setTop(100);
        }
        const result = await this.queryable<CompanyOData>(query);
        return result;
    }
}
