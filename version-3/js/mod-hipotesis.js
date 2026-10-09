/* Módulo Pruebas de hipótesis: media, proporción, dos medias, pareadas, dos proporciones, varianzas y chi-cuadrado */
(function () {
  const F = Report.F, H = Htest, T = H.tx, P = H.tp, R = H.r4, { blank } = Util;
  const AF = () => H.alphaFields(), TL = () => ({ ...H.tailField });
  const sub = (a, b) => (b === 0 ? T(a) : `${T(a)}-${P(b)}`); // a − b sin "−0"
  const TIP = (t) => `<b>¿Qué fórmula uso?</b><br>${t}`;

  /* ===== 1. MEDIA ===== */
  function meanTool(el) {
    UI.tool(el, {
      title: 'Prueba de hipótesis para la media (μ)', icon: 'scale',
      desc: 'Escribe los datos del problema y elige el tipo de prueba. Verás cada paso resuelto, con el álgebra.',
      note: TIP('• n ≥ 30 (o σ conocida) → <b>Z</b><br>• n &lt; 30 y σ desconocida → <b>t de Student</b> con gl = n − 1'),
      fields: [
        { id: 'modo', label: 'Datos', type: 'select', wide: true, options: [['res', 'Tengo x̄, n y s'], ['dat', 'Tengo la lista de datos']] },
        { id: 'dat', label: 'Datos de la muestra', type: 'textarea', wide: true, rows: 4, show: (v) => v.modo === 'dat', placeholder: '12 15 11 14 …' },
        { id: 'xbar', label: 'Media muestral (x̄)', show: (v) => v.modo === 'res' }, { id: 'n', label: 'Tamaño de muestra (n)', show: (v) => v.modo === 'res' },
        { id: 'sk', label: 'Desviación estándar', type: 'select', wide: true, options: [['u', 'No conozco σ: uso s'], ['k', 'Conozco σ (poblacional)']] },
        { id: 's', label: 'Desviación muestral (s)', show: (v) => v.modo === 'res' && v.sk === 'u' }, { id: 'sigma', label: 'σ poblacional', show: (v) => v.sk === 'k' },
        { id: 'mu0', label: 'Lo que se afirma (μ₀)' }, TL(), ...AF()
      ],
      examples: [
        { label: 'Ejemplo: n=19, x̄=83.25, s=11, μ₀=90', values: { modo: 'res', sk: 'u', xbar: 83.25, n: 19, s: 11, mu0: 90, tail: 'two', alpha: '', conf: 90 } },
        { label: 'Ejemplo: n=100, x̄=80.23, s=45.67, μ₀=75', values: { modo: 'res', sk: 'u', xbar: 80.23, n: 100, s: 45.67, mu0: 75, tail: 'right', alpha: 0.02, conf: '' } }
      ],
      run(v) {
        Util.need(v, { xbar: 'x̄', n: 'n', s: 's', sigma: 'σ', mu0: 'μ₀', alpha: 'α', conf: 'confianza' }); const A = H.alphaFrom(v); if (blank(v.mu0)) UI.fail('Falta el valor que se afirma (μ₀).');
        let xbar = v.xbar, n = v.n, s = v.s; if (v.modo === 'dat') { const r = H.stats(v.dat, 'Datos'); xbar = r.m; n = r.n; s = r.s; } else { if (blank(xbar) || blank(n)) UI.fail('Completa x̄ y n.'); if (v.sk === 'u' && blank(s)) UI.fail('Falta la desviación muestral s.'); }
        if (v.sk === 'k' && blank(v.sigma)) UI.fail('Falta σ.'); if (n < 2) UI.fail('n debe ser al menos 2.');
        const sdv = v.sk === 'k' ? v.sigma : s; if (!(sdv > 0)) UI.fail('La desviación estándar debe ser mayor que 0.');
        const d = (v.sk === 'k' || n >= 30) ? 'z' : 't', sy = d === 'z' ? 'Z' : 't', sg = v.sk === 'k' ? '\\sigma' : 's';
        const num = xbar - v.mu0, rn = R(Math.sqrt(n)), den = R(sdv / Math.sqrt(n)), val = num / den, hp = H.hyp('μ', F(v.mu0), v.tail);
        return H.build({
          title: `Prueba de hipótesis para la media (${sy})`, subtitle: d === 'z' ? 'n ≥ 30 o σ conocida: se usa Z' : 'n < 30 y σ desconocida: se usa t de Student', alpha: A.alpha, conf: A.conf, tail: v.tail, dist: d, df: d === 't' ? n - 1 : undefined, value: val, ...hp,
          dataKV: [['n', n], ['Media muestral x̄', xbar], [v.sk === 'k' ? 'σ' : 's', sdv], ['Se afirma μ₀', v.mu0]],
          dfTex: d === 't' ? `gl=n-1=${T(n)}-1=${T(n - 1)}` : null,
          formulaTex: `${sy}=\\frac{\\bar{x}-\\mu_0}{${sg}/\\sqrt{n}}`,
          calcTex: [`${sy}=\\frac{${T(xbar)}-${P(v.mu0)}}{\\dfrac{${T(sdv)}}{\\sqrt{${T(n)}}}}`, `${sy}=\\frac{${T(num)}}{\\dfrac{${T(sdv)}}{${T(rn)}}}`, `${sy}=\\frac{${T(num)}}{${T(den)}}`, `${sy}=${T(val)}`]
        });
      }
    });
  }

  /* ===== 2. PROPORCIÓN ===== */
  function propTool(el) {
    UI.tool(el, {
      title: 'Prueba de hipótesis para la proporción (P)', icon: 'scale',
      desc: 'Para n ≥ 30. Escribe los éxitos y el tamaño de muestra, o la proporción ya calculada.',
      note: TIP('• Muestra grande → <b>Z</b> con Z = (p̂ − P₀)/√(P₀Q₀/n)<br>• Si la población es finita y sin reemplazo, escribe N y se agrega el factor (N−n)/(N−1)'),
      fields: [
        { id: 'x', label: 'Casos a favor (x)', hint: 'O deja vacío y escribe p̂' }, { id: 'n', label: 'Tamaño de muestra (n)' },
        { id: 'p', label: 'Proporción muestral (p̂)', hint: 'Solo si no tienes x' }, { id: 'P0', label: 'Lo que se afirma (P₀)' },
        { id: 'N', label: 'N (población finita)', hint: 'Opcional' }, TL(), ...AF()
      ],
      examples: [
        { label: 'Ejemplo: 100 de 200, P₀=0.60 (cola izq.)', values: { x: 100, n: 200, p: '', P0: 0.6, tail: 'left', alpha: 0.05, conf: '', N: '' } },
        { label: 'Ejemplo: 80 de 400, P₀=0.25 (cola izq.)', values: { x: 80, n: 400, p: '', P0: 0.25, tail: 'left', alpha: 0.05, conf: '', N: '' } }
      ],
      run(v) {
        Util.need(v, { x: 'x', n: 'n', p: 'p̂', P0: 'P₀', N: 'N', alpha: 'α', conf: 'confianza' }); const A = H.alphaFrom(v); if (blank(v.n) || blank(v.P0)) UI.fail('Completa n y P₀.');
        let p = v.p; if (!blank(v.x)) p = v.x / v.n; if (blank(p)) UI.fail('Escribe x (casos a favor) o p̂.'); if (p > 1) p /= 100; const P0 = v.P0 > 1 ? v.P0 / 100 : v.P0;
        if (!(P0 > 0 && P0 < 1)) UI.fail('P₀ debe estar entre 0 y 1.'); const n = v.n, Q0 = 1 - P0, fin = !blank(v.N), fpc = fin ? (v.N - n) / (v.N - 1) : 1;
        const num = p - P0, inner = P0 * Q0 / n, inner2 = inner * fpc, den = R(Math.sqrt(inner2)), val = num / den, hp = H.hyp('P', F(P0), v.tail);
        return H.build({
          title: 'Prueba de hipótesis para la proporción (Z)', subtitle: fin ? 'Población finita (con factor de corrección)' : 'Muestra grande: se usa Z', alpha: A.alpha, conf: A.conf, tail: v.tail, dist: 'z', value: val, ...hp,
          dataKV: [['n', n], ...(!blank(v.x) ? [['Casos a favor x', v.x]] : []), ['Proporción muestral p̂', p], ['Se afirma P₀', P0], ...(fin ? [['N', v.N]] : [])],
          formulaTex: fin ? 'Z=\\frac{\\hat{p}-P_0}{\\sqrt{\\frac{P_0(1-P_0)}{n}\\cdot\\frac{N-n}{N-1}}}' : 'Z=\\frac{\\hat{p}-P_0}{\\sqrt{\\frac{P_0(1-P_0)}{n}}}',
          calcTex: [
            ...(!blank(v.x) ? [`\\hat{p}=\\frac{x}{n}=\\frac{${T(v.x)}}{${T(n)}}=${T(p)}`] : []),
            fin ? `Z=\\frac{${T(p)}-${P(P0)}}{\\sqrt{\\frac{${T(P0)}(1-${T(P0)})}{${T(n)}}\\cdot\\frac{${T(v.N)}-${T(n)}}{${T(v.N)}-1}}}` : `Z=\\frac{${T(p)}-${P(P0)}}{\\sqrt{\\frac{${T(P0)}(1-${T(P0)})}{${T(n)}}}}`,
            fin ? `Z=\\frac{${T(num)}}{\\sqrt{\\frac{${T(r(P0 * Q0))}}{${T(n)}}\\cdot${T(r(fpc))}}}` : `Z=\\frac{${T(num)}}{\\sqrt{\\frac{${T(P0 * Q0)}}{${T(n)}}}}`,
            `Z=\\frac{${T(num)}}{\\sqrt{${T(inner2, 6)}}}`, `Z=\\frac{${T(num)}}{${T(den)}}`, `Z=${T(val)}`
          ]
        });
      }
    });
    function r(x) { return +x.toFixed(5); }
  }

  /* ===== 3. DOS MEDIAS ===== */
  function twoMeansTool(el) {
    UI.tool(el, {
      title: 'Diferencia de dos medias', icon: 'scale',
      desc: 'Elige el caso según tus datos y escribe los resultados de las dos muestras.',
      note: TIP('• <b>Caso I:</b> muestras grandes (n ≥ 30) o σ conocidas → Z<br>• <b>Caso II-i:</b> pequeñas con varianzas iguales (σ₁² = σ₂²) → t, gl = n₁+n₂−2<br>• <b>Caso II-ii:</b> pequeñas con varianzas distintas → t con gl = r (fórmula de Welch)'),
      fields: [
        { id: 'caso', label: 'Caso', type: 'select', wide: true, options: [['tp', 'Caso II-i: varianzas iguales (t)'], ['tw', 'Caso II-ii: varianzas distintas (t, gl = r)'], ['z', 'Caso I: muestras grandes (Z)']] },
        { id: 'modo', label: 'Datos', type: 'select', wide: true, options: [['res', 'Tengo x̄, s y n de cada muestra'], ['dat', 'Tengo las listas de datos']] },
        { id: 'dat1', label: 'Datos muestra 1', type: 'textarea', rows: 3, wide: true, show: (v) => v.modo === 'dat' }, { id: 'dat2', label: 'Datos muestra 2', type: 'textarea', rows: 3, wide: true, show: (v) => v.modo === 'dat' },
        { id: 'x1', label: 'x̄₁', show: (v) => v.modo === 'res' }, { id: 's1', label: 's₁', show: (v) => v.modo === 'res' }, { id: 'n1', label: 'n₁', show: (v) => v.modo === 'res' },
        { id: 'x2', label: 'x̄₂', show: (v) => v.modo === 'res' }, { id: 's2', label: 's₂', show: (v) => v.modo === 'res' }, { id: 'n2', label: 'n₂', show: (v) => v.modo === 'res' },
        TL(), ...AF()
      ],
      examples: [
        { label: 'Ejemplo: dos aulas (varianzas iguales)', values: { caso: 'tp', modo: 'dat', dat1: '16 43 24 35 20 27 29 30 40 32', dat2: '15 40 18 37 16 29 30 45 20 36', tail: 'two', alpha: 0.05, conf: '' } },
        { label: 'Ejemplo: dos secciones (varianzas distintas)', values: { caso: 'tw', modo: 'dat', dat1: '2 18 10 20 7 5 12 16 11', dat2: '12 16 9 16 12 13 11 10', tail: 'right', alpha: 0.05, conf: '' } }
      ],
      run(v) {
        Util.need(v, { x1: 'x̄₁', s1: 's₁', n1: 'n₁', x2: 'x̄₂', s2: 's₂', n2: 'n₂', alpha: 'α', conf: 'confianza' }); const A = H.alphaFrom(v);
        let g1, g2; if (v.modo === 'dat') { const a = H.stats(v.dat1, 'Muestra 1'), b = H.stats(v.dat2, 'Muestra 2'); g1 = { x: a.m, s: a.s, n: a.n }; g2 = { x: b.m, s: b.s, n: b.n }; }
        else { if ([v.x1, v.s1, v.n1, v.x2, v.s2, v.n2].some(blank)) UI.fail('Completa x̄, s y n de ambas muestras.'); g1 = { x: v.x1, s: v.s1, n: v.n1 }; g2 = { x: v.x2, s: v.s2, n: v.n2 }; }
        if (g1.n < 2 || g2.n < 2) UI.fail('Cada muestra necesita al menos 2 datos.'); if (!(g1.s > 0) || !(g2.s > 0)) UI.fail('Las desviaciones deben ser mayores que 0.');
        const diff = g1.x - g2.x, v1 = g1.s ** 2, v2 = g2.s ** 2, hp = H.hyp('μ₁', 'μ₂', v.tail), n1 = g1.n, n2 = g2.n;
        const kv = [['n₁', n1], ['x̄₁', g1.x], ['s₁', g1.s], ['n₂', n2], ['x̄₂', g2.x], ['s₂', g2.s]];
        let o;
        if (v.caso === 'z') {
          const a = v1 / n1, b = v2 / n2, den = R(Math.sqrt(a + b));
          o = { dist: 'z', value: diff / den, sub: 'Caso I: muestras grandes, se usa Z', formulaTex: 'Z=\\frac{\\bar{x}_1-\\bar{x}_2}{\\sqrt{\\frac{s_1^2}{n_1}+\\frac{s_2^2}{n_2}}}',
            calc: [`Z=\\frac{${T(g1.x)}-${P(g2.x)}}{\\sqrt{\\frac{${T(v1)}}{${n1}}+\\frac{${T(v2)}}{${n2}}}}`, `Z=\\frac{${T(diff)}}{\\sqrt{${T(a)}+${T(b)}}}`, `Z=\\frac{${T(diff)}}{\\sqrt{${T(a + b)}}}`, `Z=\\frac{${T(diff)}}{${T(den)}}`, `Z=${T(diff / den)}`] };
        } else if (v.caso === 'tp') {
          const df = n1 + n2 - 2, sp2 = ((n1 - 1) * v1 + (n2 - 1) * v2) / df, inner = sp2 * (1 / n1 + 1 / n2), den = R(Math.sqrt(inner));
          o = { dist: 't', df, value: diff / den, sub: 'Caso II-i: varianzas iguales, t combinada', dfTex: `gl=n_1+n_2-2=${n1}+${n2}-2=${df}`, formulaTex: 't=\\frac{\\bar{x}_1-\\bar{x}_2}{\\sqrt{\\frac{(n_1-1)s_1^2+(n_2-1)s_2^2}{n_1+n_2-2}\\left(\\frac{1}{n_1}+\\frac{1}{n_2}\\right)}}',
            calc: [`s_p^2=\\frac{(${n1}-1)(${T(v1)})+(${n2}-1)(${T(v2)})}{${n1}+${n2}-2}=\\frac{${T((n1 - 1) * v1 + (n2 - 1) * v2)}}{${df}}=${T(sp2)}`, `t=\\frac{${T(g1.x)}-${P(g2.x)}}{\\sqrt{${T(sp2)}\\left(\\frac{1}{${n1}}+\\frac{1}{${n2}}\\right)}}`, `t=\\frac{${T(diff)}}{\\sqrt{${T(sp2)}\\cdot${T(1 / n1 + 1 / n2)}}}`, `t=\\frac{${T(diff)}}{\\sqrt{${T(inner)}}}`, `t=\\frac{${T(diff)}}{${T(den)}}`, `t=${T(diff / den)}`] };
        } else {
          const a = v1 / n1, b = v2 / n2, r = (a + b) ** 2 / (a * a / (n1 - 1) + b * b / (n2 - 1)), rr = Math.max(1, Math.round(r)), den = R(Math.sqrt(a + b));
          o = { dist: 't', df: rr, value: diff / den, sub: 'Caso II-ii: varianzas distintas, t con gl = r', dfTex: `r=\\frac{\\left(\\frac{s_1^2}{n_1}+\\frac{s_2^2}{n_2}\\right)^2}{\\frac{(s_1^2/n_1)^2}{n_1-1}+\\frac{(s_2^2/n_2)^2}{n_2-1}}=\\frac{(${T(a)}+${T(b)})^2}{\\frac{${T(a)}^2}{${n1 - 1}}+\\frac{${T(b)}^2}{${n2 - 1}}}=${T(r, 3)}\\approx${rr}`,
            formulaTex: 't=\\frac{\\bar{x}_1-\\bar{x}_2}{\\sqrt{\\frac{s_1^2}{n_1}+\\frac{s_2^2}{n_2}}}',
            calc: [`t=\\frac{${T(g1.x)}-${P(g2.x)}}{\\sqrt{\\frac{${T(v1)}}{${n1}}+\\frac{${T(v2)}}{${n2}}}}`, `t=\\frac{${T(diff)}}{\\sqrt{${T(a)}+${T(b)}}}`, `t=\\frac{${T(diff)}}{\\sqrt{${T(a + b)}}}`, `t=\\frac{${T(diff)}}{${T(den)}}`, `t=${T(diff / den)}`] };
        }
        return H.build({ title: 'Diferencia de dos medias (' + (o.dist === 'z' ? 'Z' : 't') + ')', subtitle: o.sub, alpha: A.alpha, conf: A.conf, tail: v.tail, dist: o.dist, df: o.df, value: o.value, ...hp, dataKV: kv, dfTex: o.dfTex, formulaTex: o.formulaTex, calcTex: o.calc });
      }
    });
  }

  /* ===== 4. PAREADAS ===== */
  function pairedTool(el) {
    UI.tool(el, {
      title: 'Observaciones pareadas (antes y después)', icon: 'scale',
      desc: 'Se trabaja con las diferencias Dᵢ = Xᵢ − Yᵢ de cada individuo. Escribe las dos listas en el mismo orden.',
      note: TIP('Muestras pareadas (los mismos individuos) → <b>t</b> con gl = n − 1 sobre las diferencias.'),
      fields: [{ id: 'x', label: 'Muestra X', type: 'textarea', rows: 3, wide: true }, { id: 'y', label: 'Muestra Y', type: 'textarea', rows: 3, wide: true }, TL(), ...AF()],
      examples: [{ label: 'Ejemplo: 12 pares de alumnos', values: { x: '14 15 12 13 15 11 10 15 15 16 14 8', y: '12 16 12 11 12 9 7 13 14 15 12 10', tail: 'two', alpha: 0.05, conf: '' } }],
      run(v) {
        const x = Stat.parseNums(v.x), y = Stat.parseNums(v.y); if (x.length < 2) UI.fail('Escribe los datos de X.'); if (x.length !== y.length) UI.fail(`X tiene ${x.length} datos y Y tiene ${y.length}: deben tener la misma cantidad.`);
        Util.need(v, { alpha: 'α', conf: 'confianza' }); const A = H.alphaFrom(v), D = x.map((a, i) => a - y[i]), n = D.length, dbar = Stat.mean(D), sD = Stat.sd(D), sd2 = Stat.sum(D.map((d) => d * d)), den = R(sD / Math.sqrt(n)), val = dbar / den, hp = H.hyp('μ_D', '0', v.tail);
        return H.build({
          title: 'Prueba t para muestras pareadas', subtitle: 'Se trabaja con las diferencias D = X − Y', alpha: A.alpha, conf: A.conf, tail: v.tail, dist: 't', df: n - 1, value: val, ...hp, dataKV: [['Pares (n)', n]],
          pre: (rep) => { rep.h('Diferencias'); rep.table(['i', 'X', 'Y', 'D = X − Y', 'D²'], [...D.map((d, i) => [i + 1, x[i], y[i], d, d * d]), ['Σ', Stat.sum(x), Stat.sum(y), Stat.sum(D), sd2]], null, { highlightRow: [n] }); },
          dfTex: `gl=n-1=${n}-1=${n - 1}`, formulaTex: 't=\\frac{\\bar{D}}{s_D/\\sqrt{n}}',
          calcTex: [`\\bar{D}=\\frac{\\sum D}{n}=\\frac{${T(Stat.sum(D))}}{${n}}=${T(dbar)}`, `s_D=\\sqrt{\\frac{\\sum D^2-n\\bar{D}^2}{n-1}}=\\sqrt{\\frac{${T(sd2)}-${n}(${T(dbar)})^2}{${n - 1}}}=${T(sD)}`, `t=\\frac{${T(dbar)}}{\\dfrac{${T(sD)}}{\\sqrt{${n}}}}`, `t=\\frac{${T(dbar)}}{\\dfrac{${T(sD)}}{${T(R(Math.sqrt(n)))}}}`, `t=\\frac{${T(dbar)}}{${T(den)}}`, `t=${T(val)}`]
        });
      }
    });
  }

  /* ===== 5. DOS PROPORCIONES ===== */
  function twoPropTool(el) {
    UI.tool(el, {
      title: 'Diferencia de dos proporciones', icon: 'scale',
      desc: 'Muestras grandes. Escribe los casos a favor y el tamaño de cada grupo.',
      note: TIP('Dos proporciones, muestras grandes → <b>Z</b> con la proporción combinada p̂ = (x₁+x₂)/(n₁+n₂).'),
      fields: [{ id: 'x1', label: 'Casos a favor grupo 1 (x₁)' }, { id: 'n1', label: 'Tamaño grupo 1 (n₁)' }, { id: 'x2', label: 'Casos a favor grupo 2 (x₂)' }, { id: 'n2', label: 'Tamaño grupo 2 (n₂)' }, TL(), ...AF()],
      examples: [{ label: 'Ejemplo: 50 de 500 y 28 de 400', values: { x1: 50, n1: 500, x2: 28, n2: 400, tail: 'two', alpha: 0.05, conf: '' } }, { label: 'Ejemplo: 98 de 150 y 80 de 200', values: { x1: 98, n1: 150, x2: 80, n2: 200, tail: 'two', alpha: 0.05, conf: '' } }],
      run(v) {
        Util.required(v, { x1: 'x₁', n1: 'n₁', x2: 'x₂', n2: 'n₂' }); Util.need(v, { alpha: 'α', conf: 'confianza' }); const A = H.alphaFrom(v); if (v.x1 > v.n1 || v.x2 > v.n2) UI.fail('Los casos a favor no pueden superar el tamaño del grupo.');
        const p1 = v.x1 / v.n1, p2 = v.x2 / v.n2, p = (v.x1 + v.x2) / (v.n1 + v.n2), q = 1 - p, s = 1 / v.n1 + 1 / v.n2, inner = p * q * s, den = R(Math.sqrt(inner)), num = p1 - p2, hp = H.hyp('P₁', 'P₂', v.tail);
        if (!(den > 0)) UI.fail('No se puede calcular (p̂ = 0 ó 1).'); const val = num / den;
        return H.build({
          title: 'Diferencia de dos proporciones (Z)', subtitle: 'Muestras grandes: se usa Z', alpha: A.alpha, conf: A.conf, tail: v.tail, dist: 'z', value: val, ...hp,
          dataKV: [['x₁ / n₁', `${v.x1} / ${v.n1}`], ['x₂ / n₂', `${v.x2} / ${v.n2}`], ['p̂₁', p1], ['p̂₂', p2]],
          formulaTex: 'Z=\\frac{\\hat{p}_1-\\hat{p}_2}{\\sqrt{\\hat{p}(1-\\hat{p})\\left(\\frac{1}{n_1}+\\frac{1}{n_2}\\right)}}\\quad\\text{con}\\quad\\hat{p}=\\frac{x_1+x_2}{n_1+n_2}',
          calcTex: [`\\hat{p}=\\frac{${v.x1}+${v.x2}}{${v.n1}+${v.n2}}=\\frac{${v.x1 + v.x2}}{${v.n1 + v.n2}}=${T(p, 5)}`, `Z=\\frac{${T(p1)}-${T(p2)}}{\\sqrt{${T(p, 4)}(1-${T(p, 4)})\\left(\\frac{1}{${v.n1}}+\\frac{1}{${v.n2}}\\right)}}`, `Z=\\frac{${T(num)}}{\\sqrt{${T(p, 4)}\\cdot${T(q, 4)}\\cdot${T(s, 5)}}}`, `Z=\\frac{${T(num)}}{\\sqrt{${T(inner, 6)}}}`, `Z=\\frac{${T(num)}}{${T(den)}}`, `Z=${T(val)}`]
        });
      }
    });
  }

  /* ===== 6. VARIANZAS ===== */
  function varTool(el) {
    UI.tool(el, {
      title: 'Pruebas sobre varianzas (χ² y F)', icon: 'bell',
      desc: 'Una varianza con χ², o la razón de dos varianzas con F.',
      note: TIP('• Una varianza → <b>χ²</b> = (n−1)s²/σ₀², gl = n − 1<br>• Dos varianzas → <b>F</b> = s₁²/s₂², gl = n₁−1 y n₂−1'),
      fields: [
        { id: 'tipo', label: 'Prueba', type: 'select', wide: true, options: [['chi', 'Una varianza (χ²)'], ['f', 'Dos varianzas (F)']] },
        { id: 'n', label: 'n', show: (v) => v.tipo === 'chi' }, { id: 's', label: 's (desviación muestral)', show: (v) => v.tipo === 'chi' }, { id: 'v0', label: 'Varianza que se afirma σ₀²', show: (v) => v.tipo === 'chi' },
        { id: 'n1', label: 'n₁', show: (v) => v.tipo === 'f' }, { id: 's1', label: 's₁', show: (v) => v.tipo === 'f' }, { id: 'n2', label: 'n₂', show: (v) => v.tipo === 'f' }, { id: 's2', label: 's₂', show: (v) => v.tipo === 'f' },
        TL(), ...AF()
      ],
      examples: [{ label: 'Ejemplo: n=20, s=12, σ₀²=100', values: { tipo: 'chi', n: 20, s: 12, v0: 100, tail: 'right', alpha: 0.05, conf: '' } }, { label: 'Ejemplo: dos varianzas', values: { tipo: 'f', n1: 9, s1: 6.06, n2: 8, s2: 2.56, tail: 'two', alpha: 0.05, conf: '' } }],
      run(v) {
        Util.need(v, { alpha: 'α', conf: 'confianza' }); const A = H.alphaFrom(v);
        if (v.tipo === 'chi') {
          Util.required(v, { n: 'n', s: 's', v0: 'σ₀²' }); const val = (v.n - 1) * v.s * v.s / v.v0, hp = H.hyp('σ²', F(v.v0), v.tail), s2 = v.s * v.s;
          return H.build({ title: 'Prueba para una varianza (χ²)', subtitle: 'Población normal', alpha: A.alpha, conf: A.conf, tail: v.tail, dist: 'chi', df: v.n - 1, value: val, ...hp, dataKV: [['n', v.n], ['s', v.s], ['Se afirma σ₀²', v.v0]], dfTex: `gl=n-1=${v.n}-1=${v.n - 1}`, formulaTex: '\\chi^2=\\frac{(n-1)s^2}{\\sigma_0^2}', calcTex: [`\\chi^2=\\frac{(${v.n}-1)(${T(s2)})}{${T(v.v0)}}`, `\\chi^2=\\frac{${T((v.n - 1) * s2)}}{${T(v.v0)}}`, `\\chi^2=${T(val)}`] });
        }
        Util.required(v, { n1: 'n₁', s1: 's₁', n2: 'n₂', s2: 's₂' }); const a = v.s1 ** 2, b = v.s2 ** 2, val = a / b, hp = H.hyp('σ₁²', 'σ₂²', v.tail);
        return H.build({ title: 'Razón de varianzas (F)', subtitle: 'Poblaciones normales independientes', alpha: A.alpha, conf: A.conf, tail: v.tail, dist: 'f', df: v.n1 - 1, df2: v.n2 - 1, value: val, ...hp, dataKV: [['n₁', v.n1], ['s₁²', a], ['n₂', v.n2], ['s₂²', b]], dfTex: `gl_1=n_1-1=${v.n1 - 1},\\quad gl_2=n_2-1=${v.n2 - 1}`, formulaTex: 'F=\\frac{s_1^2}{s_2^2}', calcTex: [`F=\\frac{${T(a)}}{${T(b)}}`, `F=${T(val)}`] });
      }
    });
  }

  /* ===== 7. CHI-CUADRADO ===== */
  function chiTool(el) {
    UI.tool(el, {
      title: 'Chi-cuadrado: ajuste e independencia', icon: 'table',
      desc: 'Compara lo observado con lo esperado: χ² = Σ (O − E)² / E. Se rechaza en la cola derecha.',
      fields: [
        { id: 'tipo', label: 'Prueba', type: 'select', wide: true, options: [['gof', 'Bondad de ajuste'], ['ind', 'Independencia (tabla de contingencia)']] },
        { id: 'obs', label: 'Frecuencias observadas', type: 'textarea', rows: 3, wide: true, show: (v) => v.tipo === 'gof', placeholder: '18 22 20 25 15' },
        { id: 'esp', label: 'Probabilidades esperadas (opcional)', type: 'text', wide: true, show: (v) => v.tipo === 'gof', placeholder: 'vacío = todas iguales', hint: 'Deben sumar 1' },
        { id: 'mat', label: 'Tabla (una fila por línea)', type: 'textarea', rows: 4, wide: true, show: (v) => v.tipo === 'ind', placeholder: '30 20 10\n25 35 15' }, ...AF()
      ],
      examples: [{ label: 'Ejemplo: dado (n=120)', values: { tipo: 'gof', obs: '15 25 22 18 20 20', esp: '', alpha: 0.05, conf: '' } }, { label: 'Ejemplo: tabla 2×3', values: { tipo: 'ind', mat: '30 20 10\n25 35 15', alpha: 0.05, conf: '' } }],
      run(v) {
        Util.need(v, { alpha: 'α', conf: 'confianza' }); const A = H.alphaFrom(v);
        if (v.tipo === 'gof') {
          const O = Stat.parseNums(v.obs); if (O.length < 2) UI.fail('Escribe al menos 2 frecuencias observadas.'); const n = Stat.sum(O); let p = Stat.parseNums(v.esp); if (!p.length) p = O.map(() => 1 / O.length);
          if (p.length !== O.length) UI.fail('Las probabilidades esperadas deben ser tantas como las observadas.'); if (Math.abs(Stat.sum(p) - 1) > 1e-6) UI.fail('Las probabilidades esperadas deben sumar 1.');
          const E = p.map((q) => q * n), terms = O.map((o, i) => (o - E[i]) ** 2 / E[i]), chi = Stat.sum(terms), df = O.length - 1;
          return H.build({ title: 'Chi-cuadrado de bondad de ajuste', subtitle: `${O.length} categorías, n = ${n}`, alpha: A.alpha, conf: A.conf, tail: 'right', dist: 'chi', df, value: chi, h0: 'H₀: los datos siguen la distribución esperada', h1: 'H₁: los datos NO siguen la distribución esperada', w: 'los datos no se ajustan a lo esperado', dataKV: [['n', n], ['Categorías k', O.length]],
            pre: (rep) => { rep.h('Observadas y esperadas'); rep.table(['Categoría', 'O', 'E', '(O−E)²/E'], [...O.map((o, i) => [i + 1, o, F(E[i], 3), F(terms[i], 4)]), ['Σ', n, F(n, 3), F(chi, 4)]], null, { highlightRow: [O.length] }); },
            dfTex: `gl=k-1=${O.length}-1=${df}`, formulaTex: '\\chi^2=\\sum\\frac{(O-E)^2}{E}', calcTex: [`\\chi^2=${O.slice(0, 4).map((o, i) => `\\frac{(${o}-${T(E[i], 2)})^2}{${T(E[i], 2)}}`).join('+')}${O.length > 4 ? '+\\cdots' : ''}`, `\\chi^2=${T(chi)}`] });
        }
        const rows = v.mat.split(/\n/).map((l) => Stat.parseNums(l)).filter((r) => r.length); if (rows.length < 2 || rows[0].length < 2) UI.fail('La tabla necesita al menos 2 filas y 2 columnas.'); if (rows.some((r) => r.length !== rows[0].length)) UI.fail('Todas las filas deben tener las mismas columnas.');
        const Rr = rows.map(Stat.sum), Cc = rows[0].map((_, j) => Stat.sum(rows.map((r) => r[j]))), n = Stat.sum(Rr), E = rows.map((r, i) => r.map((_, j) => Rr[i] * Cc[j] / n)); let chi = 0; rows.forEach((r, i) => r.forEach((o, j) => { chi += (o - E[i][j]) ** 2 / E[i][j]; })); const df = (rows.length - 1) * (rows[0].length - 1);
        return H.build({ title: 'Chi-cuadrado de independencia', subtitle: `Tabla ${rows.length} × ${rows[0].length}, n = ${n}`, alpha: A.alpha, conf: A.conf, tail: 'right', dist: 'chi', df, value: chi, h0: 'H₀: las variables son independientes', h1: 'H₁: las variables están asociadas', w: 'las variables están asociadas', dataKV: [['n', n]],
          pre: (rep) => { rep.h('Frecuencias observadas'); rep.table(['', ...rows[0].map((_, j) => 'Col ' + (j + 1)), 'Total'], [...rows.map((r, i) => ['Fila ' + (i + 1), ...r, Rr[i]]), ['Total', ...Cc, n]]); rep.h('Frecuencias esperadas: total fila · total columna / n'); rep.table(['', ...rows[0].map((_, j) => 'Col ' + (j + 1))], E.map((r, i) => ['Fila ' + (i + 1), ...r.map((x) => F(x, 3))])); },
          dfTex: `gl=(f-1)(c-1)=(${rows.length}-1)(${rows[0].length}-1)=${df}`, formulaTex: '\\chi^2=\\sum\\frac{(O-E)^2}{E}', calcTex: [`\\chi^2=\\sum\\frac{(O-E)^2}{E}=${T(chi)}`] });
      }
    });
  }

  App.register({
    id: 'hipotesis', name: 'Pruebas de hipótesis', icon: 'scale', blurb: 'Resolución paso a paso: hipótesis, α, estadística, criterio con gráfico, cálculos y decisión.',
    tools: [{ id: 'media', name: 'Media', render: meanTool }, { id: 'proporcion', name: 'Proporción', render: propTool }, { id: 'dosmedias', name: 'Dos medias', render: twoMeansTool }, { id: 'pareadas', name: 'Pareadas', render: pairedTool }, { id: 'dosprop', name: 'Dos proporciones', render: twoPropTool }, { id: 'varianzas', name: 'Varianzas', render: varTool }, { id: 'chi', name: 'Chi-cuadrado', render: chiTool }]
  });
})();
