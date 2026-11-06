/* Word (.docx) and Excel (.xlsx) attachments in the table's «Archivos» column
 * (issue #96), with the REAL widgets, the real local server
 * (tests/e2e/tabla_servidor.py on a folder it creates and deletes), real
 * sessions and Chromium. Fictional accounts and files only.
 *
 *   cd tests/e2e && node tabla-office.mjs
 *
 * What it checks: «Elegir archivo…» in the cell takes a DOCX (administrator)
 * and an XLSX (authorized operator); the cell link and its chooser download
 * each with the same bytes and its original name, and open no tab; the
 * detail takes an XLSX by drag and drop, offers «Descargar» and no «Abrir»
 * for it, and downloads it; a saved Word file whose newer upload expired is
 * still downloaded with its own name (the reserved tab is closed); a ZIP
 * renamed .docx is refused after upload and a .doc is refused before; a PDF
 * still opens in a tab and the KMZ cell is unchanged.
 * Optional: OFFICE_CAPTURAS=dir (screenshots), CHROMIUM=/path, OFFICE_PUERTO.
 * Run under a UTF-8 locale (LANG=C.UTF-8): without one, headless Chromium saves
 * any non-ASCII download name as "download", PDF included.
 */

import { execFileSync, spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..');
const PY = process.env.PYTHON ?? 'python3';
const PUERTO = Number(process.env.OFFICE_PUERTO ?? 8487);
const URLBASE = `http://127.0.0.1:${PUERTO}`;
const SHOTS = process.env.OFFICE_CAPTURAS ?? null;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const CLAVE = readFileSync(join(RAIZ, 'tests', 'support.py'), 'utf8').match(/TEST_PASSWORD\s*=\s*"([^"]+)"/)[1];
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const CARPETA = mkdtempSync(join(tmpdir(), 'ara-office-'));
// Synthetic packages from tests/office_paquetes.py, as base64.
const F = JSON.parse(execFileSync(PY, ['-c',
  'import base64, json\nfrom tests import office_paquetes as op\n'
  + 'print(json.dumps({k: base64.b64encode(v).decode() for k, v in {"docx": op.docx("Acta ficticia"),'
  + ' "docx2": op.docx("Otra acta"), "xlsx": op.xlsx(), "zip": op.zip_cualquiera()}.items()}))'],
{ cwd: RAIZ, encoding: 'utf8' }), (k, v) => (typeof v === 'string' ? Buffer.from(v, 'base64') : v));
const PDF = Buffer.from('%PDF-1.4\n% ficticio office\n1 0 obj << /Type /Catalog >> endobj\n%%EOF\n');

const servidor = spawn(PY, [join(AQUI, 'tabla_servidor.py'), '--puerto', String(PUERTO), '--carpeta', join(CARPETA, 'instalacion')],
  { cwd: RAIZ, stdio: ['ignore', 'pipe', 'ignore'] });
await new Promise((resolve, reject) => {
  let texto = '';
  servidor.stdout.on('data', (d) => { texto += d; if (/LISTO/.test(texto)) resolve(); });
  servidor.on('exit', (c) => reject(new Error(`el servidor salió (${c}): ${texto}`)));
});
const BD = join(CARPETA, 'instalacion', 'desechable.db');

