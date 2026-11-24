# Archivos de prueba

Todo lo que hay en esta carpeta es **ficticio**. Ningún nombre, dirección,
coordenada, superficie o precio corresponde a un terreno real. Los datos reales
de la empresa no se guardan en este repositorio.

## Tabla maestra de ejemplo

- `base_terrenos_09_26_ficticia.xlsx` — el mes de referencia: 79 terrenos y una
  fila vacía al final, en la hoja «Registro Análisis».
- `base_terrenos_08_26_ficticia.xlsx` — el mes anterior de la misma tabla, con
  algunos precios distintos y filas que aparecen o desaparecen, para las
  comparaciones entre meses.

Conservan la forma de un archivo de trabajo de ARA, porque las pruebas
dependen de ella:

- Encabezados tal cual, incluido `Dirección ` con un espacio al final, y X como
  latitud e Y como longitud.
- El formato de moneda `[$$-409]` en los precios, que no basta para decidir la
  moneda: el asistente pregunta.
- Celdas vacías, «SD» en lugar de un precio, un precio en cero y una fila cuyo
  precio no cuadra con superficie × precio por m² (unas 10 veces mayor).
- Nombres casi iguales: el mismo nombre con y sin acento, con espacio al final y
  dos terrenos con el mismo nombre y superficies distintas.

Los nombres son palabras inventadas. Estado y municipio son nombres de lugar
públicos; las coordenadas, superficies y precios fueron alterados y no ubican
ni describen un terreno real.

## Otras carpetas

- `kmz/` — contornos KMZ y KML inventados (ver su README).
- `asistente/` — tablas pequeñas para el asistente de importación.
- `archivos/` — un PDF ficticio para las pruebas de adjuntos.

Si una prueba necesita un caso nuevo, agrégalo con datos inventados. Nunca
copies aquí un archivo de la empresa, aunque sea para reproducir un error:
reproduce la forma del problema, no los datos.
