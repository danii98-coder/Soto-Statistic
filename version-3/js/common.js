/* Utilidades compartidas por los módulos */
const Util = (function () {
  const F = Report.F;
  const isNum = (x) => typeof x === 'number' && isFinite(x);
  const blank = (x) => x === null || x === undefined;

  /* nivel de confianza: acepta 95, 0.95 o "95%" */
  function conf(c) {
    if (blank(c)) return null; if (!isNum(c)) UI.fail('El nivel de confianza no es un número válido.');
    const v = c > 1 ? c / 100 : c; if (!(v > 0 && v < 1)) UI.fail('El nivel de confianza debe estar entre 0 y 100 %.'); return v;
  }
  /* valor crítico Z bilateral con redondeo opcional a 3 decimales */
  function zCrit(p, round) { const z = Stat.normInv(p); return round ? +z.toFixed(3) : z; }
  const alphaOf = (c) => +(1 - c).toFixed(10);

  function rng(seed) {
    if (seed === null || seed === undefined || String(seed).trim() === '') return Math.random;
    let h = 1779033703 ^ String(seed).length; const s = String(seed);
    for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    let a = h >>> 0;
    return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function sampleIdx(N, n, r) { // n índices distintos de 0..N-1 (Fisher-Yates parcial)
    const a = Array.from({ length: N }, (_, i) => i);
    for (let i = 0; i < n; i++) { const j = i + Math.floor(r() * (N - i)); [a[i], a[j]] = [a[j], a[i]]; }
    return a.slice(0, n).sort((x, y) => x - y);
  }
  /* reparto con restos mayores para que la suma sea exactamente n */
  function roundAlloc(exact, n) {
    const fl = exact.map(Math.floor); let rest = n - Stat.sum(fl);
    const ord = exact.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0]);
    for (let i = 0; i < ord.length && rest > 0; i++, rest--) fl[ord[i][1]]++;
    return fl;
  }
  function need(obj, labels) { // verifica números válidos
    Object.entries(labels).forEach(([k, l]) => { if (obj[k] !== null && obj[k] !== undefined && !isNum(obj[k])) UI.fail(`«${l}» no es un número válido.`); });
  }
  function required(obj, labels) {
    need(obj, labels);
    Object.entries(labels).forEach(([k, l]) => { if (!isNum(obj[k])) UI.fail(`Falta el dato «${l}».`); });
  }
  /* tabla pegada desde Excel/CSV */
  function parseTable(txt) {
    const lines = txt.split(/\r?\n/).map((l) => l.trim()).filter(Boolean); if (lines.length < 2) UI.fail('Pega una tabla con la fila de encabezados y al menos una fila de datos.');
    const sep = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : lines[0].includes(',') ? ',' : /\s+/;
    const rows = lines.map((l) => l.split(sep).map((x) => x.trim()));
    const head = rows[0], data = rows.slice(1);
    return { head, data: data.map((r) => head.map((_, i) => { const v = r[i] === undefined ? '' : r[i]; const n = Number(String(v).replace(',', '.')); return v !== '' && isFinite(n) ? n : v; })) };
  }
  const pct = (x, d = 2) => F(x * 100, d) + ' %';
  return { F, isNum, blank, conf, zCrit, alphaOf, rng, sampleIdx, roundAlloc, need, required, parseTable, pct };
})();
