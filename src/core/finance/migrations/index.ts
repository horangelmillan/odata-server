import * as richFinancialModel from "./002-rich-financial-model.js";
import * as supplierInvoiceItemsPayments from "./003-supplierinvoice-items-payments.js";
import type { KernelMigration } from "../../../common/service/odata/migrations/migrator.js";

// RF2 (ciclo 16, F1): las migraciones del dominio finance viven en el dominio.
// El `name` es la IDENTIDAD en `SequelizeMeta`: se conserva exactamente el
// nombre que registraba el resolver glob histórico (con extensión), así que
// las bases ya migradas no re-ejecutan nada.
export const financeMigrations: KernelMigration[] = [
    {
        name: "002-rich-financial-model.ts",
        up: richFinancialModel.up,
        down: richFinancialModel.down,
    },
    {
        name: "003-supplierinvoice-items-payments.ts",
        up: supplierInvoiceItemsPayments.up,
        down: supplierInvoiceItemsPayments.down,
    },
];