let fallos = 0;
async function revisar(nombre, fn) {
  try {
    await fn();
    console.log(`ok   ${nombre}`);
  } catch (error) {
    fallos += 1;
    console.log(`FALLO ${nombre}\n     ${String(error?.stack ?? error).split('\n').slice(0, 6).join('\n     ')}`);
    for (const s of sesiones) {
      if (SHOTS && !s.page.isClosed()) await s.page.screenshot({ path: join(SHOTS, `fallo-${fallos}-${s.usuario}.png`) }).catch(() => {});
      if (!s.page.isClosed()) await s.page.keyboard.press('Escape').catch(() => {});
    }
  }
}
const igual = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`); };
const cierto = (v, m) => { if (!v) throw new Error(m); };
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
async function hasta(fn, mensaje = 'no ocurrió a tiempo', ms = 30000) {
  const fin = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > fin) throw new Error(mensaje);
    await esperar(60);
  }
}
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const sesiones = [];
async function abrirSesion(usuario) {
  const contexto = await navegador.newContext({ viewport: { width: 2000, height: 900 }, locale: 'es-MX', acceptDownloads: true });
  contexto.setDefaultTimeout(30000);
  const page = await contexto.newPage();
  const s = { usuario, page, contexto, errores: [], popups: 0 };
  page.on('pageerror', (e) => s.errores.push(String(e)));
  page.on('popup', () => { s.popups += 1; });
  await page.route(/arcgisonline|tile\.openstreetmap\.org|cartocdn/, (r) => r.fulfill({ status: 204, body: '' }));
  await page.goto(`${URLBASE}/?test=1`);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click().catch(() => {});
  await page.getByLabel('Usuario').fill(usuario);
  await page.getByLabel('Contraseña').fill(CLAVE);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.locator('.session-user').waitFor();
  sesiones.push(s);
  return s;
}
const llamar = (page, metodo, ruta, cuerpo) => page.evaluate(async ([m, r, c]) => {
  const res = await fetch(r, { method: m, headers: c ? { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() } : {},
    body: c ? JSON.stringify(c) : undefined });
  return { status: res.status, datos: await res.json().catch(() => null) };
}, [metodo, ruta, cuerpo ?? null]);

const fila = (page, id) => page.locator(`tr[data-id="${id}"]`);
const celda = (page, id, col = 'core:archivos') => page.locator(`tr[data-id="${id}"] td[data-col="${col}"]`);
const resumen = async (page, id, col) => (await celda(page, id, col).locator('.archivos-celda').innerText().catch(() => '')).trim();
const enlace = (page, id) => celda(page, id).locator('.archivos-celda-abrir');
const fase = (page, id) => celda(page, id).locator('.archivos-celda-subida').getAttribute('data-fase').catch(() => null);

async function irA(page, vista) {
  await page.goto(`${URLBASE}/?test=1#/tabla/${vista}`);
  await page.reload();               // the same address loads nothing new by itself
  await page.locator('.tabla-pantalla').waitFor();
  await page.locator('.tabla-lienzo:not([aria-busy])').waitFor();
  if ((await page.locator('#tabla-vista').inputValue()) !== vista) {
    await page.reload();
    await page.locator('.tabla-lienzo:not([aria-busy])').waitFor();
    await page.goto(`${URLBASE}/?test=1#/tabla/${vista}`);
    await page.locator('.tabla-lienzo:not([aria-busy])').waitFor();
  }
}
/** «Elegir archivo…» in the cell, then the picker gets this file. */
async function elegir(page, id, nombre, buffer, mimeType) {
  const boton = celda(page, id).locator('.archivos-celda-elegir');
  igual(await boton.innerText(), 'Elegir archivo…', 'texto del botón');
  const accept = await celda(page, id).locator('input[type=file]').getAttribute('accept');
  cierto(/\.docx/.test(accept) && /\.xlsx/.test(accept) && /\.pdf/.test(accept), `accept: ${accept}`);
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), boton.click()]);
  await chooser.setFiles({ name: nombre, buffer, mimeType });
}
/** Run `accion`, expect one download and no new tab; return its name and SHA-256. */
async function descargaDe(s, accion) {
  const antes = s.popups;
  const [d] = await Promise.all([s.page.waitForEvent('download'), accion()]);
  const ruta = await d.path();
  await esperar(300);
  const nuevas = s.contexto.pages().filter((p) => p !== s.page && !p.isClosed()).length;
  return { nombre: d.suggestedFilename(), sha: sha(readFileSync(ruta)), pestanas: nuevas, popups: s.popups - antes };
}
async function pestanaDe(s, accion) {
  const [popup] = await Promise.all([s.page.waitForEvent('popup'), accion()]);
  await hasta(() => popup.url().startsWith('blob:'), `la pestaña no recibió el archivo (${popup.url()})`);
  const h = await popup.evaluate(async () => {
    const b = await (await fetch(location.href)).arrayBuffer();
    return [...new Uint8Array(await crypto.subtle.digest('SHA-256', b))].map((x) => x.toString(16).padStart(2, '0')).join('');
  });
  await popup.close();
  return h;
}
const foto = async (page, nombre) => { if (SHOTS) await page.screenshot({ path: join(SHOTS, `${nombre}.png`) }); };

