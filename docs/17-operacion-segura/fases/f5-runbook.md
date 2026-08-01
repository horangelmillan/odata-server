# F5 — Runbook de operación (M4, DT2)

> Fase 5 del ciclo 17 — "Operación Segura". Rama `feat/operacion-segura`.

## 1. Objetivo

- **M4** — documentar la operación del servidor: despliegue, secrets, SSL, backups,
  rollout y troubleshooting.
- **DT2** — procedimiento de rotación de `SECRET_KEY` documentado.

## 2. Alcance

| Archivo | Cambio |
|---|---|
| `docs/17-operacion-segura/runbook.md` | Completo: Despliegue · Secrets (incl. rotación SECRET_KEY) · Backup/Restauración (de F1) · SSL · Dependencias/audit (D4) · Rollout · Troubleshooting · Escalado (D1) |
| `docs/17-operacion-segura/fases/f5-runbook.md` | este documento |
| Backlog | M4 → Implementado; DT2 → Implementado |

## 3. Diseño

Runbook único en `docs/17-operacion-segura/runbook.md` (ya creado en F1 con §backup;
se completa con el resto). Cada sección es un procedimiento ejecutable con comandos
reales del proyecto, consistente con el código del ciclo 17 (fail-fast, exit(1),
statement_timeout, 500 genérico, audit gate, override uuid).

## 4. Pasos

1. Secciones nuevas: Despliegue (compose prod + verificación), Secrets (tabla de
   variables + rotación de SECRET_KEY), SSL (cliente→proxy, server→BD), Dependencias
   (estado del audit + re-evaluación), Rollout (backup→build→verificar), Troubleshooting
   (tabla síntoma/causa/acción), Escalado (notas D1).
2. Verificación de coherencia: cada sección referencia variables/comandos reales
   (`pnpm backup:db`, `DB_SSL_REJECT_UNAUTHORIZED`, `exit(1)`, `429`, `503`...).
3. Cierre: checklist, gate, hallazgos, resultado; backlog.

## 5. Checklist de ejecución

- [x] Runbook con: Despliegue, Secrets (+rotación), Backup/Restauración, SSL, Dependencias, Rollout, Troubleshooting, Escalado.
- [x] Coherencia con el código del ciclo 17 (variables, exit(1), timeout, audit).
- [x] Backlog actualizado (M4, DT2 → Implementado).

## 6. Gate de la fase

- [x] Documento completo y coherente con el código ✅
- [x] No hay cambios de código en esta fase (docs-only) — suite intacta ✅

## 7. Hallazgos detectados

| ID | Hallazgo | Clasificación | Resolución |
|---|---|---|---|
| M4 | Sin runbook de operación | Mejora | Resuelto: runbook completo con procedimientos ejecutables |
| DT2 | Rotación de SECRET_KEY no documentada | Deuda Técnica | Resuelto: procedimiento de rotación (generación, actualización, reinicio, verificación) en §Secrets |

## 8. Resultado

F5 ejecutada y cerrada el 2026-08-01.

- **Runbook completo:** despliegue (compose prod + verificación), secrets (obligatorias,
  defaults, rotación de SECRET_KEY), backup/restauración (procedimiento verificado en F1),
  SSL (proxy externo + TLS a BD con validación de CA), dependencias (13 advisories de
  bcrypt documentados y su re-evaluación), rollout (backup → build → verificación),
  troubleshooting (tabla síntoma/causa/acción cubriendo fail-fast, 401/429/500, 503,
  statement timeout, migraciones) y notas de escalado (D1).
- **Pendiente conocido:** ninguno.
- **Siguiente fase:** F6 (validación integral + bump 2.3.1 + cierre + PR).
