/* Módulo Distribuciones: normal, binomial, Poisson y calculadora de valores críticos / valor p */
(function () {
  const F = Report.F, { blank } = Util;

  /* ===== normal ===== */
  function normalTool(el) {
    UI.tool(el, {
      title: 'Distribución normal', icon: 'bell', desc: 'Calcula probabilidades estandarizando z = (x − μ)/σ, o halla el valor x que acumula una probabilidad dada.',
      fields: [
        { id: 'mu', label: 'Media (μ)', value: 0 }, { id: 'sg', label: 'Desviación (σ)', value: 1 },
        { id: 'm', label: 'Calcular', type: 'select', wide: true, options: [['le', 'P(X ≤ a)'], ['ge', 'P(X ≥ a)'], ['bt', 'P(a ≤ X ≤ b)'], ['inv', 'Valor x con P(X ≤ x) = p (inversa)']] },
        { id: 'a', label: 'a', show: (v) => v.m !== 'inv' }, { id: 'b', label: 'b', show: (v) => v.m === 'bt' }, { id: 'p', label: 'Probabilidad p', show: (v) => v.m === 'inv', hint: 'Entre 0 y 1' }
      ],
      examples: [{ label: 'P(Z ≤ 1.96)', values: { mu: 0, sg: 1, m: 'le', a: 1.96 } }, { label: 'P(60 ≤ X ≤ 85), μ=70, σ=10', values: { mu: 70, sg: 10, m: 'bt', a: 60, b: 85 } }, { label: 'x con p = 0.90, μ=100, σ=15', values: { mu: 100, sg: 15, m: 'inv', p: 0.9 } }],
      run(v) {
        Util.need(v, { mu: 'μ', sg: 'σ', a: 'a', b: 'b', p: 'p' }); const mu = v.mu ?? 0, sg = v.sg ?? 1; if (!(sg > 0)) UI.fail('σ debe ser positiva.');
        const rep = Report.create({ title: 'Distribución normal', module: 'Distribuciones', subtitle: `X ~ N(μ = ${F(mu)}, σ = ${F(sg)})` }); rep.h('Fórmula'); rep.eq('Z = (X − μ) / σ'); rep.h('Procedimiento');
        const zf = (x) => (x - mu) / sg; let ra, res, lbl;
        if (v.m === 'inv') { if (blank(v.p) || v.p <= 0 || v.p >= 1) UI.fail('p debe estar entre 0 y 1.'); const z = Stat.normInv(v.p), x = mu + z * sg; rep.step(1, 'Buscar z en la tabla (inversa)', [`Φ(z) = ${F(v.p)} → z = ${F(z, 4)}`]); rep.step(2, 'Despejar x', [`x = μ + z·σ = ${F(mu)} + ${F(z, 4)}·${F(sg)} = ${F(x, 4)}`]); ra = [-8, z]; res = x; lbl = `x tal que P(X ≤ x) = ${F(v.p)}`; rep.chart({ kind: 'dist', dist: 'z', ra, crit: [z], title: 'Área acumulada hasta el valor buscado', raLabel: 'P = ' + F(v.p, 4), raName: 'Probabilidad', xlabel: 'Z' }); rep.result(lbl, x); return rep; }
        if (blank(v.a)) UI.fail('Falta el valor a.'); const za = zf(v.a);
        if (v.m === 'le') { res = Stat.normCdf(za); ra = [-8, za]; rep.step(1, 'Estandarizar', [`z = (${F(v.a)} − ${F(mu)}) / ${F(sg)} = ${F(za, 4)}`]); rep.step(2, 'Área acumulada', [`P(X ≤ ${F(v.a)}) = Φ(${F(za, 3)}) = ${F(res, 5)}`]); }
        else if (v.m === 'ge') { res = 1 - Stat.normCdf(za); ra = [za, 8]; rep.step(1, 'Estandarizar', [`z = (${F(v.a)} − ${F(mu)}) / ${F(sg)} = ${F(za, 4)}`]); rep.step(2, 'Complemento', [`P(X ≥ ${F(v.a)}) = 1 − Φ(${F(za, 3)}) = 1 − ${F(Stat.normCdf(za), 5)} = ${F(res, 5)}`]); }
        else { if (blank(v.b)) UI.fail('Falta el valor b.'); if (v.b < v.a) UI.fail('b debe ser mayor o igual que a.'); const zb = zf(v.b); res = Stat.normCdf(zb) - Stat.normCdf(za); ra = [za, zb]; rep.step(1, 'Estandarizar', [`za = (${F(v.a)} − ${F(mu)})/${F(sg)} = ${F(za, 4)}`, `zb = (${F(v.b)} − ${F(mu)})/${F(sg)} = ${F(zb, 4)}`]); rep.step(2, 'Restar áreas', [`P = Φ(${F(zb, 3)}) − Φ(${F(za, 3)}) = ${F(Stat.normCdf(zb), 5)} − ${F(Stat.normCdf(za), 5)} = ${F(res, 5)}`]); }
        rep.chart({ kind: 'dist', dist: 'z', ra, crit: ra.filter((q) => Math.abs(q) < 7), title: 'Probabilidad bajo la curva normal estándar', raLabel: 'P = ' + F(res, 4), raName: 'Probabilidad', xlabel: 'Z (valores estandarizados)' });
        rep.result('Probabilidad', res); rep.concl(`La probabilidad es ${F(res, 5)} (${F(res * 100, 3)} %).`, 'ok'); return rep;
      }
    });
  }

  /* ===== discretas ===== */
  function discrete(el, kind) {
    const bin = kind === 'bin';
    UI.tool(el, {
      title: bin ? 'Distribución binomial' : 'Distribución de Poisson', icon: 'bell', desc: bin ? 'P(X = k) = C(n,k)·pᵏ·(1−p)ⁿ⁻ᵏ. Calcula probabilidades puntuales, acumuladas y por rangos.' : 'P(X = k) = e⁻λ·λᵏ / k!. Para conteos de eventos raros en un intervalo.',
      fields: [
        ...(bin ? [{ id: 'n', label: 'Ensayos (n)' }, { id: 'p', label: 'Prob. de éxito (p)' }] : [{ id: 'l', label: 'Media (λ)' }]),
        { id: 'm', label: 'Calcular', type: 'select', wide: true, options: [['eq', 'P(X = k)'], ['le', 'P(X ≤ k)'], ['lt', 'P(X < k)'], ['ge', 'P(X ≥ k)'], ['gt', 'P(X > k)'], ['bt', 'P(a ≤ X ≤ b)']] },
        { id: 'k', label: 'k', show: (v) => v.m !== 'bt' }, { id: 'a', label: 'a', show: (v) => v.m === 'bt' }, { id: 'b', label: 'b', show: (v) => v.m === 'bt' }
      ],
      examples: bin ? [{ label: 'n=10, p=0.5, P(X=3)', values: { n: 10, p: 0.5, m: 'eq', k: 3 } }, { label: 'n=20, p=0.3, P(X ≥ 8)', values: { n: 20, p: 0.3, m: 'ge', k: 8 } }] : [{ label: 'λ=3, P(X=2)', values: { l: 3, m: 'eq', k: 2 } }, { label: 'λ=4.5, P(X ≤ 6)', values: { l: 4.5, m: 'le', k: 6 } }],
      run(v) {
        Util.need(v, { n: 'n', p: 'p', l: 'λ', k: 'k', a: 'a', b: 'b' });
        if (bin) { if (!Number.isInteger(v.n) || v.n < 1 || v.n > 5000) UI.fail('n debe ser un entero entre 1 y 5000.'); if (blank(v.p) || v.p < 0 || v.p > 1) UI.fail('p debe estar entre 0 y 1.'); } else if (blank(v.l) || v.l <= 0) UI.fail('λ debe ser positiva.');
        const pmf = (k) => bin ? Stat.binomPmf(k, v.n, v.p) : Stat.poisPmf(k, v.l), top = bin ? v.n : Math.ceil(v.l + 8 * Math.sqrt(v.l) + 10);
        let lo, hi; const need = (x, nm) => { if (blank(x) || !Number.isInteger(x) || x < 0) UI.fail(`${nm} debe ser un entero no negativo.`); return x; };
        if (v.m === 'bt') { lo = need(v.a, 'a'); hi = need(v.b, 'b'); if (hi < lo) UI.fail('b debe ser mayor o igual que a.'); } else { const k = need(v.k, 'k'); ({ eq: () => { lo = hi = k; }, le: () => { lo = 0; hi = k; }, lt: () => { lo = 0; hi = k - 1; }, ge: () => { lo = k; hi = top; }, gt: () => { lo = k + 1; hi = top; } })[v.m](); }
        if (bin) hi = Math.min(hi, v.n); let res = 0; for (let k = Math.max(0, lo); k <= hi; k++) res += pmf(k); res = Math.min(1, res);
        const mean = bin ? v.n * v.p : v.l, vr = bin ? v.n * v.p * (1 - v.p) : v.l;
        const rep = Report.create({ title: bin ? 'Distribución binomial' : 'Distribución de Poisson', module: 'Distribuciones', subtitle: bin ? `X ~ B(n = ${v.n}, p = ${F(v.p)})` : `X ~ Poisson(λ = ${F(v.l)})` });
        rep.h('Fórmula'); rep.eq(bin ? 'P(X = k) = C(n, k) · pᵏ · (1 − p)ⁿ⁻ᵏ' : 'P(X = k) = e^(−λ) · λᵏ / k!'); rep.h('Procedimiento');
        const nm = { eq: `P(X = ${v.k})`, le: `P(X ≤ ${v.k})`, lt: `P(X < ${v.k})`, ge: `P(X ≥ ${v.k})`, gt: `P(X > ${v.k})`, bt: `P(${v.a} ≤ X ≤ ${v.b})` }[v.m];
        const terms = []; for (let k = lo; k <= Math.min(hi, lo + 3); k++) terms.push(bin ? `C(${v.n},${k})·${F(v.p)}^${k}·${F(1 - v.p)}^${v.n - k} = ${F(pmf(k), 6)}` : `e^(−${F(v.l)})·${F(v.l)}^${k}/${k}! = ${F(pmf(k), 6)}`);
        rep.step(1, 'Valores de k incluidos', [`${nm}: k = ${lo}${hi > lo ? ' … ' + hi : ''}`]); rep.step(2, 'Probabilidades puntuales' + (hi - lo > 3 ? ' (primeros términos)' : ''), terms); if (hi > lo) rep.step(3, 'Sumar', [`${nm} = Σ P(X = k) = ${F(res, 6)}`]);
        rep.kv([['Media', mean], ['Varianza', vr], ['Desviación estándar', Math.sqrt(vr)]]);
        const w0 = Math.max(0, Math.floor(mean - 4.5 * Math.sqrt(vr)) - 1), w1 = Math.min(top, Math.ceil(mean + 4.5 * Math.sqrt(vr)) + 1), ks = []; for (let k = w0; k <= w1; k++) ks.push(k);
        rep.chart({ kind: 'bars', title: `${nm} = ${F(res, 5)}`, labels: ks, values: ks.map(pmf), highlight: ks.map((k, i) => (k >= lo && k <= hi) ? i : -1).filter((i) => i >= 0), xlabel: 'k', ylabel: 'P(X = k)', fmtVal: (x) => F(x, 3) }, 'Las barras rojas son los valores de k incluidos');
        let cum = 0; if (ks.length <= 60) rep.table(['k', 'P(X = k)', 'P(X ≤ k)'], ks.map((k) => { cum += pmf(k); return [k, F(pmf(k), 6), F(Stat.sum(Array.from({ length: k + 1 }, (_, j) => pmf(j))), 6)]; }), 'Tabla de la distribución');
        rep.result(nm, res); rep.concl(`${nm} = ${F(res, 6)} (${F(res * 100, 3)} %).`, 'ok'); return rep;
      }
    });
  }

  /* ===== calculadora de valores críticos y valor p ===== */
  function critTool(el) {
    UI.tool(el, {
      title: 'Calculadora Z, t, χ² y F (valor crítico y valor p)', icon: 'key', desc: 'Lo que harías con las tablas, pero exacto: dado α encuentra el valor crítico; dado un estadístico calcula el valor p.',
      fields: [
        { id: 'd', label: 'Distribución', type: 'select', options: [['z', 'Normal Z'], ['t', 't de Student'], ['chi', 'Chi-cuadrado χ²'], ['f', 'F de Fisher']] },
        { id: 'df', label: 'Grados de libertad', show: (v) => v.d !== 'z' }, { id: 'df2', label: 'gl denominador', show: (v) => v.d === 'f' },
        { id: 'm', label: 'Buscar', type: 'select', wide: true, options: [['crit', 'Valor crítico a partir de α'], ['p', 'Valor p a partir de un estadístico']] },
        { id: 'al', label: 'Nivel α', value: 0.05, show: (v) => v.m === 'crit' }, { id: 'x', label: 'Estadístico calculado', show: (v) => v.m === 'p' },
        { id: 'tail', label: 'Cola', type: 'select', wide: true, options: [['two', 'Bilateral'], ['right', 'Cola derecha'], ['left', 'Cola izquierda']] }
      ],
      examples: [{ label: 'Z crítico α=0.05 bilateral', values: { d: 'z', m: 'crit', al: 0.05, tail: 'two' } }, { label: 't crítico gl=9, α=0.05 bilat.', values: { d: 't', df: 9, m: 'crit', al: 0.05, tail: 'two' } }, { label: 'χ² gl=10, α=0.05 derecha', values: { d: 'chi', df: 10, m: 'crit', al: 0.05, tail: 'right' } }, { label: 'Valor p de Z = 2.1', values: { d: 'z', m: 'p', x: 2.1, tail: 'two' } }],
      run(v) {
        Util.need(v, { df: 'gl', df2: 'gl₂', al: 'α', x: 'estadístico' }); const D = Htest.DIST[v.d]; if (v.d !== 'z' && (blank(v.df) || v.df < 1)) UI.fail('Indica los grados de libertad.'); if (v.d === 'f' && (blank(v.df2) || v.df2 < 1)) UI.fail('Indica los grados de libertad del denominador.');
        let tail = v.tail; if (!D.symm && tail === 'two' && v.m === 'crit') tail = 'two'; const rep = Report.create({ title: `${D.sym}: ${v.m === 'crit' ? 'valor crítico' : 'valor p'}`, module: 'Distribuciones', subtitle: D.name + (v.d !== 'z' ? ` · gl = ${v.df}${v.d === 'f' ? ' y ' + v.df2 : ''}` : '') });
        const low = D.symm ? -Infinity : 0, df = v.d === 'z' ? undefined : v.df, df2 = v.d === 'f' ? v.df2 : undefined;
        if (v.m === 'crit') {
          const al = v.al >= 1 ? v.al / 100 : v.al, C = (() => { const t = require_crit(v.d, tail, al, df, df2); return t; })();
          rep.step(1, 'Dato', [`α = ${F(al)}, prueba ${Htest.TAILNAME[tail]}`]); rep.step(2, 'Buscar el cuantil', [tail === 'two' ? (D.symm ? `${D.sym}(1−α/2) = ${D.sym}(${F(1 - al / 2, 4)}) = ±${F(C.crit[1], 4)}` : `Inferior: ${D.sym}(α/2) = ${F(C.crit[0], 4)};  superior: ${D.sym}(1−α/2) = ${F(C.crit[1], 4)}`) : `${D.sym}(${F(tail === 'right' ? 1 - al : al, 4)}) = ${F(C.crit[0], 4)}`]);
          rep.chart({ kind: 'dist', dist: v.d, df, df2, ra: C.ra, rr: C.rr, crit: C.crit, title: 'Valor crítico y región de rechazo', raLabel: '1 − α = ' + F(1 - al, 4), rrLabel: 'α', xlabel: D.sym }); rep.result('Valor crítico', C.crit.map((c) => F(c, 4)).join(' ; '));
        } else {
          if (blank(v.x)) UI.fail('Escribe el estadístico calculado.'); const cdf = D.cdf(v.x, df, df2), pv = tail === 'two' ? Math.min(1, 2 * Math.min(cdf, 1 - cdf)) : tail === 'left' ? cdf : 1 - cdf;
          rep.step(1, 'Área acumulada', [`P(${D.sym} ≤ ${F(v.x)}) = ${F(cdf, 6)}`]); rep.step(2, 'Valor p (' + Htest.TAILNAME[tail] + ')', [tail === 'two' ? `p = 2·min(${F(cdf, 5)}, ${F(1 - cdf, 5)}) = ${F(pv, 6)}` : tail === 'left' ? `p = ${F(pv, 6)}` : `p = 1 − ${F(cdf, 5)} = ${F(pv, 6)}`]);
          const rr = tail === 'two' ? [[low, D.symm ? -Math.abs(v.x) : Math.min(v.x, D.q(0.5, df, df2))], [D.symm ? Math.abs(v.x) : Math.max(v.x, D.q(0.5, df, df2)), Infinity]] : tail === 'left' ? [[low, v.x]] : [[v.x, Infinity]];
          rep.chart({ kind: 'dist', dist: v.d, df, df2, rr, marks: [{ x: v.x, label: `${D.sym} = ${F(v.x, 3)}` }], title: 'Valor p = área de la zona roja', rrLabel: 'p', xlabel: D.sym }); rep.result('Valor p', pv); rep.concl(`Se rechaza H₀ siempre que α > ${F(pv, 5)}; con α = 0.05 ${pv < 0.05 ? 'se rechaza' : 'no se rechaza'}.`, pv < 0.05 ? 'bad' : 'info');
        }
        return rep;
      }
    });
  }
  function require_crit(d, tail, a, df, df2) { const D = Htest.DIST[d], low = D.symm ? -Infinity : 0; if (tail === 'two') { const hi = D.q(1 - a / 2, df, df2), lo = D.symm ? -hi : D.q(a / 2, df, df2); return { ra: [lo, hi], rr: [[low, lo], [hi, Infinity]], crit: [lo, hi] }; } if (tail === 'left') { const c = D.q(a, df, df2); return { ra: [c, Infinity], rr: [[low, c]], crit: [c] }; } const c = D.q(1 - a, df, df2); return { ra: [low, c], rr: [[c, Infinity]], crit: [c] }; }

  App.register({ id: 'distribuciones', name: 'Distribuciones', icon: 'bell', blurb: 'Normal, binomial, Poisson y calculadora de valores críticos y valor p.', tools: [{ id: 'normal', name: 'Normal', render: normalTool }, { id: 'binomial', name: 'Binomial', render: (e) => discrete(e, 'bin') }, { id: 'poisson', name: 'Poisson', render: (e) => discrete(e, 'poi') }, { id: 'criticos', name: 'Z · t · χ² · F', render: critTool }] });
})();
