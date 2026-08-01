# Runbook de Operación — odata-server

> Ciclo 17 (Operación Segura). Procedimientos operativos del servidor OData.
> Secciones: Backup y Restauración (F1) · Despliegue · Secrets · SSL · Rollout ·
> Troubleshooting (F5). Rama: `feat/operacion-segura`.

---

## Backup y Restauración de la BD

**Riesgo cubierto:** R1 (ciclo 17) — la BD es la única fuente de datos; un fallo del
host con el volumen `pgdata_prod` sin copia implica pérdida total.

### Backup (comando)

```bash
pnpm backup:db                       # backup de la BD del NODE_ENV actual
```

El script (`scripts/backup/db-backup.mjs`) usa la configuración del entorno igual que
el server (`NODE_ENV=development` → `DEV_*`/`odata_dev`; `NODE_ENV=production` →
`DB_*`). Variables opcionales:

| Variable | Descripción | Default |
|---|---|---|
| `BACKUP_DIR` | Directorio de salida | `<repo>/backups/` |
| `BACKUP_KEEP` | Número de backups a conservar (los más recientes) | `7` |

Genera `odata_<bd>_<YYYYMMDD_HHmmss>.dump` (formato custom comprimido de `pg_dump`,
restaurable con `pg_restore`) y aplica la retención.

**Automatización (decisión del operador):** el script es invocable desde cualquier
cron del host, p.ej. diario a las 03:00:

```bash
# cron: 0 3 * * *  cd <repo> && NODE_ENV=production BACKUP_KEEP=14 pnpm backup:db
```

### Restauración (verificada en el ciclo 17 F1)

```bash
# 1) Crear la BD de destino (si no existe)
PGPASSWORD=<password> createdb -h <host> -p <port> -U <user> odata_prod

# 2) Restaurar el dump sobre la BD destino (sobreescribe)
PGPASSWORD=<password> pg_restore --clean --if-exists -h <host> -p <port> -U <user> -d odata_prod <archivo.dump>
```

Verificación post-restore (mínima):

```sql
SELECT 'migrations' AS tabla, count(*) FROM "SequelizeMeta"
UNION ALL SELECT 'users', count(*) FROM users
UNION ALL SELECT 'invoices', count(*) FROM invoices;
```

Esperado: `migrations = 4` (001–004) y conteos coherentes con la fecha del backup.

### Notas

- El backup contiene el esquema **y** los datos (pg_dump full, no solo datos).
- La BD del compose prod vive en el volumen `pgdata_prod`; el backup debe copiarse a
  un medio **fuera** del host (p.ej. almacenamiento remoto) para ser un DR real.
- `pg_restore --clean --if-exists` elimina objetos existentes antes de restaurar;
  úsalo solo contra la BD que se quiere reemplazar.
