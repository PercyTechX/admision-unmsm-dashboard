// Enriquece el CSV crudo (facultad, sede, ingresó) y genera:
//   data/resultados_<proceso>_detalle.csv  → una fila por postulante (para Power BI)
//   data/escuelas_<proceso>.csv            → indicadores por escuela (para Power BI)
//   docs/data.js                           → datos del dashboard HTML
// Uso: node scraper/transform.mjs [etiqueta]   (por defecto 2027-I)

import { readFile, writeFile } from 'node:fs/promises';

const PROCESO = process.argv[2] ?? '2027-I';
const ANCHO_RANGO = 100; // puntos por barra del histograma

// Los dos primeros dígitos del código de escuela identifican la facultad.
const FACULTADES = {
  '01': 'Medicina',
  '02': 'Derecho y Ciencia Política',
  '03': 'Letras y Ciencias Humanas',
  '04': 'Farmacia y Bioquímica',
  '05': 'Odontología',
  '06': 'Educación',
  '07': 'Química e Ingeniería Química',
  '08': 'Medicina Veterinaria',
  '09': 'Ciencias Administrativas',
  '10': 'Ciencias Biológicas',
  '11': 'Ciencias Contables',
  '12': 'Ciencias Económicas',
  '13': 'Ciencias Físicas',
  '14': 'Ciencias Matemáticas',
  '15': 'Ciencias Sociales',
  '16': 'Ing. Geológica, Minera, Metalúrgica y Geográfica',
  '17': 'Ingeniería Industrial',
  '18': 'Psicología',
  '19': 'Ingeniería Electrónica y Eléctrica',
  '20': 'Ingeniería de Sistemas e Informática',
};

const SEDES = [
  [/ - S\.J\.L$/, 'San Juan de Lurigancho'],
  [/ - HUARAL$/, 'Huaral'],
];

function parsearCsv(texto) {
  const [cabecera, ...lineas] = texto.replace(/^﻿/, '').trim().split('\n');
  const columnas = cabecera.split(',');
  return lineas.map((l) => {
    const valores = JSON.parse(`[${l}]`);
    return Object.fromEntries(columnas.map((c, i) => [c, valores[i]]));
  });
}

function aCsv(filas) {
  const columnas = Object.keys(filas[0]);
  const celda = (v) => (typeof v === 'number' ? String(v) : `"${String(v).replace(/"/g, '""')}"`);
  return '﻿' + [columnas.join(','), ...filas.map((f) => columnas.map((c) => celda(f[c])).join(','))].join('\n');
}

const redondear = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const mediana = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const crudo = parsearCsv(await readFile(`data/resultados_${PROCESO}.csv`, 'utf8'));

const detalle = crudo.map((r) => {
  const [patron, sede] = SEDES.find(([p]) => p.test(r.escuela)) ?? [null, 'Ciudad Universitaria'];
  return {
    proceso: r.proceso,
    codigo_escuela: r.codigo_escuela,
    escuela: r.escuela,
    escuela_base: patron ? r.escuela.replace(patron, '') : r.escuela,
    facultad: FACULTADES[r.codigo_escuela.slice(0, 2)] ?? 'Sin facultad',
    sede,
    puntaje: Number(r.puntaje),
    merito: r.merito === '' ? '' : Number(r.merito),
    ingreso: r.observacion === 'ALCANZÓ VACANTE' ? 1 : 0,
  };
});

const porEscuela = new Map();
for (const f of detalle) {
  if (!porEscuela.has(f.codigo_escuela)) porEscuela.set(f.codigo_escuela, []);
  porEscuela.get(f.codigo_escuela).push(f);
}

const maxPuntaje = Math.max(...detalle.map((f) => f.puntaje));
const nRangos = Math.ceil((maxPuntaje + 1) / ANCHO_RANGO);

const escuelas = [...porEscuela.values()].map((filas) => {
  const { codigo_escuela, escuela, escuela_base, facultad, sede } = filas[0];
  const puntajes = filas.map((f) => f.puntaje);
  const ingresantes = filas.filter((f) => f.ingreso);
  const pIngreso = ingresantes.map((f) => f.puntaje);
  const hist = Array.from({ length: nRangos }, () => [0, 0]);
  for (const f of filas) hist[Math.floor(f.puntaje / ANCHO_RANGO)][f.ingreso] += 1;
  return {
    codigo_escuela,
    escuela,
    escuela_base,
    facultad,
    sede,
    postulantes: filas.length,
    ingresantes: ingresantes.length,
    tasa_ingreso: redondear(ingresantes.length / filas.length, 4),
    postulantes_por_vacante: ingresantes.length ? redondear(filas.length / ingresantes.length, 1) : '',
    puntaje_minimo_ingreso: pIngreso.length ? Math.min(...pIngreso) : '',
    puntaje_maximo: Math.max(...puntajes),
    puntaje_promedio: redondear(puntajes.reduce((a, b) => a + b, 0) / puntajes.length),
    puntaje_mediana: mediana(puntajes),
    hist,
  };
}).sort((a, b) => a.codigo_escuela.localeCompare(b.codigo_escuela));

await writeFile(`data/resultados_${PROCESO}_detalle.csv`, aCsv(detalle), 'utf8');
await writeFile(`data/escuelas_${PROCESO}.csv`, aCsv(escuelas.map(({ hist, ...e }) => e)), 'utf8');

const datos = {
  proceso: PROCESO,
  fuente: 'https://admision.unmsm.edu.pe/Website20271/',
  generado: new Date().toISOString().slice(0, 10),
  ancho_rango: ANCHO_RANGO,
  escuelas,
};
await writeFile('docs/data.js', `// Generado por scraper/transform.mjs, no editar a mano.\nwindow.DATOS = ${JSON.stringify(datos)};\n`, 'utf8');

console.log(`${detalle.length} postulantes, ${escuelas.length} escuelas, ${detalle.filter((f) => f.ingreso).length} ingresantes`);
