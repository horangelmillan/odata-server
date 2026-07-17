import { productRegistration } from "./demo/product/main.js";
import { categoryRegistration } from "./demo/category/main.js";
import { companyRegistration } from "./finance/company/main.js";
import { customerRegistration } from "./finance/customer/main.js";
import { supplierRegistration } from "./finance/supplier/main.js";
import { glAccountRegistration } from "./finance/glaccount/main.js";
import { invoiceRegistration } from "./finance/invoice/main.js";
import { supplierInvoiceRegistration } from "./finance/supplierinvoice/main.js";
import { invoiceItemRegistration } from "./finance/invoiceitem/main.js";
import { paymentRegistration } from "./finance/payment/main.js";
import type { DomainRegistration } from "../common/service/odata/odata-registration.interface.js";

export const domainRegistrations: DomainRegistration[] = [
    productRegistration,
    categoryRegistration,
    companyRegistration,
    customerRegistration,
    supplierRegistration,
    glAccountRegistration,
    invoiceRegistration,
    supplierInvoiceRegistration,
    invoiceItemRegistration,
    paymentRegistration,
];
