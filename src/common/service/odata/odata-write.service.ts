import type { Sequelize, Transaction, ModelStatic, Model as SequelizeModel } from "sequelize";
import { dataSource } from "./datasource.js";
import { etagValueOf } from "./odata-etag.js";

// --- Contratos mínimos de la metadata que expone @phrasecode/odata ---
// (Model.getMetadata() en la librería; ver core/model.js)

interface ColumnMeta {
    propertyKey: string;
    columnIdentifier: string;
    isPrimaryKey?: boolean;
    isAutoIncrement?: boolean;
}

interface ModelMetadata {
    tableMetadata: { modelName: string; tableIdentifier: string };
    columnMetadata: ColumnMeta[];
}

// Contrato mínimo del modelo OData del dominio (la clase concreta de
// @phrasecode/odata expuesta por el controlador vía `getBaseModel()`). NO es un
// `ModelStatic` de Sequelize: solo expone su metadata. Para obtener el modelo
// Sequelize real se usa `resolveSequelizeModel` (ver abajo).
export interface ODataBaseModel {
    getMetadata(): ModelMetadata;
    getModelName(): string;
}

// La librería no expone una ruta de escritura: su DataSource solo hace
// executeSelect/rawQuery. Para NO duplicar el pool de conexiones (anti-pattern),
// reutilizamos la MISMA instancia de Sequelize que ya creó el SequelizerAdaptor.
// Es la única dependencia interna que tocamos; se aísla aquí tras un solo cast.
interface DataSourceInternal {
    sequelizerAdaptor: { sequelize: Sequelize };
}

export interface WriteResult {
    primaryKey: string;
    key: unknown;
    entity: Record<string, unknown> | null;
}

class ODataWriteService {
    private sequelize(): Sequelize {
        return (dataSource as unknown as DataSourceInternal).sequelizerAdaptor.sequelize;
    }

    runInTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
        return this.sequelize().transaction(fn);
    }

    // F4: resuelve el `ModelStatic` de Sequelize real a partir del modelo OData
    // del dominio. El modelo de @phrasecode/odata NO es un `ModelStatic` de
    // Sequelize (solo expone `getMetadata()`), así que el SequelizerAdaptor lo
    // define por separado y lo indexa en `sequelize.models` por su
    // `tableIdentifier`. Este helper centraliza ese acceso tipado y elimina el
    // cast frágil esparcido: el `tableIdentifier` siempre coincide con la clave
    // del mapa porque es el mismo adaptador quien registra el modelo.
    private resolveSequelizeModel(model: ODataBaseModel): ModelStatic<SequelizeModel> {
        const { tableIdentifier } = model.getMetadata().tableMetadata;
        const sqModel = this.sequelize().models[tableIdentifier];
        if (!sqModel) {
            throw new Error(`Sequelize model for '${tableIdentifier}' not found`);
        }
        return sqModel as ModelStatic<SequelizeModel>;
    }

    private resolve(model: ODataBaseModel): {
        meta: ModelMetadata;
        sqModel: ModelStatic<SequelizeModel>;
        pk: ColumnMeta;
    } {
        const meta = model.getMetadata();
        const sqModel = this.resolveSequelizeModel(model);
        const pk = meta.columnMetadata.find((column) => column.isPrimaryKey) ?? meta.columnMetadata[0];
        return { meta, sqModel, pk };
    }

    // Whitelist: solo columnas conocidas del modelo; ignora navegación y campos
    // desconocidos. En create se descarta la PK auto-incremental.
    private toColumns(
        meta: ModelMetadata,
        data: Record<string, unknown>,
        options: { includePk: boolean },
    ): Record<string, unknown> {
        const byProperty = new Map(meta.columnMetadata.map((column) => [column.propertyKey, column]));
        const payload: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(data ?? {})) {
            const column = byProperty.get(key);
            if (!column) continue;
            if (column.isPrimaryKey && column.isAutoIncrement && !options.includePk) continue;
            payload[column.columnIdentifier] = value;
        }
        return payload;
    }

    async findByPk(model: ODataBaseModel, keyValue: unknown, tx: Transaction): Promise<Record<string, unknown> | null> {
        const { sqModel } = this.resolve(model);
        const row = await sqModel.findByPk(keyValue as never, { transaction: tx });
        return row ? (row.toJSON() as Record<string, unknown>) : null;
    }

    async create(
        model: ODataBaseModel,
        data: Record<string, unknown>,
        tx: Transaction,
    ): Promise<WriteResult> {
        const { meta, sqModel, pk } = this.resolve(model);
        const payload = this.toColumns(meta, data, { includePk: false });
        // G1: asegura un `@odata.etag` estable en la entidad creada (el modelo
        // Sequelize real puede no tener timestamps:true), igual que en update.
        const createdAtCol = meta.columnMetadata.find((column) => column.propertyKey === "createdAt");
        const updatedAtCol = meta.columnMetadata.find((column) => column.propertyKey === "updatedAt");
        const now = new Date();
        if (createdAtCol && payload[createdAtCol.columnIdentifier] === undefined) {
            payload[createdAtCol.columnIdentifier] = now;
        }
        if (updatedAtCol) payload[updatedAtCol.columnIdentifier] = now;
        const created = await sqModel.create(payload, { transaction: tx });
        const json = created.toJSON() as Record<string, unknown>;
        return { primaryKey: pk.propertyKey, key: json[pk.columnIdentifier], entity: json };
    }

    async update(
        model: ODataBaseModel,
        keyValue: unknown,
        data: Record<string, unknown>,
        tx: Transaction,
    ): Promise<WriteResult> {
        const { meta, sqModel, pk } = this.resolve(model);
        const payload = this.toColumns(meta, data, { includePk: false });
        // G1: rota el etag en cada update. El modelo OData puede no tener
        // `timestamps:true`, así que forzamos `updatedAt` para que el
        // `@odata.etag` cambie y la concurrencia optimista de SAPUI5 funcione.
        const updatedAtCol = meta.columnMetadata.find((column) => column.propertyKey === "updatedAt");
        if (updatedAtCol) payload[updatedAtCol.columnIdentifier] = new Date();
        const [affected] = await sqModel.update(payload, {
            where: { [pk.columnIdentifier]: keyValue },
            transaction: tx,
        });
        if (affected === 0) {
            return { primaryKey: pk.propertyKey, key: keyValue, entity: null };
        }
        const row = await sqModel.findByPk(keyValue as never, { transaction: tx });
        return { primaryKey: pk.propertyKey, key: keyValue, entity: row ? (row.toJSON() as Record<string, unknown>) : null };
    }

    async remove(model: ODataBaseModel, keyValue: unknown, tx: Transaction): Promise<{ deleted: boolean }> {
        const { sqModel, pk } = this.resolve(model);
        const affected = await sqModel.destroy({
            where: { [pk.columnIdentifier]: keyValue },
            transaction: tx,
        });
        return { deleted: affected > 0 };
    }

    // G1: devuelve el etag actual de la entidad (`updatedAt`, fallback
    // `createdAt`) como string ISO, o `null` si no existe. Usado para validar
    // `If-Match` en update/delete (concurrencia optimista de SAPUI5).
    async getCurrentEtag(model: ODataBaseModel, keyValue: unknown): Promise<string | null> {
        const { sqModel } = this.resolve(model);
        const row = await sqModel.findByPk(keyValue as never);
        if (!row) return null;
        const json = row.toJSON() as Record<string, unknown>;
        const value = json["updatedAt"] ?? json["createdAt"];
        return etagValueOf(value) ?? null;
    }
}

export const odataWriteService = new ODataWriteService();
