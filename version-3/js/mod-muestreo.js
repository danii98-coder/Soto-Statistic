/* Módulo Muestreo: tamaño de muestra con despeje automático, afijación, selección de muestras, laboratorio de datos y guía */
(function () {
  const F = Report.F, { blank, isNum } = Util;

  /* ===================== 1. TAMAÑO DE MUESTRA ===================== */
  function sizeTool(el) {
    UI.tool(el, {
      title: 'Tamaño de la muestra', icon: 'eye',
      desc: 'Rellena lo que conoces y <b>deja vacío un solo dato</b>: el programa lo despeja (n, error, confianza, σ o N) y muestra cómo lo hizo.',
      fields: [
        { id: 'param', label: 'Parámetro a estimar', type: 'select', options: [['media', 'Media poblacional (μ)'], ['prop', 'Proporción poblacional (P)']], wide: true },
        { id: 'pop', label: 'Tamaño de la población', type: 'select', options: [['inf', 'Infinita o desconocida'], ['fin', 'Finita (N conocido)']], wide: true },
        { id: 'conf', label: 'Nivel de confianza (1−α)', unit: '%', value: 95, blank: true, hint: 'Escribe 95 o 0.95' },
        { id: 'e', label: 'Error máximo (e)', blank: true, hint: 'Margen de error tolerado' },
        { id: 'sigma', label: 'Desviación estándar (σ)', blank: true, show: (v) => v.param === 'media' },
        { id: 'vari', label: '…o varianza (σ²)', blank: true, show: (v) => v.param === 'media', hint: 'Solo si no tienes σ' },
        { id: 'P', label: 'Proporción (P)', placeholder: 'vacío = 0.5', show: (v) => v.param === 'prop', hint: 'Si se desconoce se usa 0.5 (caso más desfavorable)' },
        { id: 'x0', label: 'Éxitos en muestra piloto', show: (v) => v.param === 'prop', placeholder: 'opcional' },
        { id: 'n0', label: 'Tamaño de la piloto', show: (v) => v.param === 'prop', placeholder: 'opcional', hint: 'Estima P = éxitos / tamaño' },
        { id: 'N', label: 'Tamaño de la población (N)', blank: true, show: (v) => v.pop === 'fin' },
        { id: 'n', label: 'Tamaño de la muestra (n)', blank: true },
        { id: 'zr', label: 'Valor Z', type: 'select', options: [['t', 'De tabla (3 decimales: 1.960, 2.576)'], ['x', 'Exacto']], wide: true }
      ],
      examples: [
        { label: 'Media con σ=45', values: { param: 'media', pop: 'inf', conf: 95, e: 10, sigma: 45, n: '' } },
        { label: 'Proporción con error 3 %', values: { param: 'prop', pop: 'inf', conf: 95, e: 0.033, P: 0.5, n: '' } },
        { label: 'Población finita (N=10000)', values: { param: 'media', pop: 'fin', conf: 95, e: 15, sigma: 25, N: 10000, n: '' } },
        { label: 'Proporción sin dato previo', values: { param: 'prop', pop: 'inf', conf: 95, e: 0.05, n: '' } },
        { label: 'Población finita (N=5000, 99 %)', values: { param: 'media', pop: 'fin', conf: 99, e: 0.03, sigma: 0.6, N: 5000, n: '' } },
        { label: 'Sueldos (σ=2000, e=500)', values: { param: 'media', pop: 'inf', conf: 95, e: 500, sigma: 2000, n: '' } },
        { label: 'Proporción con muestra piloto', values: { param: 'prop', pop: 'inf', conf: 95, e: 0.05, x0: 110, n0: 200, n: '' } }
      ],
      run: sizeRun
    });
  }

  function sizeRun(v) {
    const mean = v.param === 'media', fin = v.pop === 'fin', rnd = v.zr === 't';
    Util.need(v, { conf: 'Confianza', e: 'Error', sigma: 'σ', vari: 'σ²', P: 'P', x0: 'Éxitos piloto', n0: 'Tamaño piloto', N: 'N', n: 'n' });
    let c = Util.conf(v.conf), e = v.e, n = v.n, N = fin ? v.N : null, sigma = v.sigma, notes = [];
    if (mean && blank(sigma) && !blank(v.vari)) { if (v.vari < 0) UI.fail('La varianza no puede ser negativa.'); sigma = Math.sqrt(v.vari); notes.push(`σ = √σ² = √${F(v.vari)} = ${F(sigma)}`); }
    let P = null;
    if (!mean) {
      if (!blank(v.P)) P = v.P > 1 ? v.P / 100 : v.P;
      else if (!blank(v.x0) && !blank(v.n0)) { P = v.x0 / v.n0; notes.push(`P estimada con la muestra piloto: p = ${F(v.x0)}/${F(v.n0)} = ${F(P)}`); }
      else { P = 0.5; notes.push('P desconocida → se toma P = 0.5 (caso más desfavorable: da el mayor tamaño de muestra).'); }
      if (!(P > 0 && P < 1)) UI.fail('La proporción P debe estar entre 0 y 1.');
      if (!blank(e) && e >= 1) { e = e / 100; notes.push(`El error se interpretó como porcentaje: e = ${F(e * 100)} % = ${F(e)}`); }
    }
    const unk = [];
    if (blank(c)) unk.push('conf'); if (blank(e)) unk.push('e'); if (blank(n)) unk.push('n');
    if (mean && blank(sigma)) unk.push('sigma'); if (fin && blank(N)) unk.push('N');
    const names = { conf: 'el nivel de confianza', e: 'el error (e)', n: 'el tamaño de muestra (n)', sigma: 'σ', N: 'N' };
    if (unk.length === 0) UI.fail('Todos los datos están completos. Deja vacío el que quieres hallar (normalmente n).');
    if (unk.length > 1) UI.fail('Hay más de un dato vacío: ' + unk.map((k) => names[k]).join(', ') + '. Deja vacío solo uno para poder despejarlo.');
    const what = unk[0];
    let Z = blank(c) ? null : Util.zCrit(1 - (1 - c) / 2, rnd);
    let V = mean ? (blank(sigma) ? null : sigma * sigma) : P * (1 - P);
    const Vn = mean ? 'σ²' : 'P·Q', Vs = mean ? F(V) : (F(P) + '·' + F(1 - P));
    if (!blank(n) && n <= 0) UI.fail('n debe ser positivo.'); if (!blank(e) && e <= 0) UI.fail('El error debe ser positivo.');
    if (fin && !blank(N) && N <= 1) UI.fail('N debe ser mayor que 1.');
    if (fin && !blank(N) && !blank(n) && what !== 'N' && n >= N) UI.fail('En población finita, n debe ser menor que N.');

    const rep = Report.create({ title: 'Tamaño de muestra — ' + (mean ? 'media' : 'proporción'), module: 'Muestreo', subtitle: fin ? 'Población finita' : 'Población infinita o desconocida' });
    rep.h('Datos del problema');
    const kv = [['Parámetro', mean ? 'Media poblacional (μ)' : 'Proporción poblacional (P)'], ['Población', fin ? 'Finita' : 'Infinita o desconocida']];
    if (!blank(c)) kv.push(['Confianza (1−α)', F(c * 100, 2) + ' %'], ['α', F(Util.alphaOf(c))]);
    if (Z !== null) kv.push(['Z(1−α/2)', F(Z, 4)]);
    if (mean && !blank(sigma)) kv.push(['σ', sigma], ['σ²', sigma * sigma]); if (!mean) kv.push(['P', P], ['Q = 1−P', 1 - P]);
    if (!blank(e)) kv.push(['Error (e)', e]); if (fin && !blank(N)) kv.push(['N', N]); if (!blank(n)) kv.push(['n', n]);
    rep.kv(kv); notes.forEach((t) => rep.p('• ' + t));

    rep.h('Fórmula utilizada');
    rep.eq(fin ? `n = Z² · ${Vn} · N / ( Z² · ${Vn} + e² · (N − 1) )` : `n = Z² · ${Vn} / e²`);
    rep.p('Donde ' + (mean ? 'σ² es la varianza poblacional' : 'P·Q es la varianza de la proporción (Q = 1 − P)') + ', Z es el valor de la normal para el nivel de confianza y e el error máximo.');

    rep.h('Procedimiento paso a paso');
    let res, out = {}, unit = '';
    const Z2 = Z === null ? null : Z * Z;
    if (what === 'n') {
      let step = 1;
      rep.step(step++, 'Valor crítico Z', [`1−α = ${F(c)} → α = ${F(Util.alphaOf(c))} → α/2 = ${F(Util.alphaOf(c) / 2)}`, `Z(1−α/2) = Z(${F(1 - Util.alphaOf(c) / 2)}) = ${F(Z, 4)}`]);
      rep.step(step++, 'Sustituir en la fórmula', fin
        ? [`n = (${F(Z, 3)})² · ${Vs} · ${F(N)} / ( (${F(Z, 3)})² · ${Vs} + (${F(e)})² · (${F(N)} − 1) )`, `n = ${F(Z2 * V * N)} / ( ${F(Z2 * V)} + ${F(e * e * (N - 1))} )`]
        : [`n = (${F(Z, 3)})² · ${Vs} / (${F(e)})²`, `n = ${F(Z2 * V)} / ${F(e * e)}`]);
      const nn = fin ? Z2 * V * N / (Z2 * V + e * e * (N - 1)) : Z2 * V / (e * e);
      rep.step(step++, 'Resultado y redondeo', [`n = ${F(nn, 4)}`, `Se redondea hacia arriba (no se puede muestrear una fracción): n ≅ ${Math.ceil(nn - 1e-9)}`]);
      res = Math.ceil(nn - 1e-9); out = { label: 'Tamaño de muestra n', value: res };
      rep.result('Tamaño de muestra n', res);
      rep.concl(`Se necesita una muestra de al menos ${res} unidades para estimar ${mean ? 'la media' : 'la proporción'} con ${F(c * 100, 1)} % de confianza y un error máximo de ${F(e)}${fin ? ` (población N = ${F(N)}; fracción de muestreo n/N = ${F(res / N * 100, 2)} %)` : ''}.`, 'ok');
      // sensibilidad
      const es = [0.5, 0.75, 1, 1.5, 2].map((k) => e * k), nf = (ee) => Math.ceil((fin ? Z2 * V * N / (Z2 * V + ee * ee * (N - 1)) : Z2 * V / (ee * ee)) - 1e-9);
      rep.h('Cómo cambia n al variar el error');
      rep.table(['Error e', 'n necesario'], es.map((ee) => [F(ee, 4), nf(ee)]), 'Menos error exige una muestra mayor', { highlightRow: [2] });
      rep.chart({ kind: 'bars', title: 'Tamaño de muestra según el error tolerado', labels: es.map((ee) => 'e=' + F(ee, 3)), values: es.map(nf), highlight: [2], xlabel: 'Error máximo', ylabel: 'n' });
    } else if (what === 'e') {
      let ee2 = fin ? Z2 * V * (N - n) / (n * (N - 1)) : Z2 * V / n; const ee = Math.sqrt(ee2);
      rep.step(1, 'Despejar e de la fórmula', fin ? ['e² = Z²·' + Vn + ' · (N − n) / ( n · (N − 1) )'] : ['e = Z · √(' + Vn + ' / n)']);
      rep.step(2, 'Sustituir', fin ? [`e² = (${F(Z, 3)})² · ${Vs} · (${F(N)} − ${F(n)}) / ( ${F(n)} · (${F(N)} − 1) ) = ${F(ee2, 6)}`, `e = √${F(ee2, 6)}`] : [`e = ${F(Z, 3)} · √(${Vs} / ${F(n)}) = ${F(Z, 3)} · ${F(Math.sqrt(V / n), 6)}`]);
      rep.result('Error máximo e', ee); rep.concl(`Con n = ${F(n)} y ${F(c * 100, 1)} % de confianza, el error máximo es e = ${F(ee, 5)}${mean ? '' : ' (' + F(ee * 100, 3) + ' puntos porcentuales)'}.`, 'ok');
    } else if (what === 'conf') {
      const z2 = fin ? e * e * n * (N - 1) / (V * (N - n)) : e * e * n / V, z = Math.sqrt(z2), cc = 2 * Stat.normCdf(z) - 1;
      rep.step(1, 'Despejar Z de la fórmula', fin ? ['Z² = e² · n · (N − 1) / ( ' + Vn + ' · (N − n) )'] : ['Z = e · √n / √' + Vn]);
      rep.step(2, 'Sustituir', fin ? [`Z² = ${F(e)}² · ${F(n)} · ${F(N - 1)} / ( ${Vs} · ${F(N - n)} ) = ${F(z2, 6)}`, `Z = ${F(z, 4)}`] : [`Z = ${F(e)} · √${F(n)} / √${F(V, 6)} = ${F(z, 4)}`]);
      rep.step(3, 'Confianza a partir de Z', [`1−α = 2·Φ(${F(z, 4)}) − 1 = ${F(cc, 5)}`]);
      rep.result('Nivel de confianza (1−α)', F(cc * 100, 2) + ' %'); rep.concl(`Con n = ${F(n)} y error ${F(e)}, el nivel de confianza alcanzado es ${F(cc * 100, 2)} % (Z = ${F(z, 3)}).`, 'ok');
      rep.chart({ kind: 'dist', dist: 'z', ra: [-z, z], rr: [[-5, -z], [z, 5]], crit: [-z, z], title: 'Zona de confianza alcanzada', raLabel: '1−α = ' + F(cc, 4), rrName: 'α' });
    } else if (what === 'sigma') {
      const vv = fin ? n * e * e * (N - 1) / (Z2 * (N - n)) : n * e * e / Z2;
      rep.step(1, 'Despejar σ² de la fórmula', fin ? ['σ² = n · e² · (N − 1) / ( Z² · (N − n) )'] : ['σ² = n · e² / Z²']);
      rep.step(2, 'Sustituir', fin ? [`σ² = ${F(n)} · ${F(e)}² · ${F(N - 1)} / ( ${F(Z, 3)}² · ${F(N - n)} ) = ${F(vv, 6)}`] : [`σ² = ${F(n)} · ${F(e)}² / ${F(Z, 3)}² = ${F(vv, 6)}`]);
      rep.step(3, 'Raíz', [`σ = √${F(vv, 6)} = ${F(Math.sqrt(vv), 5)}`]);
      rep.result('Desviación estándar σ', Math.sqrt(vv)); rep.concl(`Para que n = ${F(n)} cumpla con error ${F(e)} y ${F(c * 100, 1)} % de confianza, σ debe ser ${F(Math.sqrt(vv), 4)} (σ² = ${F(vv, 4)}).`, 'ok');
    } else if (what === 'N') {
      const den = n * e * e - Z2 * V; const NN = n * (e * e - Z2 * V) / den;
      if (!isFinite(NN) || NN <= 0 || den === 0) UI.fail('Con esos datos no existe una N finita coherente: la muestra pedida ya alcanza o supera lo necesario para una población infinita.');
      rep.step(1, 'Despejar N de la fórmula', ['N = n · ( e² − Z²·' + Vn + ' ) / ( n·e² − Z²·' + Vn + ' )']);
      rep.step(2, 'Sustituir', [`N = ${F(n)} · ( ${F(e)}² − ${F(Z, 3)}²·${Vs} ) / ( ${F(n)}·${F(e)}² − ${F(Z, 3)}²·${Vs} )`, `N = ${F(n * (e * e - Z2 * V))} / ${F(den)} = ${F(NN, 3)}`]);
      rep.result('Tamaño de la población N', Math.round(NN)); rep.concl(`La población compatible con esos datos es N ≈ ${Math.round(NN)}.`, 'ok');
    }
    return rep;
  }

  /* ===================== 2. AFIJACIÓN ESTRATIFICADA ===================== */
  function parseStrata(txt, needSigma) {
    const rows = txt.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l, i) => {
      const p = l.split(/[;\t]|,(?=\s*\d)/).map((x) => x.trim()); let nombre = p[0], Ni = Number(p[1]), s = p[2] !== undefined && p[2] !== '' ? Number(p[2]) : null;
      if (!isFinite(Ni) && isFinite(Number(p[0]))) { Ni = Number(p[0]); nombre = 'Estrato ' + (i + 1); s = p[1] !== undefined ? Number(p[1]) : null; }
      if (!isFinite(Ni) || Ni <= 0) UI.fail(`Línea ${i + 1}: escribe «Nombre; N del estrato» (ej.: Públicos; 6000).`);
      if (needSigma && (s === null || !isFinite(s))) UI.fail(`Línea ${i + 1}: la afijación óptima necesita σ del estrato (Nombre; N; σ).`);
      return { nombre, Ni, s };
    });
    if (rows.length < 2) UI.fail('Se necesitan al menos 2 estratos.'); return rows;
  }
  function strataTool(el) {
    UI.tool(el, {
      title: 'Muestreo estratificado — afijación', icon: 'branch',
      desc: 'Reparte la muestra entre los estratos con la <b>regla de tres</b>: nᵢ = (Nᵢ / N)·n (afijación proporcional), igual para todos (simple) u óptima (Neyman).',
      fields: [
        { id: 'tipo', label: 'Tipo de afijación', type: 'select', wide: true, options: [['prop', 'Proporcional (según el peso del estrato)'], ['simple', 'Simple (igual en cada estrato)'], ['opt', 'Óptima de Neyman (usa σ de cada estrato)']] },
        { id: 'n', label: 'Tamaño total de la muestra (n)', value: '' , hint: 'Si no lo tienes, cálcualo en «Tamaño de la muestra»'},
        { id: 'txt', label: 'Estratos (una línea cada uno)', type: 'textarea', rows: 6, wide: true, placeholder: 'Nombre; Nᵢ  (; σᵢ si es óptima)\nPúblicos; 6000\nParroquiales; 3000\nNo parroquiales; 1000' }
      ],
      examples: [
        { label: 'Colegios (n=600)', values: { tipo: 'prop', n: 600, txt: 'Colegios públicos; 6000\nPrivados parroquiales; 3000\nPrivados no parroquiales; 1000' } },
        { label: 'Instituto (n=50, 4 estratos)', values: { tipo: 'prop', n: 50, txt: 'Ciclos de grado superior; 110\nBachillerato; 162\nCiclo grado superior (2); 210\n2.º ciclo ESO; 338' } },
        { label: 'Misma muestra, afijación simple', values: { tipo: 'simple', n: 600, txt: 'Colegios públicos; 6000\nPrivados parroquiales; 3000\nPrivados no parroquiales; 1000' } }
      ],
      run(v) {
        Util.required(v, { n: 'Tamaño de muestra n' }); const S = parseStrata(v.txt, v.tipo === 'opt'), N = Stat.sum(S.map((s) => s.Ni)), n = Math.round(v.n);
        if (n < S.length) UI.fail('n debe ser al menos igual al número de estratos.'); if (n > N) UI.fail('n no puede superar N = ' + N + '.');
        let exact, form, tname;
        if (v.tipo === 'prop') { exact = S.map((s) => s.Ni / N * n); form = 'nᵢ = (Nᵢ / N) · n'; tname = 'Proporcional'; }
        else if (v.tipo === 'simple') { exact = S.map(() => n / S.length); form = 'nᵢ = n / k  (k = número de estratos)'; tname = 'Simple'; }
        else { const d = Stat.sum(S.map((s) => s.Ni * s.s)); exact = S.map((s) => n * s.Ni * s.s / d); form = 'nᵢ = n · Nᵢ·σᵢ / Σ(Nⱼ·σⱼ)'; tname = 'Óptima (Neyman)'; }
        const ni = Util.roundAlloc(exact, n);
        const rep = Report.create({ title: 'Afijación ' + tname.toLowerCase() + ' — muestreo estratificado', module: 'Muestreo', subtitle: `N = ${F(N)}, n = ${n}, ${S.length} estratos` });
        rep.h('Fórmula'); rep.eq(form);
        rep.h('Procedimiento paso a paso');
        S.forEach((s, i) => rep.step(i + 1, s.nombre, v.tipo === 'prop' ? [`Peso: Nᵢ/N = ${F(s.Ni)}/${F(N)} = ${F(s.Ni / N, 4)}`, `nᵢ = ${F(s.Ni / N, 4)} · ${n} = ${F(exact[i], 3)} ≅ ${ni[i]}`] : v.tipo === 'simple' ? [`nᵢ = ${n}/${S.length} = ${F(exact[i], 3)} ≅ ${ni[i]}`] : [`nᵢ = ${n} · ${F(s.Ni)}·${F(s.s)} / ${F(Stat.sum(S.map((q) => q.Ni * q.s)))} = ${F(exact[i], 3)} ≅ ${ni[i]}`]));
        rep.h('Resumen de la afijación');
        rep.table(['Estrato', 'Nᵢ', 'Peso Nᵢ/N', ...(v.tipo === 'opt' ? ['σᵢ'] : []), 'nᵢ exacto', 'nᵢ (redondeado)'], [...S.map((s, i) => [s.nombre, s.Ni, F(s.Ni / N, 4), ...(v.tipo === 'opt' ? [s.s] : []), F(exact[i], 3), ni[i]]), ['TOTAL', N, '1', ...(v.tipo === 'opt' ? [''] : []), F(Stat.sum(exact), 3), Stat.sum(ni)]], null, { highlightRow: [S.length] });
        rep.chart({ kind: 'bars', title: 'Muestra asignada por estrato', labels: S.map((s) => s.nombre), values: ni, xlabel: 'Estrato', ylabel: 'nᵢ' });
        rep.result('Total de la muestra', Stat.sum(ni));
        rep.concl(`Se toman ${ni.map((x, i) => `${x} de «${S[i].nombre}»`).join(', ')}. El redondeo usa el método de restos mayores para que la suma sea exactamente ${n}.`, 'ok');
        return rep;
      }
    });
  }

  /* ===================== 3. SELECCIÓN: MAS / SISTEMÁTICO / CONGLOMERADOS ===================== */
  function selectTool(el) {
    UI.tool(el, {
      title: 'Seleccionar la muestra (MAS, sistemático, conglomerados)', icon: 'dice',
      desc: 'Elige qué elementos numerados de la población entran en la muestra. Con una <b>semilla</b> el sorteo se puede repetir idéntico.',
      fields: [
        { id: 'm', label: 'Método', type: 'select', wide: true, options: [['mas', 'Aleatorio simple (MAS)'], ['sis', 'Aleatorio sistemático'], ['cong', 'Por conglomerados']] },
        { id: 'N', label: 'Población (N)', hint: 'Elementos numerados 1…N' },
        { id: 'n', label: 'Muestra (n)', show: (v) => v.m !== 'cong' },
        { id: 'r', label: 'Arranque aleatorio (r)', blank: true, show: (v) => v.m === 'sis', hint: 'Entre 1 y k. Vacío = sorteado' },
        { id: 'K', label: 'N.º de conglomerados en la población', show: (v) => v.m === 'cong', hint: 'Ej.: institutos de la lista' },
        { id: 'nn', label: 'Muestra total deseada de individuos', show: (v) => v.m === 'cong' },
        { id: 'M', label: 'Tamaño medio de un conglomerado', show: (v) => v.m === 'cong', hint: 'Ej.: 35 profesores por instituto' },
        { id: 'seed', label: 'Semilla (opcional)', type: 'text', placeholder: 'ej. 2026' }
      ],
      examples: [
        { label: 'MAS: 100 de 1000', values: { m: 'mas', N: 1000, n: 100 } },
        { label: 'Sistemático: 100 de 1000', values: { m: 'sis', N: 1000, n: 100, r: '' } },
        { label: 'Conglomerados (700 personas)', values: { m: 'cong', K: 120, nn: 700, M: 35, N: '' } }
      ],
      run(v) {
        const r = Util.rng(v.seed); const seedTxt = v.seed ? `Semilla: ${v.seed}` : 'Sorteo sin semilla (cambia en cada ejecución)';
        if (v.m === 'cong') {
          Util.required(v, { K: 'Conglomerados en la población', nn: 'Muestra total', M: 'Tamaño medio del conglomerado' });
          const m = Math.ceil(v.nn / v.M); if (m > v.K) UI.fail(`Se necesitan ${m} conglomerados pero la población solo tiene ${v.K}.`);
          const idx = Util.sampleIdx(v.K, m, r).map((i) => i + 1);
          const rep = Report.create({ title: 'Muestreo por conglomerados', module: 'Muestreo', subtitle: seedTxt });
          rep.h('Datos'); rep.kv([['Muestra total deseada', v.nn], ['Tamaño medio del conglomerado', v.M], ['Conglomerados en la población (K)', v.K]]);
          rep.h('Procedimiento paso a paso');
          rep.step(1, 'Listar y numerar los conglomerados', [`Se numeran los K = ${v.K} conglomerados del 1 al ${v.K}.`]);
          rep.step(2, 'Número de conglomerados a seleccionar', [`m = n / M = ${F(v.nn)} / ${F(v.M)} = ${F(v.nn / v.M, 3)} ≅ ${m}`]);
          rep.step(3, 'Seleccionarlos por muestreo aleatorio simple', [`Conglomerados elegidos: ${idx.join(', ')}`]);
          rep.step(4, 'Observar a todos los individuos de cada conglomerado', ['Muestreo monoetápico: se encuesta a todos. (Si se sortea dentro de cada uno sería bietápico.)']);
          rep.result('Conglomerados seleccionados', m); rep.table(['N.º', 'Conglomerado'], idx.map((x, i) => [i + 1, x]), 'Conglomerados que entran en la muestra');
          rep.concl(`Se estudian ${m} conglomerados (≈ ${m * Math.round(v.M)} individuos): ${idx.join(', ')}.`, 'ok'); return rep;
        }
        Util.required(v, { N: 'N', n: 'n' }); const N = Math.round(v.N), n = Math.round(v.n);
        if (n >= N || n < 1) UI.fail('n debe estar entre 1 y N−1.');
        const rep = Report.create({ title: v.m === 'mas' ? 'Muestreo aleatorio simple' : 'Muestreo aleatorio sistemático', module: 'Muestreo', subtitle: `N = ${N}, n = ${n}. ${seedTxt}` });
        let sel;
        if (v.m === 'mas') {
          sel = Util.sampleIdx(N, n, r).map((i) => i + 1);
          rep.h('Procedimiento paso a paso');
          rep.step(1, 'Numerar la población', [`Se asigna un número del 1 al ${N} a cada elemento.`]);
          rep.step(2, 'Sortear sin reemplazo', [`Se sortean ${n} números distintos entre 1 y ${N} con un generador aleatorio.`]);
          rep.step(3, 'Ordenar la lista elegida', ['Los elementos elegidos se muestran ordenados de menor a mayor.']);
        } else {
          const k = N / n, ki = Number.isInteger(k);
          let rr = v.r; if (blank(rr)) rr = ki ? 1 + Math.floor(r() * k) : r() * k; if (rr < 1 - 1e-9 || rr > k + 1e-9) UI.fail(`El arranque r debe estar entre 1 y k = ${F(k, 3)}.`);
          sel = Array.from({ length: n }, (_, i) => Math.min(N, ki ? rr + i * k : Math.ceil(rr + i * k - 1e-9)));
          rep.h('Fórmula'); rep.eq('k = N / n        elementos: r, r + k, r + 2k, …, r + (n−1)k');
          rep.h('Procedimiento paso a paso');
          rep.step(1, 'Listado de la población', [`Se dispone de la lista de N = ${N} elementos.`]);
          rep.step(2, 'Tamaño muestral', [`n = ${n}`]);
          rep.step(3, 'Intervalo de selección', [`k = N / n = ${N} / ${n} = ${F(k, 4)}${ki ? '' : ' (no es entero: se aplica el redondeo hacia arriba de r + i·k)'}`]);
          rep.step(4, 'Arranque aleatorio', [`r entre 1 y ${F(k, 3)}  →  r = ${F(rr, 3)}`]);
          rep.step(5, 'Seleccionar los elementos', [`${sel.slice(0, 6).join(', ')}${n > 6 ? ', …, ' + sel[n - 1] : ''}`]);
        }
        rep.result('Elementos en la muestra', n);
        const cols = 10, rows = []; for (let i = 0; i < sel.length; i += cols) rows.push(sel.slice(i, i + cols).concat(Array(Math.max(0, cols - (sel.length - i))).fill('')));
        rep.table(Array.from({ length: cols }, (_, i) => String(i + 1)), rows, 'Números de los elementos seleccionados (' + n + ')');
        rep.chart({ kind: 'hist', title: 'Distribución de los elementos elegidos dentro de la población', xlabel: 'Número de elemento', bins: (() => { const B = 10, w = N / B; return Array.from({ length: B }, (_, i) => ({ lo: i * w, hi: (i + 1) * w, count: sel.filter((s) => s > i * w && s <= (i + 1) * w).length })); })() });
        rep.concl(`Muestra seleccionada: ${sel.length <= 40 ? sel.join(', ') : sel.slice(0, 40).join(', ') + ', … (ver tabla)'}.`, 'ok');
        return rep;
      }
    });
  }

  /* ===================== 4. LABORATORIO DE DATOS ===================== */
  function demoData() {
    const r = Util.rng('niños'), rows = ['PESO\tEDAD\tTALLA\tCOLESTEROL'];
    for (let i = 0; i < 50; i++) { const edad = 6 + Math.floor(r() * 9), talla = Math.round(110 + (edad - 6) * 6 + r() * 14), peso = Math.round((18 + (edad - 6) * 3.2 + r() * 20) * 10) / 10, col = Math.round(150 + r() * 100); rows.push([peso, edad, talla, col].join('\t')); }
    return rows.join('\n');
  }
  function labTool(el) {
    const t = UI.tool(el, {
      title: 'Laboratorio de datos — extraer una muestra de tu tabla', icon: 'web',
      desc: 'Pega tu base (con encabezados, desde Excel o CSV) y extrae la muestra con el método que pida el ejercicio: MAS, sistemático o estratificado proporcional con tus propios cortes.',
      fields: [
        { id: 'txt', label: 'Datos (primera fila = encabezados)', type: 'textarea', rows: 8, wide: true, placeholder: 'PESO\tEDAD\tTALLA\tCOLESTEROL\n25.5\t8\t128\t190\n…' },
        { id: 'm', label: 'Método', type: 'select', wide: true, options: [['mas', 'Aleatorio simple (MAS)'], ['sis', 'Sistemático'], ['est', 'Estratificado proporcional'], ['esti', 'Estratificado con afijación simple (igual)']] },
        { id: 'n', label: 'Tamaño de la muestra (n)', value: 15 },
        { id: 'col', label: 'Columna para estratificar', type: 'text', show: (v) => v.m.startsWith('est'), placeholder: 'ej. PESO' },
        { id: 'cuts', label: 'Cortes numéricos', type: 'text', show: (v) => v.m.startsWith('est'), placeholder: 'ej. 23, 50', hint: 'Vacío = cada valor distinto es un estrato (variable categórica)' },
        { id: 'labs', label: 'Nombres de los estratos', type: 'text', wide: true, show: (v) => v.m.startsWith('est'), placeholder: 'ej. Bajo peso, Peso normal, Sobrepeso', hint: 'Con cortes c₁<c₂: menor que c₁ | entre c₁ y c₂ | mayor que c₂' },
        { id: 'seed', label: 'Semilla (opcional)', type: 'text' }
      ],
      examples: [
        { label: 'Estratificar por peso', values: { txt: demoData(), m: 'est', n: 15, col: 'PESO', cuts: '23, 50', labs: 'Bajo peso, Peso normal, Sobrepeso' } },
        { label: 'Estratificar por colesterol', values: { txt: demoData(), m: 'est', n: 15, col: 'COLESTEROL', cuts: '200, 220', labs: 'Deseable, De riesgo, Alto riesgo' } }
      ],
      run(v) {
        if (!v.txt.trim()) UI.fail('Pega primero la tabla de datos (o pulsa «Cargar datos de ejemplo»).');
        const T = Util.parseTable(v.txt), N = T.data.length; Util.required(v, { n: 'n' }); const n = Math.round(v.n); if (n < 1 || n >= N) UI.fail(`n debe estar entre 1 y ${N - 1}.`);
        const r = Util.rng(v.seed); let sel = [], strata = null, info = [];
        const method = { mas: 'MAS', sis: 'Sistemático', est: 'Estratificado proporcional', esti: 'Estratificado simple' }[v.m];
        if (v.m === 'mas') sel = Util.sampleIdx(N, n, r);
        else if (v.m === 'sis') { const k = N / n, rr = r() * k; sel = Array.from({ length: n }, (_, i) => Math.min(N - 1, Math.ceil(rr + i * k - 1e-9) - 1)); info.push(`k = N/n = ${N}/${n} = ${F(k, 3)}; arranque r = ${F(rr, 2)}`); }
        else {
          const ci = T.head.findIndex((h) => h.toLowerCase() === v.col.trim().toLowerCase()); if (ci < 0) UI.fail(`No encuentro la columna «${v.col}». Columnas: ${T.head.join(', ')}.`);
          const cuts = v.cuts.trim() ? Stat.parseNums(v.cuts).sort((a, b) => a - b) : null, labsIn = v.labs.split(',').map((s) => s.trim()).filter(Boolean);
          let labels;
          const grp = T.data.map((row) => { const x = row[ci]; if (cuts) { if (typeof x !== 'number') UI.fail('La columna elegida tiene valores no numéricos; quita los cortes para usarla como categórica.'); if (x < cuts[0]) return 0; let g = 1; for (let j = 1; j < cuts.length; j++) if (x > cuts[j]) g = j + 1; return g; } return String(x); });
          if (cuts) labels = Array.from({ length: cuts.length + 1 }, (_, i) => labsIn[i] || (i === 0 ? `< ${cuts[0]}` : i === cuts.length ? `> ${cuts[cuts.length - 1]}` : `${cuts[i - 1]} – ${cuts[i]}`)); else labels = [...new Set(grp)];
          const keys = cuts ? labels.map((_, i) => i) : labels;
          strata = keys.map((k, i) => ({ nombre: labels[i], idx: grp.map((g, j) => g === k ? j : -1).filter((j) => j >= 0) })).filter((s) => s.idx.length);
          if (n < strata.length) UI.fail('n es menor que el número de estratos con datos.');
          const exact = v.m === 'est' ? strata.map((s) => s.idx.length / N * n) : strata.map(() => n / strata.length); const ni = Util.roundAlloc(exact, n);
          strata.forEach((s, i) => { s.ni = Math.min(ni[i], s.idx.length); s.exact = exact[i]; const pick = Util.sampleIdx(s.idx.length, s.ni, r); s.sel = pick.map((p) => s.idx[p]); sel.push(...s.sel); });
          sel.sort((a, b) => a - b);
        }
        const rep = Report.create({ title: 'Muestra extraída — ' + method, module: 'Muestreo', subtitle: `Población N = ${N} filas, muestra n = ${sel.length}` });
        rep.h('Procedimiento');
        rep.step(1, 'Población', [`Se leyeron ${N} filas y ${T.head.length} variables: ${T.head.join(', ')}.`]);
        if (strata) {
          rep.step(2, `Estratificación por ${v.col.toUpperCase()}`, [strata.map((s) => `${s.nombre}: N = ${s.idx.length}`).join('  ·  ')]);
          rep.step(3, v.m === 'est' ? 'Afijación proporcional' : 'Afijación simple', strata.map((s) => v.m === 'est' ? `${s.nombre}: nᵢ = (${s.idx.length}/${N})·${n} = ${F(s.exact, 3)} ≅ ${s.ni}` : `${s.nombre}: nᵢ = ${n}/${strata.length} = ${F(s.exact, 3)} ≅ ${s.ni}`));
          rep.step(4, 'Sorteo dentro de cada estrato', ['Se elige al azar (MAS) el número asignado dentro de cada estrato.']);
          rep.h('Estratos'); rep.table(['Estrato', 'Nᵢ', 'Peso', 'nᵢ'], [...strata.map((s) => [s.nombre, s.idx.length, F(s.idx.length / N, 4), s.ni]), ['TOTAL', N, '1', Stat.sum(strata.map((s) => s.ni))]], null, { highlightRow: [strata.length] });
          rep.chart({ kind: 'bars', title: 'Población y muestra por estrato', labels: strata.map((s) => s.nombre), values: strata.map((s) => s.ni), xlabel: 'Estrato', ylabel: 'nᵢ en la muestra' });
        } else { info.forEach((t, i) => rep.step(2 + i, 'Cálculo', [t])); rep.step(2 + info.length, 'Elegir', [`Se seleccionan ${sel.length} filas.`]); }
        rep.h('Filas seleccionadas');
        rep.table(['Fila', ...T.head], sel.map((i) => [i + 1, ...T.data[i]]), `${sel.length} filas de la muestra`);
        const nums = T.head.map((h, j) => ({ h, j })).filter(({ j }) => T.data.every((row) => typeof row[j] === 'number'));
        if (nums.length) { rep.h('Población frente a muestra'); rep.table(['Variable', 'Media poblacional', 'Media muestral', 'Desv. est. muestral'], nums.map(({ h, j }) => [h, Stat.mean(T.data.map((r2) => r2[j])), Stat.mean(sel.map((i) => T.data[i][j])), sel.length > 1 ? Stat.sd(sel.map((i) => T.data[i][j])) : '—']), 'Una buena muestra tiene medias cercanas a las de la población'); }
        rep.result('Filas en la muestra', sel.length);
        rep.concl(`Muestra ${method.toLowerCase()} de ${sel.length} elementos extraída de ${N}.`, 'ok');
        return rep;
      }
    });
    const b = UI.$('<button class="chip">Cargar datos de ejemplo (50 niños, ficticios)</button>'); b.onclick = () => { t.form.set('txt', demoData()); UI.toast('Datos de ejemplo cargados'); };
    el.querySelector('.examples').appendChild(b);
  }

  /* ===================== 5. GUÍA ===================== */
  function guideTool(el) {
    el.innerHTML = '';
    el.appendChild(UI.$(`<div class="tool-head"><h2>Guía de muestreo y variables</h2><p>Para decidir el método y clasificar variables como pide el trabajo práctico (población, muestra, unidad estadística).</p></div>`));
    const g = UI.$(`<div class="guide-grid"></div>`); el.appendChild(g);
    const wiz = UI.$(`<section class="card"><h3>¿Qué muestreo uso?</h3>
      <label class="fld"><span class="lab">¿Se tiene el listado de toda la población?</span><select id="q1"><option value="s">Sí</option><option value="n">No</option></select></label>
      <label class="fld"><span class="lab">¿Se quiere generalizar con rigor estadístico?</span><select id="q2"><option value="s">Sí (probabilístico)</option><option value="n">No (exploratorio)</option></select></label>
      <label class="fld"><span class="lab">¿La población se divide en grupos distintos entre sí (sexo, tipo de colegio…)?</span><select id="q3"><option value="n">No / homogénea</option><option value="s">Sí, grupos (estratos)</option></select></label>
      <label class="fld"><span class="lab">¿Está dispersa en grupos naturales (institutos, colmenas, manzanas)?</span><select id="q4"><option value="n">No</option><option value="s">Sí (conglomerados)</option></select></label>
      <label class="fld"><span class="lab">¿La lista está ordenada y quieres simplicidad?</span><select id="q5"><option value="n">No</option><option value="s">Sí</option></select></label>
      <div id="wres" class="concl info"></div></section>`);
    const vars = UI.$(`<section class="card"><h3>¿Qué tipo de variable es?</h3>
      <label class="fld"><span class="lab">¿Se expresa con números sobre los que tiene sentido operar?</span><select id="v1"><option value="s">Sí, es una cantidad</option><option value="n">No, es una cualidad / categoría</option></select></label>
      <label class="fld" id="v2w"><span class="lab">¿Se obtiene contando o midiendo?</span><select id="v2"><option value="c">Contando (valores enteros)</option><option value="m">Midiendo (cualquier valor en un intervalo)</option></select></label>
      <label class="fld" id="v3w" style="display:none"><span class="lab">¿Las categorías tienen un orden natural?</span><select id="v3"><option value="n">No</option><option value="s">Sí</option></select></label>
      <div id="vres" class="concl info"></div></section>`);
    g.append(wiz, vars);
    const wr = () => {
      const q = (i) => wiz.querySelector('#q' + i).value === 's'; let m, why;
      if (!q(2)) { m = 'Muestreo no probabilístico (cuotas, intencional, casual o bola de nieve)'; why = 'Sirve para estudios exploratorios, pero no permite generalizar porque no todos tienen la misma probabilidad de ser elegidos.'; }
      else if (!q(1) && q(4)) { m = 'Muestreo por conglomerados'; why = 'Solo hace falta la lista de las unidades primarias (conglomerados). Su error estándar es mayor que el de MAS o estratificado.'; }
      else if (!q(1)) { m = 'Muestreo por conglomerados o en etapas (no hay marco completo)'; why = 'Sin listado completo no se puede hacer MAS; se muestrea por grupos accesibles.'; }
      else if (q(3)) { m = 'Muestreo aleatorio estratificado (afijación proporcional)'; why = 'Garantiza que cada grupo esté representado y da estimaciones más precisas. Reparte n con regla de tres: nᵢ = Nᵢ/N · n.'; }
      else if (q(4)) { m = 'Muestreo por conglomerados'; why = 'Útil cuando los individuos están agrupados de forma natural y es difícil llegar a ellos uno por uno.'; }
      else if (q(5)) { m = 'Muestreo aleatorio sistemático'; why = 'Fácil de aplicar: k = N/n, arranque aleatorio r y se toma cada k-ésimo. Cuidado si hay un patrón periódico.'; }
      else { m = 'Muestreo aleatorio simple (MAS)'; why = 'Todos los elementos tienen la misma probabilidad. Requiere el listado completo.'; }
      wiz.querySelector('#wres').innerHTML = `<span class="ci">✦</span><div><b>${m}</b><br>${why}</div>`;
    };
    const vr = () => {
      const num = vars.querySelector('#v1').value === 's'; vars.querySelector('#v2w').style.display = num ? '' : 'none'; vars.querySelector('#v3w').style.display = num ? 'none' : '';
      const r = num ? (vars.querySelector('#v2').value === 'c' ? 'Cuantitativa discreta (ej.: n.º de vacas en ordeñe, número de semillas)' : 'Cuantitativa continua (ej.: peso, temperatura, colesterol, altura)') : (vars.querySelector('#v3').value === 's' ? 'Cualitativa ordinal (ej.: concentración baja/media/alta, excelente/buena/mala)' : 'Cualitativa nominal (ej.: raza, color, variedad, estado preñada/vacía)');
      vars.querySelector('#vres').innerHTML = `<span class="ci">✦</span><div><b>${r}</b></div>`;
    };
    wiz.addEventListener('change', wr); vars.addEventListener('change', vr); wr(); vr();
    const ref = UI.$(`<section class="card wide-card"><h3>Resumen de métodos</h3><div class="tscroll"><table class="grid"><thead><tr><th>Método</th><th>Cómo se hace</th><th>Ventaja</th><th>Limitación</th></tr></thead><tbody>
      <tr><td>MAS</td><td>Sorteo directo de n números entre 1 y N</td><td>Igual probabilidad para todos</td><td>Requiere listado completo</td></tr>
      <tr><td>Sistemático</td><td>k = N/n, arranque r y cada k-ésimo</td><td>Fácil de aplicar</td><td>Sesgo si hay periodicidad</td></tr>
      <tr><td>Estratificado</td><td>Dividir en estratos y repartir n (regla de tres)</td><td>Más precisión y representatividad</td><td>Hay que conocer la composición</td></tr>
      <tr><td>Conglomerados</td><td>Sortear grupos y observar a todos</td><td>No exige lista de individuos</td><td>Mayor error estándar</td></tr>
      <tr><td>Cuotas / intencional / casual / bola de nieve</td><td>Criterio del investigador</td><td>Barato y rápido</td><td>No permite generalizar</td></tr></tbody></table></div></section>`);
    el.appendChild(ref);
  }

  App.register({
    id: 'muestreo', name: 'Muestreo', icon: 'dice', blurb: 'Tamaño de muestra con despeje automático, afijación, selección y base de datos.',
    tools: [{ id: 'tamano', name: 'Tamaño de muestra', render: sizeTool }, { id: 'afijacion', name: 'Afijación estratificada', render: strataTool }, { id: 'seleccion', name: 'Seleccionar muestra', render: selectTool }, { id: 'datos', name: 'Laboratorio de datos', render: labTool }, { id: 'guia', name: 'Guía', render: guideTool }]
  });
})();