/* --------------------------------------------------------------- data */

const ada = await abrirSesion('ada');
const admin = (m, r, c) => llamar(ada.page, m, r, c);
const base = (await admin('POST', '/api/maestra/bases', { nombre: 'Base Office Ficticia' })).datos.base;
const ops = Object.fromEntries((await admin('GET', '/api/maestra/operadores?limit=200')).datos.usuarios.map((o) => [o.login, o.id]));
igual((await admin('PUT', `/api/maestra/bases/${base.id}/acceso`, { expected_version: base.version, usuarios: [ops.olga] })).status, 200, 'acceso');
const crear = async (nombre) => (await admin('POST', `/api/maestra/bases/${base.id}/terrenos`, { terreno: nombre })).datos.terreno.id;
const T = {};
for (const [k, n] of [['celda', 'Lote Office Celda'], ['detalle', 'Lote Office Detalle'], ['previo', 'Lote Office Previo'],
  ['rechazo', 'Lote Office Rechazo'], ['pdf', 'Lote Office PDF']]) T[k] = await crear(`${n} Ficticio`);
const olga = await abrirSesion('olga');      // after the grant: its first table load sees the base

/* ----------------------------------------------------------- journeys */

await revisar('administrador: celda con selector → DOCX guardado; «1 archivo» lo descarga con su nombre y bytes, sin pestaña', async () => {
  await irA(ada.page, base.id);
  await elegir(ada.page, T.celda, 'Acta Ñandú ficticia.docx', F.docx, DOCX);
  await hasta(async () => (await resumen(ada.page, T.celda)) === '1 archivo', 'no llegó a 1 archivo', 60000);
  igual(await enlace(ada.page, T.celda).getAttribute('data-modo'), 'directo', 'modo');
  cierto(/Descargar el archivo/.test(await enlace(ada.page, T.celda).getAttribute('title')), 'título de descarga');
  const d = await descargaDe(ada, () => enlace(ada.page, T.celda).click());
  igual(d, { nombre: 'Acta Ñandú ficticia.docx', sha: sha(F.docx), pestanas: 0, popups: 0 }, 'descarga');
  await foto(ada.page, 'celda-docx');
});

await revisar('operador: celda con selector → XLSX; el selector de «2 archivos» descarga cada uno con su nombre', async () => {
  await irA(olga.page, base.id);
  await elegir(olga.page, T.celda, 'Avalúo ficticio.xlsx', F.xlsx, XLSX);
  await hasta(async () => (await resumen(olga.page, T.celda)) === '2 archivos', 'no llegó a 2 archivos', 60000);
  await enlace(olga.page, T.celda).click();
  const sel = olga.page.getByRole('dialog', { name: 'Archivos guardados de este terreno' });
  const x = await descargaDe(olga, () => sel.locator('.archivos-opcion', { hasText: 'Avalúo ficticio.xlsx' }).click());
  igual(x, { nombre: 'Avalúo ficticio.xlsx', sha: sha(F.xlsx), pestanas: 0, popups: 0 }, 'xlsx');
  await hasta(async () => (await sel.count()) === 0, 'el selector no se cerró');
  await enlace(olga.page, T.celda).click();
  const w = await descargaDe(olga, () => sel.locator('.archivos-opcion', { hasText: 'Acta Ñandú ficticia.docx' }).click());
  igual(w, { nombre: 'Acta Ñandú ficticia.docx', sha: sha(F.docx), pestanas: 0, popups: 0 }, 'docx del administrador');
});

