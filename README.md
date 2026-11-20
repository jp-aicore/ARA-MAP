# ARA Map

Portal privado para registrar terrenos, editar su tabla y adjuntar archivos (PDF, JPG, Word .docx o Excel .xlsx) y KMZ o KML.

**Sitio vigente:** [ara-map-piloto.onrender.com](https://ara-map-piloto.onrender.com/).
Este sitio es el proyecto definitivo; se mejora con cambios pequeños aunque su
nombre conserve «piloto».

## Para quien revisa este repositorio

- **Lo vigente** es lo que describe este README: la aplicación en `server/` y
  `web/`, publicada en Render, con Neon Postgres y Supabase Storage privado.
  Lo que menciona Vercel, «Team A / Team B» o reportes con fecha es de una
  etapa anterior: [docs/HISTORIAL.md](docs/HISTORIAL.md) dice qué es y dónde
  quedó.
- **El repositorio no contiene datos reales.** Las tablas, KMZ, PDF y cuentas de
  `tests/` son ficticios ([tests/fixtures/README.md](tests/fixtures/README.md)).
  Los terrenos y archivos reales viven sólo en la base y el almacenamiento del
  sitio, y se entregan aparte, por los canales de la empresa.
- **El repositorio no contiene credenciales.** Para probarlo basta la ejecución
  local de abajo, sin acceso a Render, Neon ni Supabase. `render.yaml` muestra
  qué variables necesita la nube, sólo sus nombres.
- Para empezar: [Guía del portal](docs/GUIA_DEL_PORTAL.md) (uso),
  [Guía para developers](docs/DESARROLLO.md) (código y entrega) y
  [Operación](docs/OPERACION.md) (hosting, límites gratuitos, respaldo).

## Código y desarrollo

Repositorio: [jp-aicore/ARA-MAP](https://github.com/jp-aicore/ARA-MAP).
La rama **`main`** es la base única para el trabajo nuevo y la rama de Render.
Las entregas aceptadas del antiguo piloto se conservan con su historial.
No hay división vigente por equipos A/B.

- [Guía para developers](docs/DESARROLLO.md): clon, entorno local, pruebas,
  pull requests, permisos y publicación.
- [Reglas compartidas para agentes](AGENTS.md).
- [Historial del proyecto](docs/HISTORIAL.md): de dónde viene y dónde quedó el material anterior.

## Uso del portal

El responsable administra las cuentas. El administrador crea bases de trabajo
y concede accesos; el operador ve y edita las bases que tiene asignadas.
No hay registro público ni restablecimiento de contraseña por el propio usuario.

1. Inicia sesión con tu cuenta.
2. Elige una base y captura o edita las filas de terrenos.
3. Adjunta archivos mediante **Elegir archivo…** y **Elegir KMZ o KML…** en las celdas.
   Word y Excel se descargan con su nombre original para abrirlos fuera de ARA Map;
   adjuntar un Excel no importa filas.
4. Alterna **Tabla / Mapa** para ver los terrenos de la vista y sus filtros.
5. En el mapa elige **Claro / Satélite / Calles**. El fondo se conserva al
   alternar Tabla / Mapa dentro de la misma tabla, no después de recargar.

El detalle (⋯) contiene descargas, versiones, historial y selección de contornos.
La columna **KMZ / KML** admite ambos formatos (KMZ hasta 20 MiB, KML hasta 16 MiB)
y guarda y descarga el archivo original tal cual. Un KMZ o KML con un único contorno
válido se activa al terminar. Con varios candidatos
requiere elegir y activar en el detalle. Un reemplazo inválido conserva el
contorno anterior. Un terreno con contorno activo puede verse sin X/Y.

[Guía del portal](docs/GUIA_DEL_PORTAL.md).

## Datos y archivos

- **Render Free** ejecuta `python -m server.hosted`.
- **Neon Postgres** guarda cuentas, accesos, filas, revisiones y metadatos.
- **Supabase Storage privado** guarda los bytes de PDF, JPG, Word, Excel, KMZ y KML.
- Los datos y archivos alojados no dependen del disco de Render.
- La ejecución local usa SQLite y almacenamiento local, separados del sitio.

Los PDF y KMZ se adjuntan a filas existentes. En la tabla, el menú ⋯ ofrece
«Exportar a Excel» (la vista con sus filtros) y, para administradores,
«Importar Excel», que agrega filas nuevas a una base tras una revisión previa.
La importación Excel/CSV antigua alimenta bases heredadas y **no** la tabla
maestra. `scripts/cargar_maestra.py` hace la misma carga desde la terminal; es
una operación del responsable con un destino explícito, no un comando para
ejecutar contra el sitio por defecto.

En los archivos de ARA, **X es latitud e Y longitud**. Los valores se guardan
como vienen; superficies y precios no se convierten ni se calculan. Los precios
son MXN. Un dato que falta queda vacío, no en cero.

## Ejecutar y comprobar en desarrollo

Python 3.9 o superior para la app local; Render usa Python 3.12.15. El frontend
es JavaScript sin framework ni paso de build. `vendor/python/` incluye openpyxl
para el uso local. Node.js se usa para pruebas de JavaScript.

```bash
python3 scripts/cuentas.py --sqlite /tmp/ara-dev.db crear dev_admin "Admin local" --rol admin
ARA_MAP_DB=/tmp/ara-dev.db python3 -m server.app
```

La contraseña se pide de forma oculta; es obligatoria, sin longitud mínima.
Abre `http://localhost:8420`. Usa datos ficticios. La guía de desarrollo explica
cómo crear un operador local y concederle una base.

```bash
./verificar.sh
python3 -m unittest tests.test_hosted
node --test tests/js/*.test.mjs
```

Sin zsh, ejecuta los pasos equivalentes de la guía. CI prueba JavaScript y
Python con Postgres desechable. Una prueba local o CI verde no demuestra por sí
sola el comportamiento publicado.

## Publicación y operación

La publicación es **manual en Render**, desde un SHA de `main` revisado y con
CI verde. Auto-deploy está apagado. Una fusión no publica automáticamente.
Se conservan los recursos, los datos y los planes gratuitos, sin tarjeta ni pagos.

El acceso al repositorio permite desarrollar y abrir PRs; no incluye las cuentas
de Render, Neon o Supabase ni sus credenciales. Esos accesos los administra el
propietario. No se necesitan credenciales alojadas para desarrollar localmente.

Un respaldo completo reúne un dump de Postgres y los archivos correspondientes
exportados fuera del host y del bucket activo. La secuencia documentada es
`verificar_archivos.py` → `restaurar_archivos.py` → verificación final de tamaño
y SHA-256, en destinos nuevos para restaurar. Consulta
[docs/OPERACION.md](docs/OPERACION.md).

El servicio gratuito puede tardar en despertar y el almacenamiento tiene cupo
limitado. Cambios de código no recrean los recursos ni cargan los datos locales.
El adaptador de Vercel (`api/index.py`, `vercel.json`) permanece en el código
como antecedente; el flujo vigente utiliza Render. El catálogo público no es requisito actual.
