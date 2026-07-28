import { Umzug, SequelizeStorage } from "umzug";
import type { Sequelize } from "sequelize";

let _umzug: Umzug<Sequelize> | null = null;

export function createMigrator(sequelize: Sequelize): Umzug<Sequelize> {
  if (_umzug) return _umzug;

  _umzug = new Umzug<Sequelize>({
    migrations: {
      glob: ["*.ts", { cwd: new URL(".", import.meta.url).pathname }],
      resolve: ({ path, name }) => {
        if (!path) throw new Error(`Migration path not found for '${name}'`);
        const filePath = path;
        return {
          name,
          up: async (ctx) => {
            const mod = await import(filePath);
            await mod.up({ context: ctx.context.getQueryInterface() });
          },
          down: async (ctx) => {
            const mod = await import(filePath);
            await mod.down({ context: ctx.context.getQueryInterface() });
          },
        };
      },
    },
    context: sequelize,
    storage: new SequelizeStorage({ sequelize, tableName: "SequelizeMeta" }),
    logger: console,
  });

  return _umzug;
}

export async function runMigrations(sequelize: Sequelize): Promise<void> {
  const umzug = createMigrator(sequelize);
  const pending = await umzug.pending();
  if (pending.length === 0) {
    console.log("Migrations: no pending migrations");
    return;
  }
  console.log(`Migrations: ${pending.length} pending (${pending.map((m) => m.name).join(", ")})`);
  await umzug.up();
  console.log("Migrations: all applied");
}
