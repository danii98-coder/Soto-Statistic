/* Motor de pruebas de hipótesis: pasos ① a ⑥ como se resuelven en clase, con interpolación en tabla y álgebra paso a paso */
const Htest = (function () {
  const F = Report.F;
  const DIST = {
    z: { sym: 'Z', symm: true, cdf: (x) => Stat.normCdf(x), q: (p) => Stat.normInv(p), name: 'normal estándar n(0,1)' },
    t: { sym: 't', symm: true, cdf: (x, d) => Stat.tCdf(x, d), q: (p, d) => Stat.tInv(p, d), name: 't de Student' },
    chi: { sym: 'χ²', symm: false, cdf: (x, d) => Stat.chiCdf(x, d), q: (p, d) => Stat.chiInv(p, d), name: 'chi-cuadrado' },
    f: { sym: 'F', symm: false, cdf: (x, d, d2) => Stat.fCdf(x, d, d2), q: (p, d, d2) => Stat.fInv(p, d, d2), name: 'F de Fisher' }
  };
  const TEXSYM = { z: 'Z', t: 't', chi: '\\chi^2', f: 'F' };
  const REL = { two: ['=', '≠', 'es distinta de'], right: ['≤', '>', 'es mayor que'], left: ['≥', '<', 'es menor que'] };
  const TAILNAME = { two: 'bilateral (dos colas)', right: 'cola derecha', left: 'cola izquierda' };
  function hyp(a, b, tail) { const r = REL[tail]; return { h0: `H₀: ${a} ${r[0]} ${b}`, h1: `H₁: ${a} ${r[1]} ${b}`, w: `${a} ${r[2]} ${b}` }; }

  /* ---- formato para LaTeX ---- */
  const tx = (x, d = 4) => { if (typeof x === 'string') return x; return String(+x.toFixed(d)); };
  const tp = (x, d = 4) => (x < 0 ? `(${tx(x, d)})` : tx(x, d));
  const r4 = (x) => +x.toFixed(Math.abs(x) >= 0.01 ? 4 : 6); // redondeo "a mano" de denominadores

  /* ---- tabla Z con 4 decimales (la que se usa en clase) ---- */
  const zTab = (z) => Math.round(Stat.normCdf(z) * 1e4) / 1e4;
  function zFromTable(p) {
    const k0 = Math.floor(Stat.normInv(p) * 100 + 1e-9);
    for (let k = k0 - 1; k <= k0 + 1; k++) {
      const z1 = k / 100, z2 = (k + 1) / 100, y1 = zTab(z1), y2 = zTab(z2);
      if (Math.abs(y1 - p) < 1e-9) return { z: z1, exact: true, y1 };
      if (y1 < p && p < y2) return { z: z1 + 0.01 * (p - y1) / (y2 - y1), exact: false, z1, z2, y1, y2 };
    }
    return { z: Stat.normInv(p), exact: true, y1: p, fallback: true };
  }
  const n3 = (x) => (+x.toFixed(3)).toString();

  /* valores críticos + el paso 5.1 (cómo se obtienen de la tabla) */
  function criteria(d, tail, a, df, df2) {
    const D = DIST[d], low = D.symm ? -Infinity : 0, sym = D.sym; let crit, lines = [], ra, rr;
    if (d === 'z') {
      const p = tail === 'two' ? 1 - a / 2 : 1 - a, r = zFromTable(p), zc = r.z;
      lines.push(`Se busca en la tabla Z el área acumulada ${tail === 'two' ? '1 − α/2' : '1 − α'} = ${F(p, 4)}${tail === 'two' ? '' : ' (por simetría, en cola izquierda el límite es negativo)'}.`);
      if (r.exact) lines.push({ tex: `\\Phi(${tx(zc, 2)})=${tx(r.y1, 4)}\\;\\Rightarrow\\; Z=${tx(zc, 3)}` });
      else {
        lines.push({ tex: `${tx(r.z1, 2)}\\;\\rightarrow\\;${tx(r.y1, 4)}` }, { tex: `\\;x\\;\\;\\rightarrow\\;${tx(p, 4)}` }, { tex: `${tx(r.z2, 2)}\\;\\rightarrow\\;${tx(r.y2, 4)}` });
        lines.push({ tex: `\\frac{x-${tx(r.z1, 2)}}{${tx(r.z2, 2)}-${tx(r.z1, 2)}}=\\frac{${tx(p, 4)}-${tx(r.y1, 4)}}{${tx(r.y2, 4)}-${tx(r.y1, 4)}}` });
        lines.push({ tex: `x=${tx(zc, 3)}` });
      }
      crit = tail === 'two' ? [-zc, zc] : tail === 'left' ? [-zc] : [zc];
    } else if (d === 't') {
      const pa = tail === 'two' ? a / 2 : a, v = +Stat.tInv(1 - pa, df).toFixed(3);
      lines.push(`Tabla t con gl = ${F(df)} y área de una cola ${F(pa, 4)}${tail === 'two' ? ` (α/2; dos colas ${F(a, 4)})` : ''}:`, { tex: `t_c=${tail === 'two' ? '\\pm' : tail === 'left' ? '-' : ''}${tx(v, 3)}` });
      crit = tail === 'two' ? [-v, v] : tail === 'left' ? [-v] : [v];
    } else if (d === 'chi') {
      const lo = (p) => +Stat.chiInv(p, df).toFixed(3);
      if (tail === 'two') crit = [lo(a / 2), lo(1 - a / 2)]; else if (tail === 'left') crit = [lo(a)]; else crit = [lo(1 - a)];
      lines.push(`Tabla χ² con gl = ${F(df)}: ${tail === 'two' ? `área a la derecha ${F(1 - a / 2, 4)} y ${F(a / 2, 4)}` : tail === 'left' ? `área a la derecha ${F(1 - a, 4)}` : `área a la derecha ${F(a, 4)}`}.`, { tex: `\\chi^2_c=${crit.map((c) => tx(c, 3)).join(';\\;')}` });
    } else {
      const lo = (p) => +Stat.fInv(p, df, df2).toFixed(3);
      if (tail === 'two') crit = [lo(a / 2), lo(1 - a / 2)]; else if (tail === 'left') crit = [lo(a)]; else crit = [lo(1 - a)];
      lines.push(`Tabla F con gl = ${F(df)} y ${F(df2)}.`, { tex: `F_c=${crit.map((c) => tx(c, 3)).join(';\\;')}` });
    }
    if (tail === 'two') { ra = [crit[0], crit[1]]; rr = [[low, crit[0]], [crit[1], Infinity]]; }
    else if (tail === 'left') { ra = [crit[0], Infinity]; rr = [[low, crit[0]]]; }
    else { ra = [low, crit[0]]; rr = [[crit[0], Infinity]]; }
    const c3 = (c) => F(c, 3);
    const txtRA = tail === 'two' ? `R.A.: ${sym}c ∈ [${c3(crit[0])} ; ${c3(crit[1])}]` : tail === 'left' ? `R.A.: ${sym}c ≥ ${c3(crit[0])}` : `R.A.: ${sym}c ≤ ${c3(crit[0])}`;
    const txtRR = tail === 'two' ? `R.R.: ${sym}c < ${c3(crit[0])}  ó  ${sym}c > ${c3(crit[1])}` : tail === 'left' ? `R.R.: ${sym}c < ${c3(crit[0])}` : `R.R.: ${sym}c > ${c3(crit[0])}`;
    return { ra, rr, crit, lines, txtRA, txtRR };
  }

  /* α desde α o desde la confianza */
  function alphaFrom(v) {
    const num = (x) => x !== null && x !== undefined && isFinite(x);
    if (num(v.alpha)) { const a = v.alpha >= 1 ? v.alpha / 100 : v.alpha; if (!(a > 0 && a < 1)) UI.fail('El nivel de significancia α debe estar entre 0 y 1.'); return { alpha: a, conf: null }; }
    if (num(v.conf)) { const c = v.conf > 1 ? v.conf / 100 : v.conf; if (!(c > 0 && c < 1)) UI.fail('La confianza debe estar entre 0 y 100 %.'); return { alpha: +(1 - c).toFixed(10), conf: c }; }
    UI.fail('Escribe el nivel de significancia α (ej. 0.05) o la confianza (ej. 95).');
  }

  /* s: title, subtitle, module, alpha, conf, tail, dist, df, df2, value, h0,h1,w, dataKV, pre(rep), dfTex, formulaTex, calcTex[] */
  function build(s) {
    const D = DIST[s.dist], sym = D.sym, a = s.alpha, T = TEXSYM[s.dist];
    const C = criteria(s.dist, s.tail, a, s.df, s.df2), v = s.value;
    const inRA = v >= C.ra[0] - 1e-12 && v <= C.ra[1] + 1e-12;
    const rep = Report.create({ title: s.title, module: s.module || 'Pruebas de hipótesis', subtitle: s.subtitle || '' });
    if (s.dataKV) { rep.h('Datos'); rep.kv(s.dataKV); }
    if (s.pre) s.pre(rep);
    rep.h('Resolución paso a paso');
    rep.step('①', 'Hipótesis', [s.h0, s.h1, 'Prueba ' + TAILNAME[s.tail]]);
    const l2 = [];
    if (s.conf) l2.push({ tex: `1-\\alpha=${tx(s.conf, 4)}\\;\\Rightarrow\\;\\alpha=1-${tx(s.conf, 4)}=${tx(a, 4)}` }); else l2.push({ tex: `\\alpha=${tx(a, 4)}` });
    if (s.tail === 'two') l2.push({ tex: `\\frac{\\alpha}{2}=${tx(a / 2, 5)}` });
    if (s.dfTex) l2.push({ tex: s.dfTex });
    rep.step('②', s.dfTex ? 'Nivel de significancia y grados de libertad' : 'Nivel de significancia', l2);
    rep.step('③', 'Estadística de prueba', [s.formulaTex ? { tex: s.formulaTex } : s.formula, `Distribución ${D.name}`].flat());
    rep.step('④', 'Criterio de decisión', [`Valor${C.crit.length > 1 ? 'es críticos' : ' crítico'}: ${C.crit.map((c) => F(c, 3)).join(' ; ')}`, C.txtRA + '  → se acepta H₀', C.txtRR + '  → se rechaza H₀']);
    rep.chart({
      kind: 'dist', dist: s.dist, df: s.df, df2: s.df2, ra: C.ra, rr: C.rr, crit: C.crit, marks: [{ x: v, label: `${sym}c = ${F(v, 3)}` }],
      title: `Prueba ${TAILNAME[s.tail]} — α = ${F(a)}`, raLabel: `1 − α = ${F(1 - a, 4)}`, rrLabel: s.tail === 'two' ? `R.R. (α/2 = ${F(a / 2, 4)})` : `R.R. (α = ${F(a)})`, raName: 'R.A.', rrName: 'R.R.', xlabel: sym
    }, 'Violeta: región de aceptación (R.A.). Rojo: región de rechazo (R.R.). Dorado: valor calculado.');
    rep.step('5.1', 'Cálculos: valor crítico en la tabla', C.lines);
    rep.step('5.2', 'Cálculos: estadístico de prueba', s.calcTex ? s.calcTex.map((t) => ({ tex: t })) : s.calc);
    rep.step('⑥', 'Decisión', [{ tex: `${T}_c=${tx(v, 4)}` }, `${sym}c = ${F(v, 3)} cae en la ${inRA ? 'región de aceptación (R.A.)' : 'región de rechazo (R.R.)'}`]);
    rep.result('Decisión', inRA ? 'Se acepta H₀' : 'Se rechaza H₀');
    rep.concl(inRA
      ? `Con α = ${F(a)}, no hay evidencia suficiente para rechazar H₀. No se puede afirmar que ${s.w}.`
      : `Con α = ${F(a)}, se rechaza H₀: hay evidencia suficiente para afirmar que ${s.w}.`, inRA ? 'info' : 'bad');
    return rep;
  }

  const stats = (txt, name) => { const x = Stat.parseNums(txt); if (x.length < 2) UI.fail(`Escribe al menos 2 datos en «${name}» (separados por espacios, comas o saltos de línea).`); return { x, n: x.length, m: Stat.mean(x), s: Stat.sd(x) }; };
  const tailField = { id: 'tail', label: 'Tipo de prueba', type: 'select', wide: true, options: [['two', 'Bilateral (H₁: ≠)'], ['right', 'Cola derecha (H₁: >)'], ['left', 'Cola izquierda (H₁: <)']] };
  const alphaFields = () => [{ id: 'alpha', label: 'Nivel de significancia (α)', placeholder: 'ej. 0.05', hint: 'Escribe α…' }, { id: 'conf', label: 'o la confianza (1−α)', placeholder: 'ej. 95', hint: '…o la confianza, no ambos' }];

  return { build, hyp, stats, tailField, alphaFields, alphaFrom, DIST, TAILNAME, tx, tp, r4, zFromTable, zTab };
})();
