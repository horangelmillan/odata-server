import { ODataControler, QueryParser } from "@phrasecode/odata";
import { GlAccountOData } from "../model/glaccount.odata.model.js";

export class GlAccountODataController extends ODataControler {
    constructor() {
        super({
            model: GlAccountOData,
            endpoint: "finance/glaccount-odata",
            allowedMethod: ["get", "post", "put", "delete"],
        });
    }

    public async get(query: QueryParser) {
        const params = query.getParams();
        if (!params.top || params.top > 100) {
            query.setTop(100);
        }
        const result = await this.queryable<GlAccountOData>(query);
        return result;
    }
}