await revisar('operador: detalle con arrastre → XLSX; «Descargar» sí, «Abrir» no', async () => {
  await irA(olga.page, base.id);
  await fila(olga.page, T.detalle).getByRole('button', { name: /Abrir terreno/ }).click();
  const d = olga.page.getByRole('dialog', { name: 'Lote Office Detalle Ficticio' });
  const seccion = d.locator('.archivos-detalle[data-tipo="pdf"]');
  igual(await seccion.locator('.archivos-titulo').innerText(), 'Archivos (PDF, JPG, Word o Excel)', 'título');
  igual(await seccion.locator('.archivos-elegir').innerText(), 'Elegir archivo…', 'botón');
  const zona = seccion.locator('.archivos-zona');
  const dt = await olga.page.evaluateHandle(([b64, nombre, tipo]) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const t = new DataTransfer();
    t.items.add(new File([bytes], nombre, { type: tipo }));
    return t;
  }, [F.xlsx.toString('base64'), 'Tabla de lotes ficticia.xlsx', XLSX]);
  await zona.dispatchEvent('dragenter', { dataTransfer: dt });
  await zona.dispatchEvent('dragover', { dataTransfer: dt });
  await zona.dispatchEvent('drop', { dataTransfer: dt });
  const item = seccion.locator('.archivos-item', { hasText: 'Tabla de lotes ficticia.xlsx' });
  await item.waitFor({ timeout: 60000 });
  igual(await item.getByRole('button', { name: /^Abrir/ }).count(), 0, 'sin «Abrir»');
  const r = await descargaDe(olga, () => item.getByRole('button', { name: /^Descargar/ }).click());
  igual(r, { nombre: 'Tabla de lotes ficticia.xlsx', sha: sha(F.xlsx), pestanas: 0, popups: 0 }, 'descarga del detalle');
  // Its version line says the same.
  await item.getByRole('button', { name: 'Versiones' }).click();
  const v = item.locator('.archivos-version').first();
  await v.waitFor();
  igual(await v.getByRole('button', { name: /^Abrir/ }).count(), 0, 'versión sin «Abrir»');
  const rv = await descargaDe(olga, () => v.getByRole('button', { name: /^Descargar/ }).click());
  igual([rv.nombre, rv.sha], ['Tabla de lotes ficticia.xlsx', sha(F.xlsx)], 'descarga de la versión');
  await foto(olga.page, 'detalle-xlsx');
  await d.getByRole('button', { name: 'Cerrar' }).last().click();
});

