import { config } from "dotenv";
import { Sequelize, DataTypes } from "sequelize";

config();

const dbConfig = {
    dialect: "postgres" as const,
    host: process.env.DEV_HOST || "localhost",
    port: Number(process.env.DEV_PORT) || 5432,
    username: process.env.DEV_USERNAME || "postgres",
    password: process.env.DEV_PASSWORD || "secret",
    database: process.env.DEV_DB || "odata_dev",
};

const db = new Sequelize({
    ...dbConfig,
    logging: false,
});

const CATEGORIES = [
    { id: 1, nombre: "Electrónica" },
    { id: 2, nombre: "Hogar" },
    { id: 3, nombre: "Deportes" },
    { id: 4, nombre: "Jardinería" },
    { id: 5, nombre: "Libros" },
];

const PRODUCTS = [
    { id: 1, nombre: "Laptop Gamer", precio: 1500.00, categoria: "Electrónica", categoriaId: 1 },
    { id: 2, nombre: "Mouse Inalámbrico", precio: 45.99, categoria: "Electrónica", categoriaId: 1 },
    { id: 3, nombre: "Teclado Mecánico", precio: 120.50, categoria: "Electrónica", categoriaId: 1 },
    { id: 4, nombre: "Monitor 27\"", precio: 350.00, categoria: "Electrónica", categoriaId: 1 },
    { id: 5, nombre: "Auriculares Bluetooth", precio: 89.90, categoria: "Electrónica", categoriaId: 1 },
    { id: 6, nombre: "Sofá 3 Plazas", precio: 1200.00, categoria: "Hogar", categoriaId: 2 },
    { id: 7, nombre: "Mesa de Comedor", precio: 450.00, categoria: "Hogar", categoriaId: 2 },
    { id: 8, nombre: "Lámpara LED", precio: 35.00, categoria: "Hogar", categoriaId: 2 },
    { id: 9, nombre: "Cafetera Automática", precio: 280.00, categoria: "Hogar", categoriaId: 2 },
    { id: 10, nombre: "Juego de Sartenes", precio: 95.00, categoria: "Hogar", categoriaId: 2 },
    { id: 11, nombre: "Bicicleta Montaña", precio: 750.00, categoria: "Deportes", categoriaId: 3 },
    { id: 12, nombre: "Pesas 20kg", precio: 120.00, categoria: "Deportes", categoriaId: 3 },
    { id: 13, nombre: "Esterilla Yoga", precio: 25.00, categoria: "Deportes", categoriaId: 3 },
    { id: 14, nombre: "Cinta de Correr", precio: 1800.00, categoria: "Deportes", categoriaId: 3 },
    { id: 15, nombre: "Manguera Jardín 20m", precio: 30.00, categoria: "Jardinería", categoriaId: 4 },
    { id: 16, nombre: "Cortacésped Eléctrico", precio: 320.00, categoria: "Jardinería", categoriaId: 4 },
    { id: 17, nombre: "Macetero Grande", precio: 45.00, categoria: "Jardinería", categoriaId: 4 },
    { id: 18, nombre: "Novela Ciencia Ficción", precio: 18.50, categoria: "Libros", categoriaId: 5 },
    { id: 19, nombre: "Libro de Cocina", precio: 32.00, categoria: "Libros", categoriaId: 5 },
    { id: 20, nombre: "Atlas Mundial", precio: 55.00, categoria: "Libros", categoriaId: 5 },
];

async function seed() {
    await db.authenticate();
    console.log("Connected to database.");

    console.log("Clearing demo data...");
    await db.query("DELETE FROM products");
    await db.query("DELETE FROM categories");

    console.log("Seeding categories...");
    for (const cat of CATEGORIES) {
        await db.query(
            `INSERT INTO categories (id, nombre, "createdAt", "updatedAt") VALUES ($1, $2, NOW(), NOW())`,
            { bind: [cat.id, cat.nombre] }
        );
    }
    console.log(`  ${CATEGORIES.length} categories created.`);

    console.log("Seeding products...");
    for (const prod of PRODUCTS) {
        await db.query(
            `INSERT INTO products (id, nombre, precio, categoria, "categoriaId", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
            { bind: [prod.id, prod.nombre, prod.precio, prod.categoria, prod.categoriaId] }
        );
    }
    console.log(`  ${PRODUCTS.length} products created.`);

    await db.close();
    console.log("Demo seed complete.");
}

seed().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
});
