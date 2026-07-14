# Pruebas OData — `product-odata` (Fase B: `/$count`)

Servidor: `http://localhost:3000` (Docker, `docker compose up --build`).
Entidad OData: `/odata/product-odata`.
API REST (para insertar datos): `/api/core/products`.

> El parche de `/$count` está aplicado (marker `PATCHED-COUNT-v3`) y la ruta
> decodifica el query string, por lo que acepta tanto la sintaxis **cruda**
> (`$filter=precio gt 100`) como la **codificada para CMD/curl**
> (`%24filter=precio%20gt%20100%26%24top=1`).

---

## 1. Datos de prueba (ya insertados)

Se insertaron 6 productos vía `POST /api/core/products`. No es necesario volver
a insertarlos; si repites los `POST` se duplicarán y los conteos cambiarán.

| id | nombre  | precio | categoria    |
|----|---------|--------|--------------|
| 1  | Laptop  | 1500   | Electrónica  |
| 2  | Mouse   | 50     | Periféricos  |
| 3  | Monitor | 300    | Electrónica  |
| 4  | Teclado | 200    | Periféricos  |
| 5  | Webcam  | 120    | Periféricos  |
| 6  | Silla   | 800    | Mobiliario   |

Comando para verlos:
```bash
curl -i "http://localhost:3000/api/core/products"
```

---

## 2. Endpoint `/$count` (Fase B) — devuelve el total plano `text/plain`

### PowerShell (comillas simples: `$` y espacios literales)
```bash
curl.exe -i 'http://localhost:3000/odata/product-odata/$count'
curl.exe -i 'http://localhost:3000/odata/product-odata/$count?$filter=precio gt 100'
curl.exe -i 'http://localhost:3000/odata/product-odata/$count?$filter=precio gt 500'
curl.exe -i 'http://localhost:3000/odata/product-odata/$count?$filter=precio le 200'
curl.exe -i 'http://localhost:3000/odata/product-odata/$count?$filter=precio gt 100 and categoria eq '"'"'Periféricos'"'"''
curl.exe -i 'http://localhost:3000/odata/product-odata/$count?$filter=categoria eq '"'"'Electrónica'"'"''
curl.exe -i 'http://localhost:3000/odata/product-odata/$count?$filter=precio gt 100&$top=1&$skip=1'
```

### CMD / curl (codificar `$`→`%24`, `&`→`%26`, espacio→`%20`, `'`→`%27`)
```bash
curl -i "http://localhost:3000/odata/product-odata/$count"
curl -i "http://localhost:3000/odata/product-odata/$count?%24filter=precio%20gt%20100"
curl -i "http://localhost:3000/odata/product-odata/$count?%24filter=precio%20gt%20500"
curl -i "http://localhost:3000/odata/product-odata/$count?%24filter=precio%20le%20200"
curl -i "http://localhost:3000/odata/product-odata/$count?%24filter=precio%20gt%20100%20and%20categoria%20eq%20%27Perif%C3%A9ricos%27"
curl -i "http://localhost:3000/odata/product-odata/$count?%24filter=categoria%20eq%20%27Electr%C3%B3nica%27"
curl -i "http://localhost:3000/odata/product-odata/$count?%24filter=precio%20gt%20100%26%24top=1%26%24skip=1"
```

### Resultados esperados

| Consulta                                         | Esperado | Por qué                                              |
|--------------------------------------------------|----------|------------------------------------------------------|
| `/$count` (sin filtro)                           | `6`      | total de productos                                   |
| `$filter=precio gt 100`                          | `5`      | excluye Mouse (50)                                   |
| `$filter=precio gt 500`                          | `2`      | Laptop (1500), Silla (800)                           |
| `$filter=precio le 200`                          | `3`      | Mouse (50), Teclado (200), Webcam (120)              |
| `$filter=precio gt 100 and categoria eq 'Periféricos'` | `2` | Teclado (200), Webcam (120)                     |
| `$filter=categoria eq 'Electrónica'`             | `2`      | Laptop, Monitor                                      |
| `$filter=precio gt 100&$top=1&$skip=1`           | `5`      | el count IGNORA `$top`/`$skip` (solo cuenta)         |

El `Content-Type` de la respuesta es `text/plain`. SAPUI5 lee este valor como
el total para la paginación.

---

## 3. Acceso por clave `/:id` (Fase A)

```bash
# PowerShell
curl.exe -i 'http://localhost:3000/odata/product-odata/2'
curl.exe -i 'http://localhost:3000/odata/product-odata/999'

# CMD / curl (codificado)
curl -i "http://localhost:3000/odata/product-odata/2"
curl -i "http://localhost:3000/odata/product-odata/999"
```
- `/2` → entidad `Mouse` (200 OK, `@odata.context` de `$entity`).
- `/999` → `404 { "error": "Entity not found" }`.

---

## 4. Colección (sin filtro) — lista todos

```bash
curl -i "http://localhost:3000/odata/product-odata"
```
Devuelve los 6 productos en `value` con `@odata.context`.

---

## 5. ⚠️ Issue conocido (fuera de Fase B): `$filter` en la COLECCIÓN

Aplicar `$filter` sobre la ruta de **colección** (`/odata/product-odata?$filter=...`)
actualmente **no responde** en este servidor (se queda vacío / timeout) cuando
usa la base de datos real. Es un problema previo de la ruta `/` (Fase A) con
Sequelize real, **independiente del parche de `/$count`** (cuyos tests pasan
porque mockean el datasource). La ruta `/$count` SÍ aplica `$filter` correctamente.

No bloquea las pruebas de Fase B. Se investigará aparte.

---

## 6. Reset (opcional)

Para borrar un producto por id:
```bash
curl -i -X DELETE "http://localhost:3000/api/core/products/1"
```
Para dejar la tabla vacía y volver a sembrar, borra los 6 por id (1–6).
