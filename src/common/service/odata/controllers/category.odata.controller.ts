import { ODataControler, QueryParser } from "@phrasecode/odata";
import { CategoryOData } from "../models/category.odata.model.js";

export class CategoryODataController extends ODataControler {
    constructor() {
        super({
            model: CategoryOData,
            allowedMethod: ["get"],
        });
    }

    public async get(query: QueryParser) {
        const params = query.getParams();
        if (!params.top || params.top > 100) {
            query.setTop(100);
        }
        const result = await this.queryable<CategoryOData>(query);
        return result;
    }
}
