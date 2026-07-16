import { ODataControler, QueryParser } from "@phrasecode/odata";
import { ProductOData } from "../model/product.odata.model.js";

export class ProductODataController extends ODataControler {
    constructor() {
        super({
            model: ProductOData,
            endpoint: "product-odata",
            allowedMethod: ["get", "post", "put", "delete"],
        });
    }

    public async get(query: QueryParser) {
        const params = query.getParams();
        if (!params.top || params.top > 100) {
            query.setTop(100);
        }
        const result = await this.queryable<ProductOData>(query);
        return result;
    }
}
