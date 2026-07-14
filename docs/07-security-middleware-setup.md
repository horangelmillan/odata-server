# 07 — Configuración de Middleware de Seguridad (Helmet, Morgan, Compression, CORS)

## 7.1 Helmet v8

**Propósito**: Establece 13 headers HTTP de seguridad por defecto para proteger la aplicación contra vulnerabilidades web comunes.

| Header | Protege contra |
|--------|---------------|
| Content-Security-Policy | XSS, inyección de scripts |
| Strict-Transport-Security | HTTPS downgrade attacks |
| X-Content-Type-Options | MIME sniffing |
| X-Frame-Options | Clickjacking |
| X-XSS-Protection | XSS (legacy browsers) |

**Configuración recomendada:**

```typescript
import helmet from "helmet";

app.use(helmet({
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:"],
        },
    },
    crossOriginEmbedderPolicy: false, // necesario si SAPUI5 carga recursos cross-origin
}));
```

**Consideración SAPUI5**: Si la aplicación SAPUI5 se sirve desde un dominio diferente al del backend, puede ser necesario ajustar la política CSP. En particular, `scriptSrc` y `styleSrc` podrían requerir los dominios específicos de SAPUI5 en lugar de `'self'`. La opción `crossOriginEmbedderPolicy: false` deshabilita la política cross-origin embedder que puede bloquear recursos SAPUI5 legítimos.

---

## 7.2 Morgan v1.10

**Propósito**: Logging de requests HTTP entrantes. Morgan es un middleware de logging para Express que formatea y escribe información de cada request.

```typescript
import morgan from "morgan";

if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
} else {
    app.use(morgan("combined", {
        skip: (req, res) => res.statusCode < 400, // solo errores en prod
    }));
}
```

**Formatos disponibles:**

| Formato | Descripción | Uso |
|---------|-------------|-----|
| `dev` | Colores, método, url, status, tiempo de respuesta | Desarrollo |
| `combined` | Apache-style estándar (IP, fecha, método, url, status, tamaño, referrer, user-agent) | Producción |
| `common` | Formato Apache common log (IP, fecha, método, url, status, tamaño) | Producción simple |
| `short` | Formato compacto con tiempo de respuesta | Depuración rápida |

En producción se recomienda `combined` porque es el formato que esperan la mayoría de herramientas de análisis de logs (ELK, Splunk, etc.). La opción `skip` evita loguear requests exitosos en producción, reduciendo ruido.

---

## 7.3 Compression v1.7

**Propósito**: Compresión gzip/brotli de respuestas HTTP para reducir el ancho de banda y mejorar tiempos de carga.

```typescript
import compression from "compression";

app.use(compression({
    filter: (req, res) => {
        if (req.headers["x-no-compression"]) return false;
        return compression.filter(req, res); // default filter
    },
    threshold: 1024, // solo comprimir respuestas > 1KB
    level: 6,        // nivel de compresión (1-9, 6=balance)
}));
```

**Parámetros:**

- **filter**: Permite deshabilitar compresión para ciertos requests (ej: cuando el cliente envía `x-no-compression`).
- **threshold**: Respuestas más pequeñas que este valor no se comprimen. 1024 bytes (1 KB) es un buen balance.
- **level**: Nivel de compresión de 1 (mínimo, rápido) a 9 (máximo, lento). 6 es el valor por defecto de zlib y ofrece el mejor balance entre ratio de compresión y velocidad.

**Orden importante**: Compression debe ir después de OData (que maneja su propio streaming) y antes de rutas que sirvan contenido estático.

---

## 7.4 CORS v2.8

**Propósito**: Cross-Origin Resource Sharing — controla qué dominios pueden acceder a los recursos del servidor.

```typescript
import cors from "cors";

const corsOptions = {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["OData-Version"], // ← CRÍTICO para SAPUI5
    credentials: true,
    maxAge: 86400, // cache preflight por 24h
};

app.use(cors(corsOptions));
```

**Configuración destacada:**

- **exposedHeaders**: `OData-Version` es crítico para clientes SAPUI5 que consumen servicios OData. Sin este header expuesto, el cliente no puede leer la versión del protocolo y puede fallar al interpretar la respuesta.
- **credentials**: `true` permite el envío de cookies y headers de autenticación cross-origin. Requiere que `origin` no sea `"*"` (debe ser un dominio específico).
- **maxAge**: 86400 segundos (24 horas) cachea la respuesta preflight OPTIONS, reduciendo requests adicionales.

Para producción, `origin` debe configurarse con el dominio exacto de la aplicación frontend (ej: `https://sapui5.miempresa.com`) en lugar de `"*"`.

---

## 7.5 Orden de Middlewares (crítico)

El orden en que se montan los middlewares determina el flujo de procesamiento de cada request. Un orden incorrecto puede causar comportamientos inesperados o vulnerabilidades de seguridad.

```typescript
app.use(helmet());                          // 1. Seguridad headers
app.use(cors(corsOptions));                 // 2. CORS

app.use("/odata", contextMiddleware, oData); // 3. OData (antes de parseo body)

app.use(express.json());                    // 4. Body parser
app.use(compression());                     // 5. Compresión (después de parsear)

app.use(morgan("dev"));                     // 6. Logging
app.use("/api", GlobalRouter);              // 7. REST API

app.use(GlobalErrorMiddleware);             // 8. Error handler (último)
```

**Explicación del orden:**

1. **Helmet primero**: Los headers de seguridad deben aplicarse a TODAS las respuestas sin excepción, incluso antes de cualquier procesamiento. Si se coloca después, algunas respuestas de error tempranas podrían carecer de estos headers.

2. **CORS**: Debe ir inmediatamente después de helmet para que las respuestas preflight (OPTIONS) incluyan los headers CORS correctos antes de que otros middlewares intenten procesar la solicitud.

3. **OData antes de express.json()**: `@phrasecode/odata` maneja su propio parsing de body y parámetros de consulta. Si `express.json()` se coloca antes, podría interferir con el streaming de datos OData o consumir el body antes de que el controlador OData lo procese.

4. **Body parser**: Se coloca justo después de OData para que los endpoints REST puedan acceder a `req.body`.

5. **Compression**: Debe ir después de los body parsers pero antes de las rutas REST. Comprimir las respuestas de los endpoints REST reduce significativamente el tamaño de las respuestas JSON.

6. **Morgan**: El logging se coloca antes de las rutas para capturar todos los requests procesados. Morgan registra la respuesta después de que se completa, por lo que su posición relativa a las rutas no afecta el logueo.

7. **REST API**: Los endpoints de negocio se montan al final, después de toda la infraestructura de seguridad y parsing.

8. **Error handler global**: Siempre debe ser el último middleware. Si se coloca antes, los errores lanzados en middlewares posteriores no serían capturados.
