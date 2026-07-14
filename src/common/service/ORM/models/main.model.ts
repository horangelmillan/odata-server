import { db } from "../sequelize.service.js";

export class databaseModels {
    static async init() {
        console.log("Models initialized");
    }
}
