# ARA Map — guía del portal

Para quien entra por primera vez. Cinco minutos de lectura.

## 1. Entrar y salir

- Abre la dirección del portal y escribe tu usuario y contraseña.
- **Si nadie ha usado el portal en un rato, la primera página tarda cerca de un
  minuto en abrir.** El servicio gratuito se duerme: espera, no recargues
  varias veces.
- Las cuentas las crea el responsable del portal. **No hay «olvidé mi
  contraseña»:** si la pierdes, pídele que la restablezca.
- Después de 5 intentos fallidos la cuenta espera 15 minutos antes de aceptar
  otro intento.
- La sesión dura 12 horas. Usa **Cerrar sesión** al terminar en un equipo
  compartido.

## 2. Qué puedes hacer

| Rol | Puede |
|---|---|
| **Administrador** | Todo: crear bases de trabajo, dar y quitar accesos, ver la tabla maestra de todas las bases, importar Excel y transferir terrenos. |
| **Operador** | Trabajar solo en las bases que un administrador le asignó. |

Si entras y no ves ninguna base, todavía no te han dado acceso: avisa a un
administrador. Los accesos se manejan en **Bases y accesos**.

## 3. La tabla

- **Tabla** muestra los terrenos de la base elegida. Escribe en una celda para
  cambiarla; se guarda con Enter o al salir de la celda, y Esc lo cancela.
- **Nuevo terreno** agrega un renglón en blanco.
- El menú ⋯ de la tabla ofrece **Exportar a Excel** (la vista con sus filtros)
  y, para administradores, **Importar Excel**, que agrega filas nuevas a una
  base tras una revisión previa.
- Cada base puede tener columnas propias, que solo existen en esa base.
- **Transferir a otra base…** mueve un terreno entre bases (según tu rol).
- Los datos se guardan como los escribes. En los archivos de ARA, **X es la
  latitud e Y la longitud**. La única ayuda automática: al editar una celda, si
  falta m² o HA, o precio total o precio por m², se llena a partir del otro. Nunca
  sobrescribe un valor que ya existe.

## 4. Archivos de un terreno

En la tabla, las columnas de archivos tienen los botones **Elegir archivo…** y
**Elegir KMZ o KML…** de cada renglón: el archivo queda en ese terreno. Aparecen
solo en los renglones que puedes cambiar. El detalle del terreno (⋯) tiene los
mismos botones, además de descargas, versiones e historial.

- **Elegir archivo…** acepta PDF, JPG, Word (.docx) y Excel (.xlsx). Word y
  Excel se descargan con su nombre original para abrirlos fuera de ARA Map;
  adjuntar un Excel no importa filas.
- Tamaño máximo: **archivos 25 MB, KMZ 20 MB, KML 16 MB**. Un archivo vacío no
  se acepta.
- **No cierres ni recargues la pestaña** hasta que termine la subida.
- Puedes tener hasta 5 subidas pendientes a la vez.
- **Descargar** baja el archivo y lo comprueba completo antes de entregártelo;
  con archivos grandes tarda unos segundos.
- **Historial** muestra las versiones anteriores. Un archivo retirado conserva
  su historial.

## 5. El contorno del terreno (KMZ o KML)

Subir un KMZ o KML, desde la tabla o desde el detalle, da uno de estos
resultados:

| El archivo trae… | Qué pasa al terminar la subida | Qué haces tú |
|---|---|---|
| **Un solo contorno válido** | Queda como el contorno activo del terreno (si había otro, lo sustituye). | Nada más. |
| **Varios contornos** | No se activa nada; el contorno anterior, si había, sigue. La celda pide elegir en el detalle. | Abre el detalle (⋯), elige el contorno correcto y actívalo. |
| **Ningún contorno utilizable** | El archivo se guarda, pero el contorno anterior se conserva. | Revisa el archivo y súbelo de nuevo. |

El contorno se dibuja aunque el terreno no tenga X e Y.

## 6. Tabla / Mapa

**Tabla / Mapa** cambia la misma vista entre la tabla y un mapa que ocupa toda
la pantalla de trabajo. El administrador entra a la **Tabla maestra**; el
operador, a su base de trabajo.

- El mapa muestra **todos** los terrenos de la base y los filtros elegidos, no
  sólo la página de la tabla. Al volver a **Tabla** sigues en la misma página,
  con los mismos filtros y el mismo terreno seleccionado.
- El fondo del mapa se elige entre **Claro / Satélite / Calles**. Se conserva al
  alternar Tabla / Mapa en la misma tabla, no después de recargar.
- Al tocar el círculo de un terreno se carga su **contorno activo**. Un archivo
  subido sin activar no cambia el mapa.
- Un terreno con contorno activo aparece aunque no tenga X e Y. Uno con X e Y y
  sin contorno se muestra como punto. Uno sin ninguna de las dos se cuenta como
  **sin ubicación** y no se dibuja: nunca se coloca a la adivina.
- **Actualizar** vuelve a traer los terrenos. Si algo falla, el mapa lo dice y
  ofrece **Volver a intentar**.

## 7. Mensajes que puedes ver

El texto exacto en pantalla puede variar un poco.

| Mensaje | Qué significa | Qué hacer |
|---|---|---|
| Inicia sesión para continuar | La sesión terminó | Vuelve a entrar; lo que no se guardó hay que repetirlo |
| Solo lectura / sin permiso | Te quitaron el acceso, o la base o el terreno se archivó | Pregunta a un administrador |
| El sistema está ocupado | Otro cambio se está guardando | Espera unos segundos y repite |
| El almacenamiento de archivos no está disponible | Falla temporal del servicio de archivos | Intenta más tarde; si sigue, avisa al responsable |
| El plazo para subir terminó | La subida tardó demasiado | Cancela la subida y empieza otra |
| El archivo descargado no coincide | La descarga llegó dañada | Vuelve a descargar; si se repite, avisa al responsable |

## 8. A quién acudir

- **Cuenta, contraseña, acceso bloqueado:** al responsable del portal.
- **Acceso a una base:** a un administrador.

## 9. Límites actuales

- El espacio para archivos es limitado y compartido por todos los terrenos
  (ver [OPERACION.md](OPERACION.md)): sube solo los archivos que hagan falta y
  avisa antes de subir muchos archivos grandes.
- El servicio gratuito puede tardar en despertar y no está garantizado las 24
  horas.
- No hay catálogo público ni cambio de contraseña por el propio usuario.
