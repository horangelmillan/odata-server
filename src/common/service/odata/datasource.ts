import { DataSource } from "@phrasecode/odata";
import type { IDbConfig } from "@phrasecode/odata";
import { env } from "../../config/env.config.js";
import { ProductOData } from "../../../core/demo/product/model/product.odata.model.js";
import { CategoryOData } from "../../../core/demo/category/model/category.odata.model.js";
import { CompanyOData } from "../../../core/finance/company/model/company.odata.model.js";
import { CustomerOData } from "../../../core/finance/customer/model/customer.odata.model.js";
import { SupplierOData } from "../../../core/finance/supplier/model/supplier.odata.model.js";
import { GlAccountOData } from "../../../core/finance/glaccount/model/glaccount.odata.model.js";
import { InvoiceOData } from "../../../core/finance/invoice/model/invoice.odata.model.js";
import { SupplierInvoiceOData } from "../../../core/finance/supplierinvoice/model/supplierinvoice.odata.model.js";
import { InvoiceItemOData } from "../../../core/finance/invoiceitem/model/invoiceitem.odata.model.js";
import { PaymentOData } from "../../../core/finance/payment/model/payment.odata.model.js";

const dbConfig = env.isProd ? env.prodDb : env.devDb;

const dataSourceConfig: Record<string, unknown> = {
    dialect: dbConfig.dialect,
    database: dbConfig.database,
    username: dbConfig.username,
    password: dbConfig.password,
    host: dbConfig.host,
    port: dbConfig.port,
    pool: {
        max: 10,
        min: 2,
        idle: 10000,
        acquire: 30000,
    },
    models: [ProductOData, CategoryOData, CompanyOData, CustomerOData, SupplierOData, GlAccountOData, InvoiceOData, SupplierInvoiceOData, InvoiceItemOData, PaymentOData],
};

if (env.isProd) {
    dataSourceConfig.ssl = { require: true, rejectUnauthorized: false };
}

export const dataSource = new DataSource(dataSourceConfig as unknown as IDbConfig);
