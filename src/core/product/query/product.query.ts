import { db } from "../../../common/service/ORM/sequelize.service.js";
import { BaseQuery } from "../../../common/interface/base-query.interface.js";
import { QueryTypes } from "sequelize";

const SQL_FIND_EXPENSIVE_PRODUCTS = `
    SELECT id, nombre, precio, categoria
    FROM products
    WHERE precio > :minPrice
    ORDER BY precio DESC
    LIMIT :limit
`;

class ExpensiveProductsQuery implements BaseQuery {
    async execute(params?: { minPrice?: number; limit?: number }): Promise<any> {
        const results = await db.query(SQL_FIND_EXPENSIVE_PRODUCTS, {
            replacements: {
                minPrice: params?.minPrice || 1000,
                limit: params?.limit || 10,
            },
            type: QueryTypes.SELECT,
        });
        return results;
    }
}

const expensiveProductsQuery: ExpensiveProductsQuery = new ExpensiveProductsQuery();
export { expensiveProductsQuery };
