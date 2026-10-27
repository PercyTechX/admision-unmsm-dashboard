// Descarga los resultados públicos del Examen de Admisión UNMSM y los guarda
// como CSV anonimizado: sin nombres ni códigos de postulante.
// Uso: node scraper/scrape.mjs [proceso]   (por defecto 20271 → 2027-I)

import { writeFile, mkdir } from 'node:fs/promises';

const PROCESO = process.argv[2] ?? '20271';
const BASE = `https://admision.unmsm.edu.pe/Website${PROCESO}/`;
const ETIQUETA = `${PROCESO.slice(0, 4)}-${PROCESO.endsWith('1') ? 'I' : 'II'}`;
const HEADERS = { 'User-Agent': 'admision-unmsm-dashboard (proyecto educativo)' };
const PAUSA_MS = 400;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function bajar(url) {
  for (let intento = 1; intento <= 3; intento++) {
    const res = await fetch(url, { headers: HEADERS });
    if (res.ok) return res.text();
    await dormir(1000 * intento);
  }
  throw new Error(`No se pudo descargar ${url}`);
}

const limpiar = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

async function main() {
  const inicio = await bajar(BASE);
  const modalidades = [...inicio.matchAll(/<td><a href="([^"]+)">([^<]+)<\/a><\/td>/g)]
    .map(([, href, nombre]) => ({ url: new URL(href, BASE).href, nombre: limpiar(nombre) }));

  const filas = [];
  for (const modalidad of modalidades) {
    const html = await bajar(modalidad.url);
    const escuelas = [...html.matchAll(/<a href="([^"]+\/results\.html)">([^<]+)<\/a>/g)]
      .map(([, href, nombre]) => ({ url: new URL(href, modalidad.url).href, codigo: href.split('/')[0], nombre: limpiar(nombre) }));

    for (const escuela of escuelas) {
      await dormir(PAUSA_MS);
      const pagina = await bajar(escuela.url);
      const tbody = pagina.split('<tbody>')[1]?.split('</tbody>')[0] ?? '';
      let n = 0;
      for (const tr of tbody.split('</tr>')) {
        const score = tr.match(/data-score="([^"]*)"/);
        if (!score) continue;
        const merito = tr.match(/data-merit="([^"]*)"/)?.[1] ?? '';
        const celdas = [...tr.matchAll(/<td[^>]*>(.*?)<\/td>/g)].map((m) => limpiar(m[1]));
        filas.push({
          proceso: ETIQUETA,
          modalidad: modalidad.nombre,
          codigo_escuela: escuela.codigo,
          escuela: escuela.nombre,
          puntaje: score[1],
          merito,
          observacion: celdas.at(-1) ?? '',
        });
        n++;
      }
      console.log(`${escuela.nombre}: ${n}`);
    }
  }

  const columnas = Object.keys(filas[0]);
  const csv = [columnas.join(','), ...filas.map((f) => columnas.map((c) => `"${String(f[c]).replace(/"/g, '""')}"`).join(','))].join('\n');
  await mkdir('data', { recursive: true });
  const salida = `data/resultados_${ETIQUETA}.csv`;
  await writeFile(salida, '﻿' + csv, 'utf8');
  console.log(`\n${filas.length} filas → ${salida}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
