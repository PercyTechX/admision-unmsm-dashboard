# Admisión UNMSM 2027-I · Dashboard

Dashboard interactivo de los resultados del **Examen de Admisión 2027-I de la Universidad Nacional Mayor de San Marcos**: 28,668 postulantes, 2,474 ingresantes y 95 escuelas.

**🔗 Ver el dashboard:** https://percytechx.github.io/admision-unmsm-dashboard/

## Hallazgos

- **Medicina Humana es la carrera más disputada:** 4,841 postulantes para 55 vacantes (88 por vacante). El último ingresante obtuvo **1,404.5 puntos**, más de 220 por encima de la siguiente escuela (Ingeniería Civil, 1,182.4).
- Le siguen **Arquitectura y Urbanismo** (56 por vacante) e **Ingeniería Civil** (41.5).
- En promedio ingresó **8.6 %** de los postulantes, pero la tasa va de **2.9 %** en la Facultad de Medicina a **28.1 %** en Ciencias Matemáticas.
- **Las sedes de San Juan de Lurigancho y Huaral son la puerta más accesible:** ingresa el 26.1 % y el 34.1 % de sus postulantes, frente al 8.4 % en Ciudad Universitaria. Contabilidad pide 942 puntos en Ciudad Universitaria, 783.8 en S.J.L. y 685 en Huaral.
- **Con 1,000 puntos no basta:** 2,036 postulantes superaron esa nota y no ingresaron; el 54.3 % de ellos postuló a Medicina.
- Demanda y exigencia van juntas: a más postulantes, más puntaje para ingresar (r = 0.80 entre el logaritmo de postulantes y el puntaje mínimo).

## Cómo está hecho

```
scraper/scrape.mjs     → descarga los resultados públicos (Node.js, sin dependencias)
scraper/transform.mjs  → limpia, agrega facultad y sede, calcula indicadores
data/                  → CSV listos para Power BI o Excel
docs/                  → dashboard HTML (ECharts), publicado con GitHub Pages
powerbi/               → guía y medidas DAX para la versión en Power BI
```

```bash
npm run datos   # scrape + transform
```

| Archivo | Contenido |
|---|---|
| `data/resultados_2027-I_detalle.csv` | Una fila por postulante: escuela, facultad, sede, puntaje, mérito e ingresó (sí/no) |
| `data/escuelas_2027-I.csv` | Una fila por escuela: postulantes, ingresantes, tasa, postulantes por vacante y puntajes mínimo, máximo, promedio y mediana |

**Stack:** Node.js · JavaScript · ECharts · HTML/CSS · Power BI (DAX) · GitHub Pages

## Datos y privacidad

- **Fuente:** [resultados oficiales de la Oficina Central de Admisión](https://admision.unmsm.edu.pe/Website20271/), modalidad EBR/EBA.
- **Se descartan nombres y códigos de postulante.** Solo se guardan escuela, puntaje, mérito y resultado.
- La facultad se deduce de los dos primeros dígitos del código de escuela y la sede del nombre (S.J.L., Huaral).
- Proyecto personal y educativo. No es un sitio oficial de la UNMSM.

## Autor

**Percy Nazario** · [GitHub](https://github.com/PercyTechX)
