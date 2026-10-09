/* Módulo Conteo: factorial, permutaciones, combinaciones, variaciones y permutaciones con repetición */
(function () {
  const F = Report.F;
  const prodText = (n, r) => Array.from({ length: r }, (_, i) => n - i).join(' · ');
  const short = (arr, max = 8) => arr.length <= max ? arr.join(' · ') : arr.slice(0, 4).join(' · ') + ' · … · ' + arr.slice(-2).join(' · ');
  const down = (n, r) => Array.from({ length: r }, (_, i) => n - i);

  function tool(el) {
    UI.tool(el, {
      title: 'Permutaciones, combinaciones y conteo', icon: 'dice',
      desc: 'Muestra el desarrollo completo: n! / (n − r)!, la simplificación y el resultado, incluso con números enormes.',
      fields: [
        { id: 'tipo', label: 'Tipo de conteo', type: 'select', wide: true, options: [['perm', 'Permutación P(n, r) — importa el orden, sin repetir'], ['comb', 'Combinación C(n, r) — no importa el orden'], ['fact', 'Factorial n!'], ['permrep', 'Variaciones con repetición nʳ'], ['combrep', 'Combinaciones con repetición'], ['circ', 'Permutación circular (n − 1)!'], ['multi', 'Permutaciones con elementos repetidos']] },
        { id: 'n', label: 'n (total de elementos)' },
        { id: 'r', label: 'r (elementos que se toman)', show: (v) => ['perm', 'comb', 'permrep', 'combrep'].includes(v.tipo) },
        { id: 'grp', label: 'Elementos repetidos: cuántas veces aparece cada uno', type: 'text', wide: true, show: (v) => v.tipo === 'multi', placeholder: 'ej. 3 2 2   (n! / (3!·2!·2!))', hint: 'Los que no se repiten no hace falta escribirlos' }
      ],
      examples: [
        { label: 'P(10, 3)', values: { tipo: 'perm', n: 10, r: 3 } }, { label: 'C(10, 3)', values: { tipo: 'comb', n: 10, r: 3 } }, { label: '8! (factorial)', values: { tipo: 'fact', n: 8 } },
        { label: 'Palabra ESTADISTICA', values: { tipo: 'multi', n: 11, grp: '2 2 2 2' } }, { label: 'C(50, 6) lotería', values: { tipo: 'comb', n: 50, r: 6 } }
      ],
      run(v) {
        const n = v.n; if (n === null || !Number.isInteger(n) || n < 0 || n > 400) UI.fail('n debe ser un entero entre 0 y 400.');
        const rep = Report.create({ title: ({ perm: 'Permutación P(n, r)', comb: 'Combinación C(n, r)', fact: 'Factorial', permrep: 'Variaciones con repetición', combrep: 'Combinaciones con repetición', circ: 'Permutación circular', multi: 'Permutaciones con repetición' })[v.tipo], module: 'Conteo' });
        const needR = () => { if (v.r === null || !Number.isInteger(v.r) || v.r < 0) UI.fail('r debe ser un entero no negativo.'); return v.r; };
        let res;
        if (v.tipo === 'fact') {
          res = Stat.fact(n); rep.h('Fórmula'); rep.eq('n! = n · (n−1) · (n−2) · … · 2 · 1    (0! = 1)');
          rep.h('Desarrollo'); rep.step(1, 'Multiplicar', [`${n}! = ${n === 0 ? '1' : short(down(n, n))}`]); rep.step(2, 'Resultado', [`${n}! = ${F(res)}`]);
          rep.chart({ kind: 'bars', title: 'Crecimiento del factorial', labels: Array.from({ length: Math.min(n, 12) + 1 }, (_, i) => i + '!'), values: Array.from({ length: Math.min(n, 12) + 1 }, (_, i) => Number(Stat.fact(i))), xlabel: 'n', ylabel: 'n!', fmtVal: (x) => x >= 1e6 ? x.toExponential(1) : String(x) });
        } else if (v.tipo === 'perm') {
          const r = needR(); if (r > n) UI.fail('r no puede ser mayor que n.'); res = Stat.perm(n, r);
          rep.h('Fórmula'); rep.eq('P(n, r) = n! / (n − r)!');
          rep.h('Desarrollo'); rep.step(1, 'Sustituir', [`P(${n}, ${r}) = ${n}! / (${n} − ${r})! = ${n}! / ${n - r}!`]); rep.step(2, 'Simplificar (se cancela ' + (n - r) + '!)', [`${n}! / ${n - r}! = ${r === 0 ? '1' : prodText(n, r)}`]); rep.step(3, 'Resultado', [`P(${n}, ${r}) = ${F(res)}`]);
          rep.p(`Interpretación: hay ${F(res)} maneras de ordenar ${r} elementos elegidos entre ${n}, donde el orden SÍ importa.`);
        } else if (v.tipo === 'comb') {
          const r = needR(); if (r > n) UI.fail('r no puede ser mayor que n.'); res = Stat.comb(n, r); const rr = Math.min(r, n - r);
          rep.h('Fórmula'); rep.eq('C(n, r) = n! / ( r! · (n − r)! )');
          rep.h('Desarrollo'); rep.step(1, 'Sustituir', [`C(${n}, ${r}) = ${n}! / ( ${r}! · ${n - r}! )`]); rep.step(2, 'Simplificar', [`= ( ${rr === 0 ? '1' : prodText(n, rr)} ) / ( ${rr === 0 ? '1' : down(rr, rr).join(' · ')} )`]); rep.step(3, 'Resultado', [`C(${n}, ${r}) = ${F(res)}`]);
          rep.p(`Interpretación: hay ${F(res)} grupos distintos de ${r} elementos entre ${n}; aquí el orden NO importa.`);
          const nn = Math.min(n, 30); rep.chart({ kind: 'bars', title: `Coeficientes C(${nn}, k)`, labels: Array.from({ length: nn + 1 }, (_, k) => k), values: Array.from({ length: nn + 1 }, (_, k) => Number(Stat.comb(nn, k))), highlight: r <= nn ? [r] : [], xlabel: 'k', ylabel: 'C(n, k)', fmtVal: (x) => x >= 1e5 ? x.toExponential(1) : String(x) });
          if (n <= 20) { rep.h('Tabla de permutaciones y combinaciones'); rep.table(['r', `P(${n}, r)`, `C(${n}, r)`], Array.from({ length: n + 1 }, (_, k) => [k, Stat.perm(n, k), Stat.comb(n, k)]), null, { highlightRow: [r] }); }
        } else if (v.tipo === 'permrep') {
          const r = needR(); res = BigInt(n) ** BigInt(r); rep.h('Fórmula'); rep.eq('VR(n, r) = nʳ'); rep.h('Desarrollo'); rep.step(1, 'Sustituir', [`${n}^${r} = ${r === 0 ? '1' : Array(Math.min(r, 8)).fill(n).join(' · ') + (r > 8 ? ' · …' : '')}`]); rep.step(2, 'Resultado', [`${n}^${r} = ${F(res)}`]); rep.p('Cada una de las r posiciones se puede llenar con cualquiera de los n elementos (se permite repetir).');
        } else if (v.tipo === 'combrep') {
          const r = needR(); if (n + r - 1 < 0) UI.fail('Datos inválidos.'); res = Stat.comb(n + r - 1, r); rep.h('Fórmula'); rep.eq('CR(n, r) = C(n + r − 1, r) = (n + r − 1)! / ( r! · (n − 1)! )'); rep.h('Desarrollo'); rep.step(1, 'Sustituir', [`CR(${n}, ${r}) = C(${n} + ${r} − 1, ${r}) = C(${n + r - 1}, ${r})`]); rep.step(2, 'Resultado', [`= ${F(res)}`]);
        } else if (v.tipo === 'circ') {
          if (n < 1) UI.fail('n debe ser al menos 1.'); res = Stat.fact(n - 1); rep.h('Fórmula'); rep.eq('PC(n) = (n − 1)!'); rep.h('Desarrollo'); rep.step(1, 'Sustituir', [`PC(${n}) = (${n} − 1)! = ${n - 1}!`]); rep.step(2, 'Resultado', [`= ${F(res)}`]); rep.p('Al sentar elementos en círculo se fija uno de ellos; los demás se ordenan en (n−1)! formas.');
        } else {
          const g = Stat.parseNums(v.grp).map(Math.round); if (!g.length) UI.fail('Escribe cuántas veces se repite cada elemento (ej. 3 2 2).'); if (Stat.sum(g) > n || g.some((x) => x < 1)) UI.fail('La suma de los grupos repetidos no puede superar n.');
          const den = g.reduce((a, x) => a * Stat.fact(x), 1n); res = Stat.fact(n) / den; rep.h('Fórmula'); rep.eq('n! / ( n₁! · n₂! · … · n_k! )'); rep.h('Desarrollo'); rep.step(1, 'Sustituir', [`${n}! / ( ${g.map((x) => x + '!').join(' · ')} )`]); rep.step(2, 'Calcular', [`${F(Stat.fact(n))} / ${F(den)}`]); rep.step(3, 'Resultado', [`= ${F(res)}`]);
        }
        rep.result('Resultado', res); return rep;
      }
    });
  }
  App.register({ id: 'conteo', name: 'Conteo', icon: 'key', blurb: 'Factorial, permutaciones, combinaciones y variaciones con el desarrollo completo.', tools: [{ id: 'conteo', name: 'Permutaciones y combinaciones', render: tool }] });
})();
