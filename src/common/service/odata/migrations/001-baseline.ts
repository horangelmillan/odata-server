import type { QueryInterface, ModelAttributes } from "sequelize";
import { DataTypes } from "sequelize";
import type { Model, Optional } from "sequelize";

interface TableDef {
  name: string;
  columns: ModelAttributes<Model<any, any>, Optional<any, string>>;
}

const TABLES: TableDef[] = [
  {
    name: "categories",
    columns: {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      nombre: DataTypes.STRING,
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
  },
  {
    name: "products",
    columns: {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      nombre: DataTypes.STRING,
      precio: DataTypes.DECIMAL,
      categoria: DataTypes.STRING,
      categoriaId: DataTypes.INTEGER,
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
  },
  {
    name: "companies",
    columns: {
      id: { type: DataTypes.STRING, primaryKey: true },
      nombre: DataTypes.STRING,
      moneda: DataTypes.STRING,
      pais: DataTypes.STRING,
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
  },
  {
    name: "customers",
    columns: {
      id: { type: DataTypes.STRING, primaryKey: true },
      nombre: DataTypes.STRING,
      companyId: DataTypes.STRING,
      pais: DataTypes.STRING,
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
  },
  {
    name: "suppliers",
    columns: {
      id: { type: DataTypes.STRING, primaryKey: true },
      nombre: DataTypes.STRING,
      pais: DataTypes.STRING,
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
  },
  {
    name: "glaccounts",
    columns: {
      id: { type: DataTypes.STRING, primaryKey: true },
      nombre: DataTypes.STRING,
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
  },
  {
    name: "invoices",
    columns: {
      id: { type: DataTypes.STRING, primaryKey: true },
      companyId: DataTypes.STRING,
      customerId: DataTypes.STRING,
      fecha: DataTypes.DATE,
      importe: DataTypes.DECIMAL,
      moneda: DataTypes.STRING,
      estado: DataTypes.STRING,
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
  },
  {
    name: "invoiceitems",
    columns: {
      id: { type: DataTypes.STRING, primaryKey: true },
      invoiceId: DataTypes.STRING,
      glAccountId: DataTypes.STRING,
      material: DataTypes.STRING,
      cantidad: DataTypes.INTEGER,
      importe: DataTypes.DECIMAL,
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
  },
  {
    name: "supplierinvoices",
    columns: {
      id: { type: DataTypes.STRING, primaryKey: true },
      supplierId: DataTypes.STRING,
      fecha: DataTypes.DATE,
      importe: DataTypes.DECIMAL,
      moneda: DataTypes.STRING,
      estado: DataTypes.STRING,
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
  },
  {
    name: "payments",
    columns: {
      id: { type: DataTypes.STRING, primaryKey: true },
      invoiceId: DataTypes.STRING,
      fecha: DataTypes.DATE,
      importe: DataTypes.DECIMAL,
      metodo: DataTypes.STRING,
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
  },
];

export async function up({ context: qi }: { context: QueryInterface }): Promise<void> {
  for (const table of TABLES) {
    await qi.createTable(table.name, table.columns);
  }
}

export async function down({ context: qi }: { context: QueryInterface }): Promise<void> {
  const reversed = [...TABLES].reverse();
  for (const table of reversed) {
    await qi.dropTable(table.name);
  }
}
