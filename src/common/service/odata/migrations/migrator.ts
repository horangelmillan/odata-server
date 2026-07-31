import { Umzug, SequelizeStorage } from "umzug";
import type { Sequelize, QueryInterface } from "sequelize";

// RF2 (ciclo 16, F1): migración del kernel/dominio con la misma firma que
// Umzug espera (`up({ context })` con `context = QueryInterface`).
export interface KernelMigration {
    name: string;
    up(context: { context: QueryInterface }): Promise<void>;
    down(context: { context: QueryInterface }): Promise<void>;
}

// RF2 (ciclo 16, F1): las migraciones llegan como lista explícita desde el
// bootstrap (baseline + migraciones de dominio). Sin glob ni `file://` — la
// resolución de archivos la hace tsc en build, así que funciona igual en dev
// (.ts) y en dist (.js). El `name` conserva la identidad en `SequelizeMeta`
// (no cambia el nombre histórico), por lo que las bases ya migradas no
// re-ejecutan nada. Elimina de raíz el bug DAP2 (pending vacío en Windows y
// en dist).
export async function runMigrations(
    sequelize: Sequelize,
    migrations: KernelMigration[],
): Promise<void> {
    const umzug = new Umzug<Sequelize>({
        migrations: migrations.map((m) => ({
            name: m.name,
            up: (ctx) => m.up({ context: ctx.context.getQueryInterface() }),
            down: (ctx) => m.down({ context: ctx.context.getQueryInterface() }),
        })),
        context: sequelize,
        storage: new SequelizeStorage({ sequelize, tableName: "SequelizeMeta" }),
        logger: console,
    });

    const pending = await umzug.pending();
    if (pending.length === 0) {
        console.log("Migrations: no pending migrations");
        return;
    }
    console.log(`Migrations: ${pending.length} pending (${pending.map((m) => m.name).join(", ")})`);
    await umzug.up();
    console.log("Migrations: all applied");
}
