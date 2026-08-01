// F2 (ciclo 16): dotenv se carga ANTES de cada archivo de test (necesario para
// que vi.hoisted pueda copiar DEV_* → DB_* en security-prod.api.test.ts), pero
// NO se importa env.config aquí: setup comparte registro de módulos con el
// archivo y cachearía la configuración en modo test, invalidando los tests de
// modo estricto. Cada test importa env.config bajo su propio NODE_ENV.
import "reflect-metadata";
import { config } from "dotenv";

config();
