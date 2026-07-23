// Augmentación de tipos de `@phrasecode/odata` v0.3.1.
//
// El decorador `@Table` de la librería declara `TableOptions` sin la opción
// `timestamps`, pero en runtime SÍ la reenvía a Sequelize (los modelos del
// proyecto dependen de `createdAt`/`updatedAt`). Esta augmentación alinea
// los tipos con el comportamiento real sin tocar `node_modules`.
declare module "@phrasecode/odata" {
    interface TableOptions {
        timestamps?: boolean;
    }
}

export {};
