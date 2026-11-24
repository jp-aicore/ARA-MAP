# Historial del proyecto

ARA Map empezó en septiembre de 2026 como un piloto publicado en Vercel. El 12
de octubre pasó a Render + Neon + Supabase, y el 13 de octubre el propietario
confirmó ese portal como el producto definitivo. Lo vigente está descrito en
[README.md](../README.md), [DESARROLLO.md](DESARROLLO.md),
[GUIA_DEL_PORTAL.md](GUIA_DEL_PORTAL.md) y [OPERACION.md](OPERACION.md).

## Dónde quedó el material anterior

Hasta noviembre de 2026 el repositorio guardaba en `main` los reportes,
traspasos, capturas, presentaciones y evidencias de esa etapa (`reports/`,
`output/`, `outputs/` y `tmp/`). Describen versiones anteriores de la interfaz y
de la infraestructura, y la organización por «Team A / Team B», que ya no está
vigente. Se retiraron de `main` para que no se confundan con el producto actual.

Siguen disponibles, sin cambios, en el commit
[`78f33c8`](https://github.com/jp-aicore/ARA-MAP/tree/78f33c8c4724599ba5f73c6152de6a5366b7fa6a),
el último de `main` que los contiene:

```bash
git show 78f33c8:reports/project-definitive-2026-10-13/START_HERE.md
git worktree add ../ara-map-historial 78f33c8
```

Algunos comentarios del código citan rutas de `reports/`; se refieren a ese
commit. Esos documentos son antecedentes: no asignan tareas ni sustituyen
[AGENTS.md](../AGENTS.md).

## Lo que queda de Vercel

`api/index.py`, `vercel.json`, `.vercelignore` y algunas pruebas del adaptador
siguen en el código como antecedente. No forman parte de la publicación actual.
