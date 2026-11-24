# Operación del sitio

Para quien administra Render, Neon y Supabase. Lo publicado es
https://ara-map-piloto.onrender.com/: **Render Free** ejecuta
`python -m server.hosted`, **Neon Postgres** guarda cuentas, accesos, filas,
revisiones y metadatos, y **Supabase Storage privado** guarda los bytes de los
archivos adjuntos. `render.yaml` declara el servicio y los **nombres** de sus
variables de entorno; los valores viven sólo en los paneles de los proveedores.

Nunca pegues una contraseña, clave o cadena de conexión en un chat, commit, PR o
reporte. Los secretos se escriben en los paneles de los proveedores o en
indicaciones ocultas. Para dar acceso a otra persona, invítala al proyecto en el
proveedor; no copies credenciales.

## Límites del plan gratuito

Datos de la preparación del 12 de octubre de 2026; confirma con cada proveedor
si van a decidir algo con ellos.

- **Sin método de pago en ninguna cuenta.** Sólo planes gratuitos: ninguna
  prueba que se convierta en pago, créditos, complementos, disco de pago ni
  dominio. Si un proveedor pide tarjeta, detente e informa qué pantalla la pidió.
- **El almacenamiento de archivos es de 1 GB en total.** Presupuesto de trabajo:
  **700 MB para todos los archivos vigentes y su historial.** El número de
  terrenos no dice nada: 100 terrenos con un KMZ de 20 MiB y un archivo de
  25 MiB cada uno necesitarían unos 4.7 GB. Antes de una carga grande, suma lo
  que pesan los archivos.
- **El servicio se duerme** tras unos 15 minutos sin uso y tarda cerca de un
  minuto en despertar. El proyecto de almacenamiento se pausa tras una semana
  sin uso. Un servicio gratuito puede suspenderse si agota su transferencia.
- **Nada vive en el disco de Render.** Cada reinicio parte del código.

## Publicar

La publicación es manual: auto-deploy está apagado y fusionar a `main` no
publica nada. El responsable publica en Render un SHA de `main` revisado y con
CI verde. Un cambio de esquema es un paso de release: llega con su migración y
una nota para quien despliega. Ver [DESARROLLO.md](DESARROLLO.md) y
[AGENTS.md](../AGENTS.md).

## Respaldo

La copia de seguridad de base de datos de un proveedor nunca contiene los bytes
de los archivos. Un respaldo son dos cosas guardadas **juntas, fuera del host y
fuera del bucket activo**: un dump de la base y la carpeta exportada para ese
dump.

1. **Primero la base.** Una sola instantánea consistente:
   ```sh
   pg_dump --format=custom --no-owner --no-privileges --file ara-<fecha>.dump "$ARA_DB"
   ```
   Un dump es la vista de una sola transacción; no hace falta congelar
   escrituras.
2. **Después los archivos, exactamente los de ese dump.** Los archivos finales se
   escriben antes de que la base los mencione y nunca cambian, así que todo lo
   que el dump menciona sigue existiendo en este paso. Restaura el dump en una
   base local de trabajo, para que la lista de archivos sea la del propio dump,
   y deja que el verificador los compruebe y exporte:
   ```sh
   createdb ara_respaldo_tmp
   pg_restore --no-owner --no-privileges --exit-on-error --dbname ara_respaldo_tmp ara-<fecha>.dump
   export RESPALDO_DB=postgresql://<usuario>@127.0.0.1:5432/ara_respaldo_tmp
   # ARA_MAP_ARCHIVOS_SUPABASE_URL / _KEY / _BUCKET del sitio, sólo en esta terminal:
   python scripts/verificar_archivos.py --url-env RESPALDO_DB --almacen-entorno --exportar <carpeta-de-respaldo>
   dropdb ara_respaldo_tmp
   ```
   Usa la misma `<carpeta-de-respaldo>` cada día: los archivos ya exportados y
   correctos se reutilizan, no se descargan de nuevo. Contiene `manifiesto.json`
   y cada archivo en `final/<id>/<nonce>`.
3. Un respaldo cuenta sólo si la herramienta termina con **0** («Resultado:
   CORRECTO»). El código 1 significa que falta un archivo mencionado o es
   distinto: detente e informa. Anota la fecha, el tamaño del dump y los
   «Bytes referenciados» y «retenidos en total» frente al presupuesto de 700 MB.
4. Si prefieres un momento sin actividad, pon `ARA_MAP_READ_ONLY=1` en el
   servicio mientras dura: quien ya inició sesión sigue leyendo; iniciar sesión
   y cualquier escritura responden 403.

## Restauración

Nunca restaures encima del sitio en funcionamiento. Necesitas un dump y su
carpeta exportada.

1. Una base nueva y vacía. Exporta su URL directa como `RESTAURADA_DB` y:
   ```sh
   pg_restore --no-owner --no-privileges --exit-on-error --dbname "$RESTAURADA_DB" ara-<fecha>.dump
   ```
2. **Antes de que alguien pueda entrar**, vacía las tablas operativas. Un dump
   completo las incluye:
   ```sql
   BEGIN;
   DELETE FROM team_session;        -- todos vuelven a iniciar sesión
   DELETE FROM team_login_failure;  -- sin bloqueos viejos
   DELETE FROM archivo_trabajo;     -- ningún procesamiento sobrevive a una restauración
   COMMIT;
   ```
   Confirma a qué base apunta la variable antes de ejecutarlo.
3. **Sube los archivos a un bucket privado nuevo**, con las variables de
   almacenamiento del bucket **restaurado** (nunca el activo) en esta terminal:
   ```sh
   python scripts/restaurar_archivos.py <carpeta-de-respaldo> --almacen-entorno
   ```
   Primero compara cada archivo local con el tamaño y SHA-256 del manifiesto y no
   envía nada si uno falta o es distinto. Crea cada objeto en su clave original y
   nunca sobrescribe. No subas archivos a mano desde el panel del proveedor: la
   base se refiere a las claves, no a los nombres de archivo.
4. **Verificación final, obligatoria cada vez:**
   ```sh
   python scripts/verificar_archivos.py --manifiesto <carpeta-de-respaldo>/manifiesto.json --almacen-entorno --restauracion
   ```
   Se requiere salida 0: vuelve a leer cada objeto del bucket restaurado y
   compara tamaño **y SHA-256** con el manifiesto. El reporte del paso 3 no
   basta: «ya estaban» sólo significa que en la clave había un objeto del tamaño
   correcto, no que sus bytes lo sean.
5. Las subidas que estaban pendientes al respaldar vuelven pendientes, con sus
   plazos originales y sin sus bytes. La herramienta las lista; la persona las
   cancela y empieza de nuevo, o expiran.
6. Apunta un servicio **separado** a la base y el bucket restaurados y comprueba
   inicio de sesión, la tabla y una descarga antes de usarlo.

La secuencia se ensayó de punta a punta en local, con almacenamiento local y con
un proveedor simulado. Contra los proveedores reales todavía no se ha hecho.

## Qué registrar

SHA publicado · id del servicio y del deploy de Render · versión de Python en el
log de build · nombres del proyecto, base y rol de Neon · nombres del proyecto y
bucket de Supabase · uso del día · quién hizo cada paso y cuándo. Nunca los
secretos.
