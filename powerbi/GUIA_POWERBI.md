# Guía: el mismo dashboard en Power BI

Esta guía arma en Power BI Desktop el mismo análisis del dashboard HTML (`docs/index.html`), con los CSV de `data/`.

## 1. Cargar los datos

1. Abre Power BI Desktop → **Obtener datos → Texto/CSV**.
2. Carga `data/resultados_2027-I_detalle.csv` y, en el asistente, haz clic en **Transformar datos**:
   - Cambia el nombre de la consulta a `detalle`.
   - Revisa los tipos: `puntaje` → Número decimal, `merito` e `ingreso` → Número entero, `codigo_escuela` → **Texto** (si no, se pierde el cero inicial de `011`).
   - **Cerrar y aplicar**.
3. Repite con `data/escuelas_2027-I.csv` y llámala `escuelas`. `codigo_escuela` también debe ser **Texto**.
4. En la vista **Modelo**, verifica la relación `escuelas[codigo_escuela]` 1 → * `detalle[codigo_escuela]`. Si Power BI no la creó, arrastra un campo sobre el otro.

## 2. Medidas

Crea las medidas y columnas de `medidas.dax` en la tabla `detalle`. Dales formato en **Herramientas de medición**: `Tasa de ingreso` como porcentaje con 1 decimal y los puntajes con 1 decimal.

## 3. Página del informe

| Visual | Campos |
|---|---|
| **Segmentaciones** (arriba, en una fila) | `escuelas[facultad]`, `escuelas[sede]` |
| **4 tarjetas** | `Postulantes`, `Ingresantes`, `Tasa de ingreso`, `Postulantes por vacante` |
| **Barras horizontales:** escuelas más disputadas | Eje Y: `escuelas[escuela]`; valor: `Postulantes por vacante`; filtro del visual: **N superior = 15** por esa medida |
| **Columnas apiladas:** ¿cuántos puntos hicieron falta? | Eje X: `Rango de puntaje`; valor: `Postulantes`; leyenda: `Resultado` |
| **Dispersión:** demanda vs. exigencia | Valores: `escuelas[escuela]`; eje X: `Postulantes` (en el formato del eje, escala **logarítmica**); eje Y: `Puntaje mínimo de ingreso` |
| **Barras horizontales:** tasa por facultad | Eje Y: `escuelas[facultad]`; valor: `Tasa de ingreso`; orden ascendente |
| **Tabla** | `escuela`, `facultad`, `sede` + las medidas |

Colores sugeridos, para que coincida con la versión HTML: azul `#2a78d6` para "Ingresó" y las barras, gris `#c3c2b7` para "No ingresó", y fondo `#fcfcfb`.

## 4. Publicar

Guarda el archivo como `powerbi/admision-unmsm-2027-I.pbix` y súbelo al repositorio.

Para mostrarlo en línea:

1. **Archivo → Publicar → Publicar en Power BI** (necesitas iniciar sesión con una cuenta de trabajo o de estudiante; no sirve una cuenta de Gmail).
2. En app.powerbi.com abre el informe → **Archivo → Insertar informe → Publicar en la web (público)**. Copia el enlace y agrégalo al README.
   - Si la opción está desactivada, el administrador de tu organización la bloqueó. En ese caso, exporta el informe a PDF (**Archivo → Exportar → PDF**) y guarda capturas en `powerbi/capturas/` para el README.

> "Publicar en la web" deja el informe visible para cualquiera. Aquí no es problema: los datos son públicos y no tienen nombres.
