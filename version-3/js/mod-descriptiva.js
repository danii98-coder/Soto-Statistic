/* Módulo Descriptiva y Regresión lineal simple */
(function () {
  const F = Report.F;

  function descTool(el) {
    UI.tool(el, {
      title: 'Estadística descriptiva y tabla de frecuencias', icon: 'chart',
      desc: 'Pega tus datos y obtén medidas de tendencia central y dispersión, tabla de frecuencias por la regla de Sturges e histograma.',
      fields: [
        { id: 'dat', label: 'Datos', type: 'textarea', rows: 6, wide: true, placeholder: '12 15 11 14 18 …' },
        { id: 'k', label: 'N.º de clases (opcional)', hint: 'Vacío = regla de Sturges' }, { id: 'dec', label: 'Decimales', value: 3 }
      ],
      examples: [{ label: 'Notas del aula A', values: { dat: '16 43 24 35 20 27 29 30 40 32' } }, { label: '30 datos de ejemplo', values: { dat: '12 15 11 14 18 20 22 19 17 16 15 14 21 23 25 18 17 16 19 20 22 24 13 12 15 17 18 19 21 26' } }],
      run(v) {
        const x = Stat.parseNums(v.dat); if (x.length < 2) UI.fail('Escribe al menos 2 datos.'); const d = Math.max(0, Math.min(8, v.dec ?? 3)), n = x.length, s = [...x].sort((a, b) => a - b);
        const mean = Stat.mean(x), sd = Stat.sd(x), var_ = Stat.variance(x), mo = Stat.mode(x), mn = s[0], mx = s[n - 1], R = mx - mn;
        const m3 = Stat.sum(x.map((a) => (a - mean) ** 3)) / n, g1 = sd > 0 ? m3 / Stat.sd(x, true) ** 3 : 0;
        const rep = Report.create({ title: 'Estadística descriptiva', module: 'Descriptiva', subtitle: `${n} datos` });
        rep.h('Medidas resumen');
        rep.table(['Medida', 'Valor', 'Cómo se obtiene'], [
          ['n', n, 'Cantidad de datos'], ['Suma', Stat.sum(x), 'Σxᵢ'], ['Media x̄', F(mean, d), 'Σxᵢ / n'], ['Mediana', F(Stat.median(x), d), 'Valor central ordenado'], ['Moda', mo.length ? mo.join(', ') : 'No hay', 'Valor más frecuente'],
          ['Mínimo / Máximo', `${F(mn)} / ${F(mx)}`, ''], ['Rango R', F(R, d), 'máx − mín'], ['Varianza muestral s²', F(var_, d), 'Σ(xᵢ−x̄)² / (n−1)'], ['Desviación estándar s', F(sd, d), '√s²'], ['Varianza poblacional σ²', F(Stat.variance(x, true), d), 'Σ(xᵢ−x̄)² / n'],
          ['Error estándar de la media', F(sd / Math.sqrt(n), d), 's / √n'], ['Coef. de variación', F(sd / mean * 100, 2) + ' %', 's / x̄ · 100'], ['Q1 / Q3', `${F(Stat.quantile(x, .25), d)} / ${F(Stat.quantile(x, .75), d)}`, 'Cuartiles'], ['Rango intercuartílico', F(Stat.quantile(x, .75) - Stat.quantile(x, .25), d), 'Q3 − Q1'], ['Asimetría', F(g1, 3), g1 > 0.3 ? 'Sesgo a la derecha' : g1 < -0.3 ? 'Sesgo a la izquierda' : 'Aprox. simétrica']]);
        const k = v.k ? Math.round(v.k) : Math.max(2, Math.round(1 + 3.322 * Math.log10(n))), A = R / k || 1, w = Math.ceil(A * 100) / 100 === A ? A : Math.ceil(A * 100) / 100;
        rep.h('Tabla de frecuencias'); rep.eq(`Regla de Sturges: k = 1 + 3.322·log₁₀(n) = ${F(1 + 3.322 * Math.log10(n), 2)} ≅ ${k}\nAmplitud: A = R / k = ${F(R)} / ${k} = ${F(A, 4)} ≅ ${F(w, 2)}`);
        const bins = Array.from({ length: k }, (_, i) => ({ lo: mn + i * w, hi: mn + (i + 1) * w, count: 0 }));
        x.forEach((a) => { let i = Math.min(k - 1, Math.floor((a - mn) / w)); bins[i].count++; });
        let cum = 0; rep.table(['Clase', 'Marca xᵢ', 'fᵢ', 'Fᵢ', 'hᵢ %', 'Hᵢ %'], bins.map((b, i) => { cum += b.count; return [`[${F(b.lo, 2)} ; ${F(b.hi, 2)})`, F((b.lo + b.hi) / 2, 2), b.count, cum, F(b.count / n * 100, 2), F(cum / n * 100, 2)]; }));
        rep.chart({ kind: 'hist', title: 'Histograma de frecuencias', bins, normal: { mean, sd }, total: n }, 'La curva dorada es la normal con la misma media y desviación');
        rep.h('Datos ordenados'); rep.p(s.join('  '));
        rep.concl(`Los ${n} datos tienen media ${F(mean, d)} y desviación estándar ${F(sd, d)}; van de ${F(mn)} a ${F(mx)}.`, 'ok'); return rep;
      }
    });
  }

  function regTool(el) {
    UI.tool(el, {
      title: 'Regresión lineal simple y correlación', icon: 'chart',
      desc: 'Ajusta Y = a + bX por mínimos cuadrados, calcula r, r² y contrasta la pendiente con una prueba t (H₀: β = 0). Puedes predecir Y para un X.',
      fields: [
        { id: 'x', label: 'Variable independiente X', type: 'textarea', rows: 3, wide: true }, { id: 'y', label: 'Variable dependiente Y', type: 'textarea', rows: 3, wide: true },
        { id: 'x0', label: 'Predecir Y para X =', hint: 'Opcional' }, { id: 'alpha', label: 'Nivel de significancia α', value: 0.05 }
      ],
      examples: [{ label: 'Horas de estudio y nota', values: { x: '1 2 3 4 5 6 7 8', y: '55 60 62 70 72 78 85 88', x0: 5.5, alpha: 0.05 } }],
      run(v) {
        const x = Stat.parseNums(v.x), y = Stat.parseNums(v.y); if (x.length < 3) UI.fail('Se necesitan al menos 3 pares de datos.'); if (x.length !== y.length) UI.fail(`X tiene ${x.length} datos y Y tiene ${y.length}.`);
        const n = x.length, mx = Stat.mean(x), my = Stat.mean(y), Sxx = Stat.sum(x.map((a) => (a - mx) ** 2)), Syy = Stat.sum(y.map((a) => (a - my) ** 2)), Sxy = Stat.sum(x.map((a, i) => (a - mx) * (y[i] - my)));
        if (Sxx === 0) UI.fail('X no varía: no se puede ajustar una recta.'); const b = Sxy / Sxx, a = my - b * mx, r = Sxy / Math.sqrt(Sxx * Syy), sse = Syy - b * Sxy, se = Math.sqrt(sse / (n - 2)), seb = se / Math.sqrt(Sxx), t = b / seb, alpha = (v.alpha >= 1 ? v.alpha / 100 : v.alpha) || 0.05;
        return Htest.build({
          title: 'Regresión lineal simple y correlación', module: 'Regresión', subtitle: `Y = ${F(a, 4)} ${b < 0 ? '−' : '+'} ${F(Math.abs(b), 4)}·X`, alpha, tail: 'two', dist: 't', df: n - 2, value: t, ...Htest.hyp('β (pendiente)', '0', 'two'), w: 'existe relación lineal significativa entre X e Y (β ≠ 0)',
          dataKV: [['n (pares)', n], ['x̄', mx], ['ȳ', my]],
          pre: (rep) => {
            rep.h('Recta de regresión'); rep.eq('b = Sxy / Sxx        a = ȳ − b·x̄        Y = a + b·X'); rep.step(1, 'Sumas de cuadrados', [`Sxx = Σ(x−x̄)² = ${F(Sxx, 4)}`, `Syy = Σ(y−ȳ)² = ${F(Syy, 4)}`, `Sxy = Σ(x−x̄)(y−ȳ) = ${F(Sxy, 4)}`]); rep.step(2, 'Coeficientes', [`b = ${F(Sxy, 4)} / ${F(Sxx, 4)} = ${F(b, 5)}`, `a = ${F(my, 4)} − ${F(b, 4)}·${F(mx, 4)} = ${F(a, 5)}`]); rep.step(3, 'Correlación', [`r = Sxy / √(Sxx·Syy) = ${F(r, 5)}`, `r² = ${F(r * r, 5)}  (el ${F(r * r * 100, 2)} % de la variación de Y se explica por X)`]);
            rep.table(['Medida', 'Valor'], [['Intensidad de la relación', Math.abs(r) > .9 ? 'Muy fuerte' : Math.abs(r) > .7 ? 'Fuerte' : Math.abs(r) > .4 ? 'Moderada' : 'Débil'], ['Sentido', r > 0 ? 'Positiva (directa)' : 'Negativa (inversa)'], ['Error estándar de estimación', F(se, 4)], ['Error estándar de b', F(seb, 5)]]);
            if (!blank(v.x0)) { rep.result(`Predicción de Y para X = ${F(v.x0)}`, a + b * v.x0); }
            rep.chart({ kind: 'scatter', title: 'Diagrama de dispersión y recta ajustada', xs: x, ys: y, a, b, eq: `Y = ${F(a, 3)} ${b < 0 ? '−' : '+'} ${F(Math.abs(b), 3)}X   (r = ${F(r, 3)})`, xlabel: 'X', ylabel: 'Y' });
          },
          dfTex: `gl=n-2=${n}-2=${n - 2}`, formulaTex: 't=\\frac{b}{EE(b)}\\quad EE(b)=\\frac{s_e}{\\sqrt{S_{xx}}}', calcTex: [`EE(b)=\\frac{${F(se, 4)}}{\\sqrt{${F(Sxx, 4)}}}=${F(seb, 5)}`, `t=\\frac{${F(b, 5)}}{${F(seb, 5)}}`, `t=${F(t, 4)}`]
        });
      }
    });
  }
  const blank = (x) => x === null || x === undefined;
  App.register({ id: 'descriptiva', name: 'Descriptiva y regresión', icon: 'chart', blurb: 'Media, varianza, frecuencias, histograma, regresión lineal y correlación.', tools: [{ id: 'descriptiva', name: 'Descriptiva', render: descTool }, { id: 'regresion', name: 'Regresión lineal', render: regTool }] });
})();
