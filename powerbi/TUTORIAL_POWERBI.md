# Tutorial: el dashboard de Admisión UNMSM 2027-I en Power BI, paso a paso

Este tutorial arma desde cero en Power BI Desktop el informe del dashboard HTML (`docs/index.html`). Cada paso explica **qué** hacer y **por qué**, para que cualquiera pueda repetirlo y aprender en el camino.

> Resumen rápido de lo mismo: [`GUIA_POWERBI.md`](GUIA_POWERBI.md). Fórmulas: [`medidas.dax`](medidas.dax).

**Estado:** completo. Informe publicado: [ver en Power BI](https://app.powerbi.com/view?r=eyJrIjoiYmY0NDJmOTUtMjdjOC00NWEzLWI2ZjYtMmIyODRmZWQzNDg4IiwidCI6IjFlYmE0NDNmLTIzZTUtNDUzNC05MGQxLTA5NzZhYWJlODZhYyIsImMiOjR9).

## Antes de empezar

- **Power BI Desktop** (gratis, Microsoft Store). El informe se crea en Desktop y luego se publica en la web con un clic. No hace falta "migrar" nada.
- Los datos están en `data/`:

  | Archivo | Qué tiene | Filas |
  |---|---|---|
  | `resultados_2027-I_detalle.csv` | Un postulante por fila: escuela, facultad, sede, puntaje, mérito, si ingresó | 28,668 |
  | `escuelas_2027-I.csv` | Una escuela por fila, con facultad, sede e indicadores | 95 |

- Guarda el archivo como `powerbi/admision-unmsm-2027-I.pbix`.

---

## Paso 1: Cargar la tabla principal (`detalle`)

1. **Inicio → Obtener datos → Texto/CSV** → abre `data/resultados_2027-I_detalle.csv`.
2. En la vista previa, haz clic en **Transformar datos** (no en *Cargar*).

   **Por qué:** *Transformar datos* abre el **Editor de Power Query**, donde se revisan y limpian los datos *antes* de usarlos. Si cargas directo, Power BI adivina los tipos y a veces se equivoca.

3. Cambia el nombre de la consulta a **`detalle`** (panel derecho → *Propiedades → Nombre*).

   **Por qué:** todas las fórmulas DAX usan el nombre `detalle`. Si la tabla se llama `resultados_2027-I_detalle`, las medidas dan error.

4. Revisa el tipo de cada columna (ícono a la izquierda del encabezado: `ABC` texto, `1.2` decimal, `123` entero):

   | Columna | Tipo | Por qué |
   |---|---|---|
   | `codigo_escuela` | **Texto** | Como número, `011` se vuelve `11` y la relación con `escuelas` falla |
   | `puntaje` | Número decimal | Hay puntajes como 1045.375 |
   | `merito` | Número entero | Puesto de mérito |
   | `ingreso` | Número entero | 1 = ingresó, 0 = no; con esto se cuentan ingresantes |

   Si pregunta *"¿Reemplazar el paso actual o agregar uno nuevo?"* → **Reemplazar actual**.

5. Mira **Pasos aplicados** (a la derecha): cada cambio queda guardado como una receta que se repite sola cada vez que se actualizan los datos.
6. **Cerrar y aplicar**.

### Los `null` en `merito` son correctos

Al convertir `merito` a número aparecen muchos `null` (unos **26,194** = 28,668 − 2,474).

- **Por qué:** solo los que ingresaron tienen puesto de mérito. En el CSV los demás están vacíos y Power Query los muestra como `null`, que significa "sin valor".
- **No los reemplaces por 0:** un 0 sería un puesto inventado y arruinaría promedios y mínimos. Las funciones de DAX ignoran los `null`.
- Para saber quién ingresó se usa `ingreso`, que **no** debe tener ningún `null`.
- Para comprobarlo: pestaña **Vista** → activa **Distribución de columnas** y **Perfil de columna**.

---

## Paso 2: Cargar `escuelas` y relacionar las tablas

1. **Obtener datos → Texto/CSV** → `data/escuelas_2027-I.csv` → **Transformar datos**.
2. Nombre de la consulta: **`escuelas`**.
3. **`codigo_escuela` → Texto.** Las dos columnas que se relacionan deben ser del mismo tipo.
4. Las columnas numéricas (`postulantes`, `tasa_ingreso`, `puntaje_minimo_ingreso`…) deben estar como número.
5. **Cerrar y aplicar**.

### La relación

6. Ve a la **Vista de modelo** (tercer ícono de la barra izquierda).
7. La relación correcta es:
   - `escuelas[codigo_escuela]` → `detalle[codigo_escuela]`
   - **Cardinalidad:** Uno a varios (1:\*), con el **1** del lado de `escuelas`
   - **Dirección del filtro cruzado:** Único
8. Si no existe, arrastra `codigo_escuela` de `escuelas` sobre `codigo_escuela` de `detalle`. Para revisarla, haz doble clic en la línea.

**Por qué:** cada escuela (**1**) tiene muchos postulantes (**\***). Al filtrar una facultad en `escuelas`, el filtro baja por la relación y Power BI muestra solo a los postulantes de esas escuelas en `detalle`.

> **Error común:** Power BI puede crear la relación con columnas equivocadas, por ejemplo `detalle[escuela]` ↔ `escuelas[codigo_escuela]`. Una relación solo funciona si las dos columnas tienen **los mismos valores**: nombres contra códigos nunca coinciden. Clic derecho en la línea → **Eliminar** y vuelve a crearla código con código. Se usa el código, no el nombre, porque el código es único por escuela.

---

## Paso 3: Crear las medidas DAX

**Medida o columna calculada:**
- Una **medida** se recalcula según los filtros activos: con "Medicina" seleccionado, `Postulantes` cuenta solo Medicina. No ocupa espacio en la tabla.
- Una **columna calculada** guarda un valor fijo en cada fila. Sirve para agrupar o clasificar.

### 3a. Medidas básicas

Clic derecho en `detalle` → **Nueva medida** → pega en la barra de fórmulas → **Enter**. Una por una:

```dax
Postulantes = COUNTROWS ( detalle )
```
Cada fila es un postulante, así que contar filas es contar postulantes.

```dax
Ingresantes = SUM ( detalle[ingreso] )
```
`ingreso` vale 1 o 0: sumarlo da el número de ingresantes.

```dax
Tasa de ingreso = DIVIDE ( [Ingresantes], [Postulantes] )
```
```dax
Postulantes por vacante = DIVIDE ( [Postulantes], [Ingresantes] )
```
`DIVIDE` en vez de `/`: si el divisor es 0, devuelve vacío en lugar de error. Una medida puede usar otras medidas (`[Ingresantes]`).

### 3b. Medidas de puntaje

```dax
Puntaje mínimo de ingreso = CALCULATE ( MIN ( detalle[puntaje] ), detalle[ingreso] = 1 )
```
`CALCULATE` es la función más importante de DAX: calcula algo **con un filtro adicional**. Aquí: el puntaje mínimo, pero solo de los que ingresaron.

```dax
Puntaje máximo = MAX ( detalle[puntaje] )
```
```dax
Puntaje promedio = AVERAGE ( detalle[puntaje] )
```

### 3c. Columnas calculadas

Clic derecho en `detalle` → **Nueva columna** (no *medida*):

```dax
Rango de puntaje = FLOOR ( detalle[puntaje], 100 )
```
Redondea hacia abajo a la centena (1045 → 1000) para agrupar el histograma.

```dax
Resultado = IF ( detalle[ingreso] = 1, "Ingresó", "No ingresó" )
```
Convierte 1/0 en texto legible para la leyenda.

### 3d. Formato

Selecciona cada medida → pestaña **Herramientas de medición**:
- `Tasa de ingreso` → **%**, 1 decimal.
- `Postulantes por vacante` y las de puntaje → 1 decimal.
- `Postulantes`, `Ingresantes` → 0 decimales, separador de miles.

### Comprobación

Pon una **Tabla** con las 4 medidas básicas. Debe dar:

| Medida | Valor |
|---|---|
| Postulantes | 28,668 |
| Ingresantes | 2,474 |
| Tasa de ingreso | 8.6 % |
| Postulantes por vacante | 11.6 (el "1 de cada 12" del titular) |

> **Por qué una tabla y no una tarjeta:** la tarjeta abrevia por defecto (28,668 → "29 mil"). No es un error, solo es el formato de presentación. La tabla muestra el número completo. Cómo quitar la abreviatura en las tarjetas: ver el [Paso 6](#paso-6-que-las-tarjetas-muestren-28668-y-no-29-mil).

Al terminar, borra la tabla de prueba (selecciónala → **Supr**).

---

## Paso 4: Armar la página

### Parte 1: filtros y tarjetas

**Segmentaciones** (filtros que el usuario puede tocar):
1. Clic en un espacio vacío → **Segmentación de datos** → `escuelas[facultad]`. Ponla arriba a la izquierda.
2. Otra con `escuelas[sede]`, al lado.
3. Para que sea un menú desplegable: pincel → **Configuración de la segmentación → Estilo: Desplegable**.

**Por qué de `escuelas` y no de `detalle`:** se filtra en la tabla "1" y el filtro baja por la relación a la tabla "\*". Es la buena práctica de un modelo estrella.

**Tarjetas:** cuatro **Tarjetas** con `Postulantes`, `Ingresantes`, `Tasa de ingreso` y `Postulantes por vacante`, en una fila debajo de los filtros. Para alinearlas: Ctrl + clic en las 4 → **Formato → Alinear** → *Alinear arriba* y *Distribuir horizontalmente*.

**Comprobación:** filtra la facultad **Medicina** → la tasa debe bajar a **2.9 %** (7,130 postulantes, 204 ingresantes). Si cambia, la relación funciona. **Luego quita el filtro** (goma de borrar en la segmentación).

### Parte 2: escuelas más disputadas (barras horizontales)

1. Clic en un espacio vacío → **Gráfico de barras agrupadas**.
2. **Eje Y:** `escuelas[escuela]`. **Eje X:** medida `Postulantes por vacante`.
3. **Orden:** **…** del gráfico → **Ordenar eje** → `Postulantes por vacante` → **Descendente**.
4. **Top 15:** panel **Filtros** → en `escuela`, **Tipo de filtro: N superior** → Superior **15** → **Por valor:** `Postulantes por vacante` → **Aplicar filtro**.
5. **Título con el hallazgo:** pincel → **General → Título** → *"Medicina Humana: 88 postulantes por cada vacante"*.

**Por qué ese título:** uno descriptivo ("Postulantes por vacante por escuela") solo dice qué hay en el gráfico. Uno con el hallazgo le dice al lector **qué mirar**. Es la base del data storytelling.

**Comprobación:** Medicina Humana aparece primera, con 88.

> **Errores comunes:**
> - **Solo aparecen Enfermería, Medicina Humana, Nutrición…:** quedó activo el filtro de Medicina de la comprobación anterior. Bórralo.
> - **Eje X de 0 a 1.0 y todas las barras iguales:** en X quedó *Recuento de escuela* en lugar de la medida. En **Compilar objeto visual**, quítalo con la **X** y arrastra `Postulantes por vacante` (ícono de calculadora).

### Parte 3: histograma "¿cuántos puntos hicieron falta?"

Muestra cuántos postulantes hay en cada rango de puntaje, separando a los que ingresaron de los que no.

1. Clic en un espacio vacío → **Gráfico de columnas apiladas** (verticales).
2. **Eje X:** columna `Rango de puntaje`. **Eje Y:** medida `Postulantes`. **Leyenda:** columna `Resultado`.
3. Pincel → **Eje X → Tipo: Categórico**.

   **Por qué:** `Rango de puntaje` es numérico y Power BI lo trata como eje *continuo*, con barras finas y etiquetas salteadas. Como *categórico*, cada rango (0, 100, 200…) es una columna con su etiqueta.

4. **…** → **Ordenar eje** → `Rango de puntaje` → **Ascendente** (de menor a mayor puntaje).
5. Pincel → **Columnas** → colores: **Ingresó** azul `#2a78d6`, **No ingresó** gris `#c3c2b7`.

   **Por qué:** el color fuerte se reserva para lo importante (los que ingresaron) y el gris es contexto. El ojo va directo al azul.

6. **Título:** *"2,036 postulantes sacaron 1,000 puntos o más y no ingresaron"*.

**Comprobación:** el pico gris está entre 600 y 800 puntos; el azul aparece desde unos 600 y es mayoría desde unos 1,100; en 1,000+ todavía hay mucho gris. Esos postulantes no alcanzaron vacante porque se compite por escuela, no contra un puntaje fijo.

### Parte 4: dispersión "demanda vs. exigencia"

Cada punto es una escuela: a la derecha, más postulantes (demanda); arriba, más puntaje para ingresar (exigencia).

1. Clic en un espacio vacío → **Gráfico de dispersión**.
2. **Valores** (o *Detalles*): `escuelas[escuela]`. **Eje X:** medida `Postulantes`. **Eje Y:** medida `Puntaje mínimo de ingreso`.

   **Por qué `escuela` en Valores:** le dice a Power BI que haga un punto por escuela. Sin ese campo calcula todo junto y sale **un solo punto**.

3. Pincel → **Eje X → Tipo de escala: Logarítmica**. El eje queda en 1, 10, 100, 1,000, 10,000.

   **Por qué:** Medicina Humana tiene 4,841 postulantes y muchas escuelas menos de 100. En escala normal casi todo se amontona a la izquierda. La logarítmica da el mismo espacio a cada "×10".

4. Pincel → **Marcadores** → azul `#2a78d6` (con algo de transparencia para ver los puntos superpuestos).
5. Opcional: **Eje X → Rango → Mínimo: 10** para no dejar espacio vacío a la izquierda.
6. **Título:** *"Medicina Humana es la más demandada y la más exigente: 1,404.5 puntos para ingresar"*.

**Los nombres solo aparecen al pasar el cursor**, y es lo esperado: con 95 escuelas, las etiquetas se enciman. El título cuenta el hallazgo y el tooltip da el detalle. Si igual las quieres: pincel → **Etiquetas de categoría → Activado**, con una fuente pequeña.

**Comprobación:** Medicina Humana queda sola arriba a la derecha (4,841; 1,404.5). Derecho (2,157; 1,168.1) e Ingeniería Civil (1,182.4) están entre los más altos.

### Parte 5: tasa de ingreso por facultad

1. Clic en un espacio vacío → **Gráfico de barras agrupadas**.
2. **Eje Y:** `escuelas[facultad]`. **Eje X:** medida `Tasa de ingreso`.
3. **…** → **Ordenar eje** → `Tasa de ingreso` → **Ascendente**.

   **Por qué:** en barras horizontales, "ascendente" pone el valor menor **arriba**. Las facultades más difíciles quedan donde el lector mira primero.

4. Pincel → **Etiquetas de datos → Activado** (cada barra muestra su %).
5. **Resaltar el dato clave:** pincel → **Barras → Colores**:
   - Con **Mostrar todo** desactivado, cambia el **color predeterminado** a gris `#c3c2b7` (todas las barras de una vez).
   - Activa **Mostrar todo** y cambia solo **Medicina** a azul `#2a78d6`.
   - Para escribir el código hex: cuadrito de color → **Más colores**.

   **Por qué:** con 20 barras del mismo color el ojo no sabe dónde ir. Con una sola resaltada, el gráfico habla solo.

   > **Alternativa avanzada:** botón **fx** junto al color → *Reglas* → `Tasa de ingreso` menor que 0.03 → azul; si no, gris. El color depende del dato y no de la barra: si cambian los datos, se actualiza solo.

6. **Título:** *"En Medicina ingresa el 2.9 %; en Ciencias Matemáticas, el 28.1 %"*.

**Comprobación:** arriba Medicina 2.9 %, Medicina Veterinaria 3.7 %, Psicología 4.1 %; abajo Ciencias Contables 26.1 %, Ciencias Físicas 27.5 %, Ciencias Matemáticas 28.1 %.

### Parte 6: tabla de todas las escuelas

Los gráficos cuentan la historia; la tabla es para quien quiere buscar su carrera.

1. Clic en un espacio vacío → **Tabla**.
2. En orden: de `escuelas` → `escuela`, `facultad`, `sede`; luego las medidas `Postulantes`, `Ingresantes`, `Tasa de ingreso`, `Postulantes por vacante`, `Puntaje mínimo de ingreso`.

   **Por qué:** primero lo que identifica la fila y después los números. Se lee de izquierda a derecha.

3. Clic en el encabezado **Postulantes por vacante** hasta dejarlo **descendente**.
4. **Compilar objeto visual** → flechita de `Postulantes por vacante` → **Formato condicional → Barras de datos** → azul `#2a78d6`.

   **Por qué:** una barrita proporcional dentro de la celda muestra el tamaño sin leer el número.

5. Pincel → **Totales → Activado**.

   **Por qué importa:** en el total, `Tasa de ingreso` da **8.6 %**, no la suma de porcentajes. Las medidas se recalculan para cada fila *y* para el total.

6. **Título:** *"Todas las escuelas"*. En una tabla de consulta, un título descriptivo está bien.

**Comprobación:** 95 filas; Medicina Humana arriba con 88 y la barra más larga; los totales coinciden con las tarjetas (28,668 · 2,474 · 8.6 %).

---

## Paso 5: Diseño de la página

Guarda primero (**Ctrl + S**).

### 5a. Titular

1. **Insertar → Cuadro de texto**, arriba de todo y a lo ancho.
2. **"En San Marcos ingresa 1 de cada 12. En Medicina, 1 de cada 88."** en fuente 24–28 y negrita.
3. Debajo, más chico y en gris: *"Examen de Admisión UNMSM 2027-I · 28,668 postulantes · Datos públicos de la OCA"*.

**Por qué:** el lector capta el mensaje en 3 segundos, antes de mirar un solo gráfico.

### 5b. Fondo

Clic en un espacio vacío del lienzo → pincel → **Fondo del lienzo** → `#fcfcfb`, **Transparencia 0 %**.

### 5c. Orden de los visuales

```
[ Titular                                            ]
[ Filtro facultad ] [ Filtro sede ]
[ Tarjeta ] [ Tarjeta ] [ Tarjeta ] [ Tarjeta ]
[ Escuelas más disputadas ] [ Tasa por facultad     ]
[ Histograma de puntajes  ] [ Demanda vs. exigencia ]
[ Tabla de todas las escuelas                        ]
```

**Por qué:** se lee en "Z", de izquierda a derecha y de arriba hacia abajo: mensaje → números grandes → el porqué (gráficos) → el detalle (tabla).

Si no alcanza el espacio: con el lienzo seleccionado → pincel → **Configuración del lienzo → Tipo: Personalizado** → alto ~1,800 px (la página se hace larga, con scroll).

### 5d. Toque final

- Alinea con **Formato → Alinear** y deja el mismo espacio entre visuales.
- Nombre de la página (abajo a la izquierda): doble clic en "Página 1" → *"Admisión 2027-I"*.

---

## Paso 6: Que las tarjetas muestren 28,668 y no "29 mil"

La tarjeta nueva de Power BI abrevia los números grandes y, según la versión, no muestra *Unidades de visualización* en el formato.

**Opción A: tarjeta clásica.** Selecciona la tarjeta → en **Visualizaciones**, haz clic en el ícono de **Tarjeta** clásica (o *Tarjeta (heredada)*; pasa el mouse para ver los nombres). El visual cambia de tipo y conserva el campo. Luego pincel → **Valor de la llamada → Unidades de visualización → Ninguno**.

**Opción B: medida de texto (funciona siempre).**

```dax
Postulantes (texto) = FORMAT ( [Postulantes], "#,0" )
```
```dax
Ingresantes (texto) = FORMAT ( [Ingresantes], "#,0" )
```

Úsalas en lugar de las originales en esas dos tarjetas.

**Por qué funciona:** `FORMAT` convierte el número en **texto** (`"28,668"`) y Power BI no abrevia texto. `"#,0"` = separador de miles, sin decimales. **La contra:** al ser texto no sirve para cálculos ni gráficos; úsalas solo en tarjetas.

`Tasa de ingreso` y `Postulantes por vacante` no tienen este problema porque son números chicos.

---

## Paso 7: Publicar

### 7a. Subir el informe a Power BI (web)

1. **Ctrl + S**.
2. **Inicio → Publicar** → inicia sesión con una **cuenta de trabajo o de estudiante** (con Gmail no funciona).
3. **Destino:** *Mi área de trabajo* → **Seleccionar**.
4. Cuando diga *"¡Correcto!"*, haz clic en **Abrir en Power BI**.

**Qué se sube:** el informe (los gráficos) y el **modelo semántico** (datos y medidas). No hay que "migrar" nada: se crea en Desktop y se publica con un clic.

### 7b. Hacerlo público

1. En el navegador: **Archivo → Insertar informe → Publicar en la web (público)**.
2. **Crear código para insertar** → **Publicar**.
3. Te da:
   - **Vínculo** (`https://app.powerbi.com/view?r=...`): es el que va al README.
   - **HTML** (`<iframe>`): para incrustar el informe dentro de una página web.

> **Si la opción está gris o pide contactar al administrador**, la organización la bloqueó. Plan B: **Archivo → Exportar → PDF** y capturas en `powerbi/capturas/` para el README.
>
> "Publicar en la web" deja el informe visible para cualquiera. Aquí no es problema: los datos son públicos y no tienen nombres.

**Resultado de este proyecto:** [informe publicado](https://app.powerbi.com/view?r=eyJrIjoiYmY0NDJmOTUtMjdjOC00NWEzLWI2ZjYtMmIyODRmZWQzNDg4IiwidCI6IjFlYmE0NDNmLTIzZTUtNDUzNC05MGQxLTA5NzZhYWJlODZhYyIsImMiOjR9), enlazado en el README y en el pie del dashboard HTML.

### 7c. Actualizar el informe más adelante

Si cambias algo en Desktop, vuelve a **Inicio → Publicar** al mismo destino y elige **Reemplazar**. El vínculo público no cambia.
