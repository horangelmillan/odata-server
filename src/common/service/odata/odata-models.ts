// DT1 (ciclo 14): única fuente de verdad de la lista de modelos OData.
// `datasource.ts` la consume; `core/main.ts` registra los dominios
// (model + controller + writeService). El test de consistencia
// `odata-models.consistency.test.ts` verifica que ambas listas coinciden,
// de modo que añadir un dominio sin su modelo (o viceversa) rompe el CI.
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
import { SupplierInvoiceItemOData } from "../../../core/finance/supplierinvoiceitem/model/supplierinvoiceitem.odata.model.js";
import { SupplierPaymentOData } from "../../../core/finance/supplierpayment/model/supplierpayment.odata.model.js";

export const odataModels = [
    ProductOData,
    CategoryOData,
    CompanyOData,
    CustomerOData,
    SupplierOData,
    GlAccountOData,
    InvoiceOData,
    SupplierInvoiceOData,
    InvoiceItemOData,
    PaymentOData,
    SupplierInvoiceItemOData,
    SupplierPaymentOData,
] as const;
