# 07 — Security Middleware Setup (Helmet, Morgan, Compression, CORS)

## 7.1 Helmet v8

**Purpose**: Sets 13 security HTTP headers by default to protect the application against common web vulnerabilities.

| Header | Protects against |
|--------|---------------|
| Content-Security-Policy | XSS, script injection |
| Strict-Transport-Security | HTTPS downgrade attacks |
| X-Content-Type-Options | MIME sniffing |
| X-Frame-Options | Clickjacking |
| X-XSS-Protection | XSS (legacy browsers) |

**Configuration in `src/main.ts`:**

```typescript
import helmet from "helmet";

app.use(helmet());
```

For environments where frontend resources are served from a different domain (e.g., SAPUI5 from a CDN), adjust the CSP directives:

```typescript
app.use(helmet({
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "https://sapui5.hana.ondemand.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://sapui5.hana.ondemand.com"],
            imgSrc: ["'self'", "data:"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));
```

---

## 7.2 Morgan v1.10

**Purpose**: HTTP request logging for Express.

```typescript
import morgan from "morgan";

if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
} else {
    app.use(morgan("combined"));
}
```

**Available formats:**

| Format | Description | Use case |
|--------|-------------|---------|
| `dev` | Colored, method, url, status, response time | Development |
| `combined` | Apache-style (IP, date, method, url, status, size, referrer, user-agent) | Production |
| `common` | Apache common log format | Simple production |
| `short` | Compact with response time | Quick debugging |

In production, `combined` is recommended as it matches the format expected by most log analysis tools (ELK, Splunk, etc.).

---

## 7.3 Compression v1.7

**Purpose**: gzip/brotli compression of HTTP responses to reduce bandwidth and improve load times.

```typescript
import compression from "compression";

app.use(compression());
```

**Key parameters:**

- **filter**: Disable compression for certain requests (e.g., when the client sends `x-no-compression`).
- **threshold**: Responses smaller than this value are not compressed. Defaults to 1024 bytes.
- **level**: Compression level from 1 (fast, minimal) to 9 (slow, maximum). 6 is the zlib default and offers the best balance.

The default configuration in `src/main.ts` uses compression with default settings, placed after `express.json()` to ensure compressed responses from REST endpoints.

---

## 7.4 CORS v2.8

**Purpose**: Cross-Origin Resource Sharing — controls which domains can access server resources.

```typescript
import cors from "cors";

const corsOptions = {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["OData-Version"],
    credentials: true,
    maxAge: 86400,
};

app.use(cors(corsOptions));
```

**Notable configuration:**

- **exposedHeaders**: `OData-Version` is critical for clients consuming OData services. Without this header exposed, the client cannot read the protocol version and may fail to interpret the response.
- **credentials**: `true` allows cookies and auth headers cross-origin. Requires `origin` to be a specific domain (not `"*"`).
- **maxAge**: 86400 seconds (24 hours) caches the preflight OPTIONS response, reducing additional requests.

For production, set `origin` to the exact frontend domain (e.g., `https://app.miempresa.com`) instead of `"*"`.

---

## 7.5 Middleware Order (Critical) — as configured in `src/main.ts`

The order in which middleware is mounted determines the request processing pipeline. Incorrect ordering can cause unexpected behavior or security vulnerabilities.

```typescript
// src/main.ts
const app: Express = express();

app.use(helmet());                          // 1. Security headers
app.use(cors(corsOptions));                 // 2. CORS

app.use(
    "/odata",
    contextMiddleware,                       // 3. OData context ($metadata rewrite + header)
    oDataExpressApp,
);

app.use(express.json());                    // 4. Body parser (for REST endpoints)
app.use(compression());                     // 5. Compression

if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));                 // 6. Logging
} else {
    app.use(morgan("combined"));
}

app.use("/api", GlobalRouter);              // 7. REST API routes
app.use(GlobalErrorMiddleware.globalErrorHandler()); // 8. Global error handler (last)
```

**Explanation of the order:**

1. **Helmet first**: Security headers must apply to ALL responses without exception, including early error responses.

2. **CORS**: Immediately after helmet so preflight (OPTIONS) responses include correct CORS headers before other middleware processes the request.

3. **OData before express.json()**: `@phrasecode/odata` handles its own body and query parameter parsing. If `express.json()` runs first, it could interfere with OData streaming or consume the body before the OData controller processes it. The context middleware rewrites `$metadata` URL paths and sets the `OData-Version` header.

4. **Body parser**: Placed right after OData so REST endpoints can access `req.body`.

5. **Compression**: After body parsers, before REST routes. Compressing REST JSON responses reduces payload size significantly.

6. **Morgan**: Logging before routes captures all processed requests. Morgan logs the response after completion, so its position relative to routes does not affect logging.

7. **REST API**: Business endpoints mounted last, after all infrastructure and parsing middleware.

8. **Global error handler**: Always the last middleware. If placed earlier, errors thrown in subsequent middleware would not be caught.
