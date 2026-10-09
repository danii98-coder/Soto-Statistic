/* Módulo Tablas estadísticas: Z, t, χ², F, binomial y Poisson, en formato de hoja con búsqueda */
(function () {
  const F = Report.F, esc = Report.esc;
  const nearest = (arr, x) => arr.reduce((b, v, i) => Math.abs(v - x) < Math.abs(arr[b] - x) ? i : b, 0);
  const DFS = [...Array.from({ length: 30 }, (_, i) => i + 1), 40, 60, 120, Infinity];
  const f4 = (x) => x.toFixed(4), f3 = (x) => x.toFixed(3);

  /* definiciones: cada una devuelve { corner, cols:[{t,s}], rows:[{l,cells:[txt]}], info(r,c), title, caption } */
  const TABLES = {
    z: {
      name: 'Normal Z', badges: ['Z para μ', 'Z para P', 'Dos medias (n grandes)', 'Dos proporciones', 'Tamaño de muestra'],
      usage: 'Se usa en <b>pruebas Z</b> (σ conocida o n ≥ 30), en proporciones y para hallar Z(1−α/2) en el tamaño de muestra. <b>Cómo leerla:</b> la fila da el entero y el primer decimal de z; la columna, el segundo decimal. El cruce es el área acumulada Φ(z) = P(Z ≤ z).',
      controls: [{ id: 'tipo', label: 'Tipo de área', type: 'select', options: [['cum', 'Acumulada Φ(z) = P(Z ≤ z)'], ['mid', 'Área entre 0 y z']] }, { id: 'sig', label: 'Valores de z', type: 'select', options: [['pos', 'Positivos (0.00 a 3.99)'], ['neg', 'Negativos (−3.99 a 0.00)']] }],
      build(c) {
        const neg = c.sig === 'neg', rows = [], zs = Array.from({ length: 40 }, (_, i) => i / 10); const list = neg ? [...zs].reverse() : zs;
        list.forEach((z0) => rows.push({ l: (neg ? '−' : '') + z0.toFixed(1), cells: Array.from({ length: 10 }, (_, j) => { const z = (neg ? -1 : 1) * (z0 + j / 100); const p = Stat.normCdf(z); return f4(c.tipo === 'mid' ? Math.abs(p - 0.5) : p); }) }));
        return { corner: 'z', cols: Array.from({ length: 10 }, (_, j) => ({ t: '.0' + j })), rows, title: c.tipo === 'mid' ? 'Tabla normal estándar — área entre 0 y z' : 'Tabla normal estándar — área acumulada Φ(z)', info: (r, cc) => { const z = (neg ? -1 : 1) * (list[r] + cc / 100); return `${c.tipo === 'mid' ? 'P(0 ≤ Z ≤ ' : 'P(Z ≤ '}${F(z, 2)}) = ${rows[r].cells[cc]}`; } };
      },
      lookup: [{ id: 'z', label: 'Valor z', value: 1.96 }],
      find(l, c) { const z = l.z; if (z === null) return null; const neg = c.sig === 'neg'; if ((z < 0) !== neg && z !== 0) return { err: 'Cambia «Valores de z» a ' + (z < 0 ? 'negativos' : 'positivos') + ' para ver ese valor.' }; const a = Math.abs(z), r = Math.min(39, Math.floor(a * 10 + 1e-9)), cc = Math.min(9, Math.round(a * 100 - r * 10)); const row = neg ? 39 - r : r; return { r: row, c: cc, text: `Φ(${F(z, 4)}) = ${F(Stat.normCdf(z), 6)}` }; }
    },
    t: {
      name: 't de Student', badges: ['t para μ (n < 30)', 'Dos medias (t)', 'Pareadas', 'Pendiente de regresión'],
      usage: 'Se usa cuando n &lt; 30 y σ es desconocida. <b>Cómo leerla:</b> entra con los <b>grados de libertad</b> (fila) y el área de <b>una cola</b> α (columna; para prueba bilateral usa α/2). El valor es el t crítico tal que P(T &gt; t) = α. Grados de libertad: n−1 (una muestra), n₁+n₂−2 (dos muestras iguales), r de Welch.',
      controls: [],
      build() {
        const al = [0.25, 0.20, 0.15, 0.10, 0.05, 0.025, 0.01, 0.005, 0.0025, 0.001, 0.0005];
        return { corner: 'gl', cols: al.map((a) => ({ t: String(a), s: '2α=' + F(2 * a, 4) })), title: 'Tabla t de Student — valores críticos t(1−α; gl)', rows: DFS.map((d) => ({ l: d === Infinity ? '∞' : String(d), cells: al.map((a) => f3(d === Infinity ? Stat.normInv(1 - a) : Stat.tInv(1 - a, d))) })), info: (r, c) => `t(gl=${DFS[r] === Infinity ? '∞' : DFS[r]}; α=${al[c]}) = ${F(+(DFS[r] === Infinity ? Stat.normInv(1 - al[c]) : Stat.tInv(1 - al[c], DFS[r])).toFixed(3), 3)}  ·  bilateral α=${F(2 * al[c], 4)}`, _al: al };
      },
      lookup: [{ id: 'df', label: 'Grados de libertad', value: 9 }, { id: 'a', label: 'α (una cola)', value: 0.025 }],
      find(l, c, t) { if (l.df === null || l.a === null) return null; const r = nearest(DFS.map((d) => d === Infinity ? 1e9 : d), l.df), cc = nearest(t._al, l.a); return { r, c: cc, text: `t(gl=${l.df}; α=${l.a}) = ${F(Stat.tInv(1 - l.a, l.df), 4)}  (exacto)` }; }
    },
    chi: {
      name: 'Chi-cuadrado χ²', badges: ['Varianza', 'Bondad de ajuste', 'Independencia'],
      usage: 'Se usa para <b>varianzas</b> y pruebas <b>χ²</b> de ajuste e independencia. <b>Cómo leerla:</b> fila = grados de libertad; columna = área a la <b>derecha</b> α. El valor es χ² tal que P(χ² &gt; x) = α. Para una cola derecha, rechaza si χ² calculado supera el de la tabla (α = 0.05 → columna 0.05).',
      controls: [],
      build() {
        const al = [0.995, 0.99, 0.975, 0.95, 0.90, 0.75, 0.50, 0.25, 0.10, 0.05, 0.025, 0.01, 0.005], dfs = [...Array.from({ length: 30 }, (_, i) => i + 1), 40, 50, 60, 70, 80, 90, 100];
        return { corner: 'gl', cols: al.map((a) => ({ t: String(a) })), title: 'Tabla chi-cuadrado — valores χ² con P(χ² > x) = α', rows: dfs.map((d) => ({ l: String(d), cells: al.map((a) => (d < 40 ? f3 : (x) => x.toFixed(2))(Stat.chiInv(1 - a, d))) })), info: (r, c) => `χ²(gl=${dfs[r]}; α=${al[c]}) = ${F(Stat.chiInv(1 - al[c], dfs[r]), 3)}`, _al: al, _df: dfs };
      },
      lookup: [{ id: 'df', label: 'Grados de libertad', value: 10 }, { id: 'a', label: 'α (cola derecha)', value: 0.05 }],
      find(l, c, t) { if (l.df === null || l.a === null) return null; return { r: nearest(t._df, l.df), c: nearest(t._al, l.a), text: `χ²(gl=${l.df}; α=${l.a}) = ${F(Stat.chiInv(1 - l.a, l.df), 4)}  (exacto)` }; }
    },
    f: {
      name: 'F de Fisher', badges: ['Razón de varianzas', 'Igualdad de varianzas'],
      usage: 'Se usa para comparar <b>dos varianzas</b>. <b>Cómo leerla:</b> columna = gl del numerador (n₁−1); fila = gl del denominador (n₂−1); el valor es F tal que P(F &gt; x) = α. Para una prueba bilateral con α usa la tabla de α/2 y, para el límite inferior, F(α/2; a, b) = 1 / F(1−α/2; b, a).',
      controls: [{ id: 'a', label: 'Área a la derecha α', type: 'select', options: [['0.10', '0.10'], ['0.05', '0.05'], ['0.025', '0.025'], ['0.01', '0.01'], ['0.005', '0.005']], value: '0.05' }],
      build(c) {
        const a = Number(c.a), d1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 24, 30, 40, 60, 120], d2 = [...Array.from({ length: 30 }, (_, i) => i + 1), 40, 60, 120, Infinity];
        const fv = (x, y) => Stat.fInv(1 - a, x, y === Infinity ? 1e6 : y);
        return { corner: 'gl₂ \\ gl₁', cols: d1.map((d) => ({ t: String(d) })), title: `Tabla F — α = ${a} (P(F > x) = ${a})`, rows: d2.map((d) => ({ l: d === Infinity ? '∞' : String(d), cells: d1.map((x) => f3(fv(x, d))) })), info: (r, cc) => `F(${d1[cc]}, ${d2[r] === Infinity ? '∞' : d2[r]}; α=${a}) = ${f3(fv(d1[cc], d2[r]))}`, _d1: d1, _d2: d2, _a: a };
      },
      lookup: [{ id: 'g1', label: 'gl numerador', value: 8 }, { id: 'g2', label: 'gl denominador', value: 7 }],
      find(l, c, t) { if (l.g1 === null || l.g2 === null) return null; return { r: nearest(t._d2.map((d) => d === Infinity ? 1e9 : d), l.g2), c: nearest(t._d1, l.g1), text: `F(${l.g1}, ${l.g2}; α=${t._a}) = ${F(Stat.fInv(1 - t._a, l.g1, l.g2), 4)}  (exacto)` }; }
    },
    bin: {
      name: 'Binomial', badges: ['Distribución binomial', 'Proporciones (exacto)'],
      usage: 'Probabilidades binomiales para n pequeño. <b>Cómo leerla:</b> elige n; la fila es k (éxitos) y la columna p (probabilidad de éxito). Puedes ver P(X = k) o la acumulada P(X ≤ k).',
      controls: [{ id: 'n', label: 'n (ensayos)', type: 'select', options: Array.from({ length: 19 }, (_, i) => [String(i + 2), String(i + 2)]), value: '10' }, { id: 'tipo', label: 'Valor', type: 'select', options: [['pmf', 'P(X = k)'], ['cdf', 'P(X ≤ k) acumulada']] }],
      build(c) {
        const n = Number(c.n), ps = Array.from({ length: 19 }, (_, i) => (i + 1) * 0.05); const g = (k, p) => c.tipo === 'pmf' ? Stat.binomPmf(k, n, p) : Stat.sum(Array.from({ length: k + 1 }, (_, j) => Stat.binomPmf(j, n, p)));
        return { corner: 'k \\ p', cols: ps.map((p) => ({ t: p.toFixed(2) })), title: `Tabla binomial n = ${n} — ${c.tipo === 'pmf' ? 'P(X = k)' : 'P(X ≤ k)'}`, rows: Array.from({ length: n + 1 }, (_, k) => ({ l: String(k), cells: ps.map((p) => f4(Math.min(1, g(k, p)))) })), info: (r, cc) => `n=${n}, p=${ps[cc].toFixed(2)}, k=${r}: ${c.tipo === 'pmf' ? 'P(X=k)' : 'P(X≤k)'} = ${f4(Math.min(1, g(r, ps[cc])))}`, _ps: ps, _n: n };
      },
      lookup: [{ id: 'k', label: 'k', value: 3 }, { id: 'p', label: 'p', value: 0.5 }],
      find(l, c, t) { if (l.k === null || l.p === null) return null; return { r: Math.min(t._n, Math.max(0, Math.round(l.k))), c: nearest(t._ps, l.p), text: `P(X = ${l.k}) = ${F(Stat.binomPmf(l.k, t._n, l.p), 6)}` }; }
    },
    poi: {
      name: 'Poisson', badges: ['Distribución de Poisson'],
      usage: 'Probabilidades de Poisson. <b>Cómo leerla:</b> la fila es k (número de eventos) y la columna λ (media de eventos por intervalo).',
      controls: [{ id: 'tipo', label: 'Valor', type: 'select', options: [['pmf', 'P(X = k)'], ['cdf', 'P(X ≤ k) acumulada']] }],
      build(c) {
        const ls = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10], g = (k, l) => c.tipo === 'pmf' ? Stat.poisPmf(k, l) : Stat.sum(Array.from({ length: k + 1 }, (_, j) => Stat.poisPmf(j, l)));
        return { corner: 'k \\ λ', cols: ls.map((l) => ({ t: String(l) })), title: `Tabla de Poisson — ${c.tipo === 'pmf' ? 'P(X = k)' : 'P(X ≤ k)'}`, rows: Array.from({ length: 26 }, (_, k) => ({ l: String(k), cells: ls.map((l) => f4(Math.min(1, g(k, l)))) })), info: (r, cc) => `λ=${ls[cc]}, k=${r}: ${f4(Math.min(1, g(r, ls[cc])))}`, _ls: ls };
      },
      lookup: [{ id: 'k', label: 'k', value: 2 }, { id: 'l', label: 'λ', value: 3 }],
      find(l, c, t) { if (l.k === null || l.l === null) return null; return { r: Math.min(25, Math.max(0, Math.round(l.k))), c: nearest(t._ls, l.l), text: `P(X = ${l.k}) con λ=${l.l}: ${F(Stat.poisPmf(l.k, l.l), 6)}` }; }
    }
  };

  function renderTable(el, key) {
    const def = TABLES[key]; el.innerHTML = '';
    el.appendChild(UI.$(`<div class="tool-head"><h2>Tabla ${esc(def.name)}</h2><p>${def.badges.map((b) => `<span class="badge">${esc(b)}</span>`).join('')}</p></div>`));
    el.appendChild(UI.$(`<div class="usage">${def.usage}</div>`));
    const ctl = UI.form(def.controls.map((c) => ({ ...c, wide: false }))); const box = UI.$('<div></div>'), lookup = UI.$('<div class="lookup"></div>'), info = UI.$('<div class="usage" style="margin-top:10px;display:none"></div>'), wrap = UI.$('<div class="stable-wrap"></div>'), bar = UI.$('<div class="rbar" style="margin-top:12px"></div>');
    if (def.controls.length) { const card = UI.$('<div class="card" style="margin-bottom:12px;padding:14px"></div>'); card.appendChild(ctl.el); el.appendChild(card); }
    const lf = UI.form(def.lookup.map((f) => ({ ...f }))); lf.el.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap'; lf.el.querySelectorAll('.fld').forEach((f) => (f.style.width = '140px'));
    const go = UI.$('<button class="btn sm">Buscar en la tabla</button>'), outv = UI.$('<div class="out-v"></div>'); lookup.append(lf.el, go, outv);
    el.append(lookup, wrap, info, bar);
    let cur = null, tbl = null;
    function draw() {
      cur = ctl.vals(); tbl = def.build(cur);
      const t = document.createElement('table'); t.className = 'stable';
      t.innerHTML = `<thead><tr><th>${esc(tbl.corner)}</th>${tbl.cols.map((c) => `<th>${esc(c.t)}${c.s ? `<div style="font-weight:400;font-size:10px;opacity:.75">${esc(c.s)}</div>` : ''}</th>`).join('')}</tr></thead><tbody>${tbl.rows.map((r) => `<tr><td>${esc(r.l)}</td>${r.cells.map((v) => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody>`;
      t.addEventListener('click', (e) => { const td = e.target.closest('td'); if (!td || td.cellIndex === 0) return; mark(td.parentNode.rowIndex - 1, td.cellIndex - 1, false); info.style.display = ''; info.innerHTML = '<b>' + esc(tbl.info(td.parentNode.rowIndex - 1, td.cellIndex - 1)) + '</b>'; });
      wrap.innerHTML = ''; wrap.appendChild(t); outv.textContent = '';
    }
    function mark(r, c, scroll) {
      const t = wrap.querySelector('table'); t.querySelectorAll('.hit,.rowhit,.colhit').forEach((x) => x.classList.remove('hit', 'rowhit', 'colhit'));
      const rows = t.tBodies[0].rows; [...rows[r].cells].forEach((x, i) => { if (i) x.classList.add('rowhit'); }); [...rows].forEach((rw) => rw.cells[c + 1].classList.add('colhit')); const cell = rows[r].cells[c + 1]; cell.classList.remove('rowhit', 'colhit'); cell.classList.add('hit');
      if (scroll) cell.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
    }
    go.onclick = () => { const res = def.find(lf.vals(), cur, tbl); if (!res) return UI.toast('Completa los valores a buscar', 'bad'); if (res.err) { outv.textContent = ''; return UI.toast(res.err, 'bad'); } mark(res.r, res.c, true); outv.textContent = ''; info.style.display = ''; info.innerHTML = `<b>${esc(res.text)}</b> — celda resaltada en dorado`; };
    ctl.el.addEventListener('change', draw); draw();
    const mk = () => { const rep = Report.create({ title: tbl.title, module: 'Tablas estadísticas', subtitle: def.badges.join(' · ') }); rep.p(def.usage.replace(/<[^>]+>/g, '')); rep.table([tbl.corner, ...tbl.cols.map((c) => c.t)], tbl.rows.map((r) => [r.l, ...r.cells]), tbl.title); return rep; };
    bar.innerHTML = '<span class="rbar-t">Exportar esta tabla</span>'; [['xlsx', 'Excel', 'xl'], ['docx', 'Word', 'wd'], ['pdf', 'PDF', 'pd']].forEach(([k, n, cl]) => { const b = UI.$(`<button class="btn sm ${cl}">${n}</button>`); b.onclick = async () => { b.disabled = true; try { await Exporter[k]([mk()]); UI.toast('Documento listo ✦', 'ok'); } catch (e) { UI.toast('Error: ' + e.message, 'bad'); } b.disabled = false; }; bar.appendChild(b); });
    const nb = UI.$('<button class="btn sm ghost">Al cuaderno</button>'); nb.onclick = () => { Report.store.add(mk()); UI.toast('Añadida al cuaderno ✦', 'ok'); }; bar.appendChild(nb);
  }

  function guide(el) {
    el.innerHTML = '';
    el.appendChild(UI.$(`<div class="tool-head"><h2>¿Qué tabla uso?</h2><p>Cada prueba tiene su tabla. Aquí está el mapa para no equivocarte.</p></div>`));
    el.appendChild(UI.$(`<div class="card"><div class="tscroll"><table class="grid"><thead><tr><th>Quiero…</th><th>Condición</th><th>Estadístico</th><th>Tabla</th><th>Entro con</th></tr></thead><tbody>
      <tr><td>Probar o estimar una media</td><td>σ conocida, o n ≥ 30</td><td>Z</td><td><a href="#tablas/z">Z</a></td><td>Z(1−α) ó Z(1−α/2)</td></tr>
      <tr><td>Probar o estimar una media</td><td>n &lt; 30 y σ desconocida</td><td>t</td><td><a href="#tablas/t">t</a></td><td>gl = n−1 y α</td></tr>
      <tr><td>Comparar dos medias</td><td>muestras grandes</td><td>Z</td><td><a href="#tablas/z">Z</a></td><td>α</td></tr>
      <tr><td>Comparar dos medias</td><td>pequeñas, σ² iguales / distintas</td><td>t</td><td><a href="#tablas/t">t</a></td><td>gl = n₁+n₂−2 ó r (Welch)</td></tr>
      <tr><td>Muestras pareadas</td><td>mismos individuos</td><td>t</td><td><a href="#tablas/t">t</a></td><td>gl = n−1</td></tr>
      <tr><td>Una proporción / dos proporciones</td><td>n grande</td><td>Z</td><td><a href="#tablas/z">Z</a></td><td>α</td></tr>
      <tr><td>Una varianza, ajuste, independencia</td><td>cola derecha</td><td>χ²</td><td><a href="#tablas/chi">χ²</a></td><td>gl y α</td></tr>
      <tr><td>Razón de dos varianzas</td><td>poblaciones normales</td><td>F</td><td><a href="#tablas/f">F</a></td><td>gl₁, gl₂ y α</td></tr>
      <tr><td>Probabilidad de k éxitos</td><td>n ensayos fijos</td><td>Binomial</td><td><a href="#tablas/bin">Binomial</a></td><td>n, k, p</td></tr>
      <tr><td>Conteo de eventos raros</td><td>por intervalo</td><td>Poisson</td><td><a href="#tablas/poi">Poisson</a></td><td>k, λ</td></tr></tbody></table></div></div>`));
    el.querySelectorAll('a').forEach((a) => { a.style.color = 'var(--violet2)'; a.style.fontWeight = '600'; });
  }

  App.register({ id: 'tablas', name: 'Tablas estadísticas', icon: 'table', blurb: 'Z, t, χ², F, binomial y Poisson en formato de hoja, con búsqueda y exportación.', tools: [{ id: 'guia', name: '¿Cuál uso?', render: guide }, ...Object.keys(TABLES).map((k) => ({ id: k, name: TABLES[k].name, render: (e) => renderTable(e, k) }))] });
})();
