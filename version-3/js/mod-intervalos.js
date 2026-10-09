/* Módulo Intervalos de confianza */
(function () {
  const F = Report.F, { blank } = Util;
  const confField = { id: 'conf', label: 'Nivel de confianza (1−α)', unit: '%', value: 95, hint: 'Escribe 95 o 0.95' };

  function build(o) {
    const c = o.conf, a = 1 - c, rep = Report.create({ title: o.title, module: 'Intervalos de confianza', subtitle: o.sub || '' });
    rep.h('Datos'); rep.kv([...o.kv, ['Confianza (1−α)', F(c * 100, 2) + ' %'], ['α', a]]);
    rep.h('Fórmula'); rep.eq(o.formula.join('\n'));
    rep.h('Procedimiento paso a paso');
    rep.step(1, 'Valor crítico', [`1−α = ${F(c)} → α = ${F(a)} → α/2 = ${F(a / 2)}`, ...o.critLines]);
    rep.step(2, o.seName || 'Error estándar', o.seLines);
    rep.step(3, 'Margen de error', [`E = ${o.critSym} · EE = ${F(o.crit, 4)} · ${F(o.se, 5)} = ${F(o.crit * o.se, 5)}`]);
    rep.step(4, 'Intervalo', [`${o.estSym} ± E`, `${F(o.est, 5)} − ${F(o.crit * o.se, 5)} ≤ ${o.param} ≤ ${F(o.est, 5)} + ${F(o.crit * o.se, 5)}`, `${F(o.lo, 5)} ≤ ${o.param} ≤ ${F(o.hi, 5)}`]);
    rep.result(`IC ${F(c * 100, 1)} % para ${o.param}`, `[ ${F(o.lo, 4)} ; ${F(o.hi, 4)} ]`);
    rep.chart({ kind: 'ci', title: `Intervalo de confianza del ${F(c * 100, 1)} % para ${o.param}`, lo: o.lo, hi: o.hi, est: o.est, estLabel: o.estSym, extra: o.zero ? [{ x: 0, label: '0' }] : [] });
    rep.concl(`Con ${F(c * 100, 1)} % de confianza, ${o.interp} está entre ${F(o.lo, 4)} y ${F(o.hi, 4)}.` + (o.zero ? (o.lo > 0 || o.hi < 0 ? ' El intervalo NO contiene el 0: hay diferencia significativa entre los dos grupos.' : ' El intervalo contiene el 0: no hay evidencia de diferencia entre los grupos.') : ''), 'ok');
    return rep;
  }
  const zc = (c) => Stat.normInv(1 - (1 - c) / 2), tc = (c, d) => Stat.tInv(1 - (1 - c) / 2, d);

  function meanTool(el) {
    UI.tool(el, {
      title: 'Intervalo de confianza para la media (μ)', icon: 'eye', desc: 'Usa Z si σ es conocida o n ≥ 30; usa t de Student si n < 30 y σ es desconocida.',
      fields: [
        { id: 'modo', label: 'Datos', type: 'select', wide: true, options: [['res', 'Resumen (x̄, n, s)'], ['dat', 'Lista de datos']] },
        { id: 'dat', label: 'Datos', type: 'textarea', rows: 4, wide: true, show: (v) => v.modo === 'dat' },
        { id: 'xbar', label: 'Media muestral x̄', show: (v) => v.modo === 'res' }, { id: 'n', label: 'n', show: (v) => v.modo === 'res' },
        { id: 'sk', label: 'Desviación estándar', type: 'select', wide: true, options: [['u', 'Desconocida (uso s)'], ['k', 'σ conocida']] },
        { id: 's', label: 's', show: (v) => v.modo === 'res' && v.sk === 'u' }, { id: 'sigma', label: 'σ', show: (v) => v.sk === 'k' }, confField,
        { id: 'N', label: 'N (población finita, opcional)' }
      ],
      examples: [{ label: 'n=25, x̄=80, s=10, 95 %', values: { modo: 'res', xbar: 80, n: 25, sk: 'u', s: 10, conf: 95 } }, { label: 'n=100, σ=15, x̄=50, 99 %', values: { modo: 'res', xbar: 50, n: 100, sk: 'k', sigma: 15, conf: 99 } }],
      run(v) {
        Util.need(v, { xbar: 'x̄', n: 'n', s: 's', sigma: 'σ', N: 'N' }); const c = Util.conf(v.conf); if (!c) UI.fail('Falta el nivel de confianza.');
        let xbar = v.xbar, n = v.n, s = v.s; if (v.modo === 'dat') { const r = H(v.dat); xbar = r.m; n = r.n; s = r.s; } else if (blank(xbar) || blank(n)) UI.fail('Completa x̄ y n.');
        const sdv = v.sk === 'k' ? v.sigma : s; if (blank(sdv) || !(sdv > 0)) UI.fail('Falta la desviación estándar.'); if (n < 2) UI.fail('n debe ser al menos 2.');
        const useZ = v.sk === 'k' || n >= 30, fin = !blank(v.N), fpc = fin ? Math.sqrt((v.N - n) / (v.N - 1)) : 1, se = sdv / Math.sqrt(n) * fpc, crit = useZ ? zc(c) : tc(c, n - 1), sy = useZ ? 'Z' : 't';
        return build({ title: `IC para la media (${sy})`, sub: useZ ? 'Distribución normal' : `t de Student, ${n - 1} grados de libertad`, conf: c, kv: [['n', n], ['x̄', xbar], [v.sk === 'k' ? 'σ' : 's', sdv], ...(fin ? [['N', v.N]] : [])],
          formula: [`x̄ ± ${useZ ? 'Z(1−α/2)' : 't(1−α/2; n−1)'} · ${v.sk === 'k' ? 'σ' : 's'}/√n${fin ? ' · √((N−n)/(N−1))' : ''}`], critLines: [useZ ? `Z(${F(1 - (1 - c) / 2, 4)}) = ${F(crit, 4)}` : `t(${F(1 - (1 - c) / 2, 4)}; ${n - 1}) = ${F(crit, 4)}`],
          seLines: [`EE = ${F(sdv)} / √${F(n)}${fin ? ' · √((N−n)/(N−1))' : ''} = ${F(se, 5)}`], crit, critSym: sy, se, est: xbar, estSym: 'x̄', param: 'μ', lo: xbar - crit * se, hi: xbar + crit * se, interp: 'la media poblacional μ' });
      }
    });
  }
  const H = (txt) => Htest.stats(txt, 'Datos');

  function propTool(el) {
    UI.tool(el, {
      title: 'Intervalo de confianza para una proporción (P)', icon: 'eye', desc: 'p̂ ± Z·√(p̂q̂/n). Con población finita se aplica el factor (N−n)/(N−1).',
      fields: [{ id: 'x', label: 'Éxitos (x)' }, { id: 'n', label: 'n' }, { id: 'p', label: 'ó proporción p̂' }, { id: 'N', label: 'N (opcional)' }, confField],
      examples: [{ label: '370 de 500, 95 %', values: { x: 370, n: 500, p: '', conf: 95, N: '' } }, { label: '110 de 200, 99 %', values: { x: 110, n: 200, p: '', conf: 99, N: '' } }],
      run(v) {
        Util.need(v, { x: 'x', n: 'n', p: 'p̂', N: 'N' }); const c = Util.conf(v.conf); if (blank(v.n)) UI.fail('Falta n.'); let p = !blank(v.x) ? v.x / v.n : v.p; if (blank(p)) UI.fail('Escribe x o p̂.'); if (p > 1) p /= 100; if (!(p > 0 && p < 1)) UI.fail('p̂ debe estar entre 0 y 1.');
        const fin = !blank(v.N), fpc = fin ? (v.N - v.n) / (v.N - 1) : 1, se = Math.sqrt(p * (1 - p) / v.n * fpc), crit = zc(c);
        return build({ title: 'IC para la proporción (Z)', sub: fin ? 'Población finita' : 'Población infinita', conf: c, kv: [['n', v.n], ['p̂', p], ['q̂ = 1−p̂', 1 - p], ...(fin ? [['N', v.N]] : [])], formula: [fin ? 'p̂ ± Z · √( p̂q̂/n · (N−n)/(N−1) )' : 'p̂ ± Z(1−α/2) · √(p̂q̂ / n)'],
          critLines: [`Z(${F(1 - (1 - c) / 2, 4)}) = ${F(crit, 4)}`], seLines: [`EE = √(${F(p, 4)}·${F(1 - p, 4)} / ${F(v.n)}${fin ? ' · ' + F(fpc, 4) : ''}) = ${F(se, 5)}`], crit, critSym: 'Z', se, est: p, estSym: 'p̂', param: 'P', lo: p - crit * se, hi: p + crit * se, interp: 'la proporción poblacional P' });
      }
    });
  }

  function twoMeansTool(el) {
    UI.tool(el, {
      title: 'IC para la diferencia de medias (μ₁ − μ₂)', icon: 'eye', desc: 'Si el intervalo no contiene el 0, las medias difieren significativamente.',
      fields: [
        { id: 'caso', label: 'Caso', type: 'select', wide: true, options: [['z', 'Z — muestras grandes o σ conocidas'], ['tp', 't — varianzas iguales'], ['tw', 't — varianzas distintas (Welch)']] },
        { id: 'x1', label: 'x̄₁' }, { id: 's1', label: 's₁' }, { id: 'n1', label: 'n₁' }, { id: 'x2', label: 'x̄₂' }, { id: 's2', label: 's₂' }, { id: 'n2', label: 'n₂' }, confField
      ],
      examples: [{ label: 'n=40 y 50, 95 %', values: { caso: 'z', x1: 82, s1: 8, n1: 40, x2: 78, s2: 9, n2: 50, conf: 95 } }, { label: 'n=10 y 12 (t pooled)', values: { caso: 'tp', x1: 29.6, s1: 8.42, n1: 10, x2: 28.6, s2: 10.83, n2: 10, conf: 95 } }],
      run(v) {
        Util.required(v, { x1: 'x̄₁', s1: 's₁', n1: 'n₁', x2: 'x̄₂', s2: 's₂', n2: 'n₂' }); const c = Util.conf(v.conf), d = v.x1 - v.x2, v1 = v.s1 ** 2, v2 = v.s2 ** 2; let se, crit, sy, df, lines = [], fl;
        if (v.caso === 'z') { se = Math.sqrt(v1 / v.n1 + v2 / v.n2); crit = zc(c); sy = 'Z'; lines = [`EE = √(${F(v1, 4)}/${v.n1} + ${F(v2, 4)}/${v.n2}) = ${F(se, 5)}`]; fl = '(x̄₁ − x̄₂) ± Z(1−α/2) · √(s₁²/n₁ + s₂²/n₂)'; }
        else if (v.caso === 'tp') { df = v.n1 + v.n2 - 2; const sp2 = ((v.n1 - 1) * v1 + (v.n2 - 1) * v2) / df; se = Math.sqrt(sp2 * (1 / v.n1 + 1 / v.n2)); crit = tc(c, df); sy = 't'; lines = [`s²ₚ = ${F(sp2, 5)}`, `EE = √(s²ₚ·(1/n₁+1/n₂)) = ${F(se, 5)}`]; fl = '(x̄₁ − x̄₂) ± t(1−α/2; n₁+n₂−2) · √( s²ₚ (1/n₁ + 1/n₂) )'; }
        else { const a = v1 / v.n1, b = v2 / v.n2; df = Math.max(1, Math.round((a + b) ** 2 / (a * a / (v.n1 - 1) + b * b / (v.n2 - 1)))); se = Math.sqrt(a + b); crit = tc(c, df); sy = 't'; lines = [`r = ${df} (Welch, redondeado)`, `EE = √(s₁²/n₁ + s₂²/n₂) = ${F(se, 5)}`]; fl = '(x̄₁ − x̄₂) ± t(1−α/2; r) · √(s₁²/n₁ + s₂²/n₂)'; }
        return build({ title: `IC para μ₁ − μ₂ (${sy})`, conf: c, kv: [['x̄₁ / s₁ / n₁', `${v.x1} / ${v.s1} / ${v.n1}`], ['x̄₂ / s₂ / n₂', `${v.x2} / ${v.s2} / ${v.n2}`]], formula: [fl], critLines: [sy === 'Z' ? `Z = ${F(crit, 4)}` : `t(${F(1 - (1 - c) / 2, 4)}; ${df}) = ${F(crit, 4)}`], seLines: lines, crit, critSym: sy, se, est: d, estSym: 'x̄₁ − x̄₂', param: 'μ₁ − μ₂', lo: d - crit * se, hi: d + crit * se, interp: 'la diferencia μ₁ − μ₂', zero: true });
      }
    });
  }

  function twoPropTool(el) {
    UI.tool(el, {
      title: 'IC para la diferencia de proporciones (P₁ − P₂)', icon: 'eye', desc: 'EE = √( p̂₁q̂₁/n₁ + p̂₂q̂₂/n₂ ). Con poblaciones finitas se corrige cada término.',
      fields: [{ id: 'p1', label: 'p̂₁ (proporción) ó x₁' }, { id: 'n1', label: 'n₁' }, { id: 'p2', label: 'p̂₂ (proporción) ó x₂' }, { id: 'n2', label: 'n₂' }, { id: 'N1', label: 'N₁ (opcional)' }, { id: 'N2', label: 'N₂ (opcional)' }, confField],
      examples: [{ label: 'Reclusos tipo I y II, 99 %', values: { p1: 0.5, n1: 300, p2: 0.35, n2: 240, conf: 99, N1: '', N2: '' } }],
      run(v) {
        Util.required(v, { p1: 'p̂₁', n1: 'n₁', p2: 'p̂₂', n2: 'n₂' }); const c = Util.conf(v.conf), q = (x, n) => x > 1 ? x / n : x, p1 = q(v.p1, v.n1), p2 = q(v.p2, v.n2);
        const f1 = blank(v.N1) ? 1 : (v.N1 - v.n1) / (v.N1 - 1), f2 = blank(v.N2) ? 1 : (v.N2 - v.n2) / (v.N2 - 1), se = Math.sqrt(p1 * (1 - p1) / v.n1 * f1 + p2 * (1 - p2) / v.n2 * f2), crit = zc(c), d = p1 - p2;
        return build({ title: 'IC para P₁ − P₂ (Z)', conf: c, kv: [['p̂₁ / n₁', `${F(p1)} / ${v.n1}`], ['p̂₂ / n₂', `${F(p2)} / ${v.n2}`], ['p̂₁ − p̂₂', d]], formula: ['(p̂₁ − p̂₂) ± Z(1−α/2) · √( p̂₁q̂₁/n₁ + p̂₂q̂₂/n₂ )'], critLines: [`Z = ${F(crit, 4)}`], seLines: [`EE = √(${F(p1, 3)}·${F(1 - p1, 3)}/${v.n1} + ${F(p2, 3)}·${F(1 - p2, 3)}/${v.n2}) = ${F(se, 5)}`], crit, critSym: 'Z', se, est: d, estSym: 'p̂₁ − p̂₂', param: 'P₁ − P₂', lo: d - crit * se, hi: d + crit * se, interp: 'la diferencia P₁ − P₂', zero: true });
      }
    });
  }

  function varTool(el) {
    UI.tool(el, {
      title: 'IC para la varianza (σ²) y la desviación (σ)', icon: 'eye', desc: 'Población normal: [ (n−1)s²/χ²₍₁₋α/₂₎ ; (n−1)s²/χ²₍α/₂₎ ].',
      fields: [{ id: 'n', label: 'n' }, { id: 's', label: 's (desviación muestral)' }, confField],
      examples: [{ label: 'n=20, s=4.5, 95 %', values: { n: 20, s: 4.5, conf: 95 } }],
      run(v) {
        Util.required(v, { n: 'n', s: 's' }); const c = Util.conf(v.conf), a = 1 - c, df = v.n - 1, num = df * v.s * v.s, cl = Stat.chiInv(a / 2, df), ch = Stat.chiInv(1 - a / 2, df), lo = num / ch, hi = num / cl;
        const rep = Report.create({ title: 'IC para la varianza (χ²)', module: 'Intervalos de confianza', subtitle: `${df} grados de libertad` });
        rep.h('Datos'); rep.kv([['n', v.n], ['s', v.s], ['s²', v.s ** 2], ['Confianza', F(c * 100, 2) + ' %']]); rep.h('Fórmula'); rep.eq('(n−1)s² / χ²(1−α/2; n−1)  ≤  σ²  ≤  (n−1)s² / χ²(α/2; n−1)');
        rep.h('Procedimiento paso a paso'); rep.step(1, 'Valores χ² críticos', [`χ²(${F(a / 2, 4)}; ${df}) = ${F(cl, 4)}`, `χ²(${F(1 - a / 2, 4)}; ${df}) = ${F(ch, 4)}`]); rep.step(2, 'Numerador', [`(n−1)s² = ${df}·${F(v.s ** 2, 4)} = ${F(num, 4)}`]); rep.step(3, 'Intervalo para σ²', [`${F(num, 4)}/${F(ch, 4)} ≤ σ² ≤ ${F(num, 4)}/${F(cl, 4)}`, `${F(lo, 4)} ≤ σ² ≤ ${F(hi, 4)}`]); rep.step(4, 'Intervalo para σ', [`${F(Math.sqrt(lo), 4)} ≤ σ ≤ ${F(Math.sqrt(hi), 4)}`]);
        rep.result('IC para σ²', `[ ${F(lo, 3)} ; ${F(hi, 3)} ]`); rep.result('IC para σ', `[ ${F(Math.sqrt(lo), 3)} ; ${F(Math.sqrt(hi), 3)} ]`);
        rep.chart({ kind: 'dist', dist: 'chi', df, ra: [cl, ch], rr: [[0, cl], [ch, Infinity]], crit: [cl, ch], title: 'Distribución χ² y valores críticos', raLabel: 'Confianza ' + F(c, 3), xlabel: 'χ²' });
        rep.concl(`Con ${F(c * 100, 1)} % de confianza, σ² está entre ${F(lo, 4)} y ${F(hi, 4)}.`, 'ok'); return rep;
      }
    });
  }

  App.register({ id: 'intervalos', name: 'Intervalos de confianza', icon: 'eye', blurb: 'Media, proporción, diferencias y varianza, con el margen de error y su gráfica.', tools: [{ id: 'media', name: 'Media', render: meanTool }, { id: 'proporcion', name: 'Proporción', render: propTool }, { id: 'dosmedias', name: 'Dos medias', render: twoMeansTool }, { id: 'dosprop', name: 'Dos proporciones', render: twoPropTool }, { id: 'varianza', name: 'Varianza', render: varTool }] });
})();