await revisar('un Word guardado detrás de una subida nueva vencida se descarga con su propio nombre', async () => {
  const subido = await olga.page.evaluate(async ([id, b64]) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const hex = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((x) => x.toString(16).padStart(2, '0')).join('');
    const r1 = await fetch(`/api/inventario/terrenos/${id}/archivos`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({ tipo: 'pdf', nombre_original: 'Guardado ficticio.docx', tamano_declarado: bytes.length, sha256_declarado: hex }) });
    const inicio = await r1.json();
    await fetch(`/api/archivos/versiones/${inicio.version_id}/contenido`, { method: 'PUT',
      headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }, body: bytes });
    await fetch(`/api/archivos/versiones/${inicio.version_id}/completar`, { method: 'POST' });
    return inicio;
  }, [T.previo, F.docx2.toString('base64')]);
  // Disposable DB only: a newer upload of this attachment that never finished.
  execFileSync(PY, ['-c', 'import sqlite3,sys\nc=sqlite3.connect(sys.argv[1])\n'
    + 'c.row_factory=sqlite3.Row\nv=c.execute("SELECT * FROM archivo_version WHERE id=?",(sys.argv[2],)).fetchone()\n'
    + 'c.execute("INSERT INTO archivo_version (id, archivo_id, inventory_id, numero, estado, revision_base, nombre_original,'
    + ' tamano_declarado, sha256_declarado, clave_temporal, subida_vence_en, completar_antes_de, iniciado_en, iniciado_por)'
    + ' VALUES (?,?,?,2,\'subiendo\',?,\'Reemplazo ficticio.docx\',1,?,\'temporal/x\',\'2000-01-01T00:00:00+00:00\','
    + '\'2000-01-01T00:00:00+00:00\',?,?)",(sys.argv[3],v["archivo_id"],v["inventory_id"],v["revision_base"],"0"*64,v["iniciado_en"],v["iniciado_por"]))\n'
    + 'c.commit()', BD, subido.version_id, randomUUID()]);
  await irA(olga.page, base.id);
  await hasta(async () => (await resumen(olga.page, T.previo)) === '1 archivo', 'resumen', 30000);
  const r = await descargaDe(olga, () => enlace(olga.page, T.previo).click());
  igual([r.nombre, r.sha, r.pestanas], ['Guardado ficticio.docx', sha(F.docx2), 0], 'la guardada, no el reemplazo');
  // From the detail, «Descargar guardada» names it after the server too.
  await fila(olga.page, T.previo).getByRole('button', { name: /Abrir terreno/ }).click();
  const d = olga.page.getByRole('dialog', { name: 'Lote Office Previo Ficticio' });
  const g = await descargaDe(olga, () => d.getByRole('button', { name: 'Descargar la versión guardada' }).click());
  igual([g.nombre, g.sha], ['Guardado ficticio.docx', sha(F.docx2)], 'descargar guardada');
  const a = await descargaDe(olga, () => d.getByRole('button', { name: 'Abrir la versión guardada' }).click());
  igual([a.nombre, a.sha, a.pestanas], ['Guardado ficticio.docx', sha(F.docx2), 0], 'abrir guardada: se descarga y no deja pestaña');
  await d.getByRole('button', { name: 'Cerrar' }).last().click();
});

await revisar('un ZIP renombrado .docx se rechaza tras subirlo; un .doc ni se sube', async () => {
  await irA(ada.page, base.id);
  await elegir(ada.page, T.rechazo, 'Renombrado ficticio.docx', F.zip, DOCX);
  await hasta(async () => (await fase(ada.page, T.rechazo)) === 'fallido', 'no falló', 60000);
  const texto = await celda(ada.page, T.rechazo).innerText();
  cierto(/no es un archivo de Office/.test(texto + (await celda(ada.page, T.rechazo).locator('[title]').evaluateAll(
    (n) => n.map((x) => x.title).join(' ')))), `mensaje: ${texto}`);
  await elegir(ada.page, T.rechazo, 'Viejo ficticio.doc', F.docx, 'application/msword');
  await hasta(async () => /PDF, JPG, Word o Excel/.test(await celda(ada.page, T.rechazo).innerText()), 'no avisó del tipo');
  await foto(ada.page, 'rechazos');
});

await revisar('regresión: un PDF sigue abriéndose en una pestaña y el KMZ no cambia', async () => {
  await irA(ada.page, base.id);
  await elegir(ada.page, T.pdf, 'Plano ficticio.pdf', PDF, 'application/pdf');
  await hasta(async () => (await resumen(ada.page, T.pdf)) === '1 archivo', 'no llegó el PDF', 60000);
  cierto(/pestaña nueva/.test(await enlace(ada.page, T.pdf).getAttribute('title')), 'título de PDF');
  igual(await pestanaDe(ada, () => enlace(ada.page, T.pdf).click()), sha(PDF), 'PDF en pestaña');
  igual(await resumen(ada.page, T.pdf, 'core:kmz'), 'Sin KMZ / KML', 'KMZ intacto');
  igual(await celda(ada.page, T.pdf, 'core:kmz').locator('.archivos-celda-elegir').innerText(), 'Elegir KMZ o KML…', 'botón KMZ');
});

await revisar('sin errores de página', async () => {
  for (const s of sesiones) igual(s.errores, [], `errores de ${s.usuario}`);
});

await navegador.close();
servidor.kill('SIGTERM');
rmSync(CARPETA, { recursive: true, force: true });
console.log(fallos ? `\n${fallos} comprobación(es) fallaron` : '\ntodo bien');
process.exit(fallos ? 1 : 0);
