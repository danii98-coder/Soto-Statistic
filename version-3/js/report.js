/* Reporte: estructura de bloques serializable que alimenta pantalla, Excel, Word y PDF */
const Report = (function () {
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  /* formato numérico: hasta d decimales, sin ceros sobrantes */
  function F(x, d = 4) {
    if (x === null || x === undefined || x === '') return '—';
    if (typeof x === 'bigint') return x.toLocaleString('en-US').replace(/,/g, ' ');
    if (typeof x === 'string') return x;
    if (!isFinite(x)) return x > 0 ? '∞' : x < 0 ? '−∞' : 'n/d';
    if (Math.abs(x) >= 1e12 || (Math.abs(x) < 1e-6 && x !== 0)) return x.toExponential(3);
    return String(+x.toFixed(d)).replace('-', '−');
  }

  function create(o) {
    const r = { id: 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title: o.title, module: o.module || '', subtitle: o.subtitle || '', date: new Date().toLocaleString('es-PE'), blocks: [] };
    const add = (b) => { r.blocks.push(b); return r; };
    r.h = (text) => add({ t: 'h', text });
    r.p = (text) => add({ t: 'p', text });
    r.eq = (text) => add({ t: 'eq', text });
    r.step = (n, title, lines) => add({ t: 'step', n, title, lines: [].concat(lines) });
    r.kv = (rows, caption) => add({ t: 'kv', rows: rows.map(([k, v]) => [k, typeof v === 'number' || typeof v === 'bigint' ? F(v) : v]), caption });
    r.table = (head, rows, caption, opts) => add({ t: 'table', head, rows: rows.map((row) => row.map((v) => (typeof v === 'number' || typeof v === 'bigint') ? F(v) : v)), caption, opts: opts || {} });
    r.chart = (spec, caption) => add({ t: 'chart', spec, caption });
    r.result = (label, value) => add({ t: 'result', label, value: typeof value === 'number' ? F(value) : value });
    r.concl = (text, kind = 'info') => add({ t: 'concl', text, kind });
    return r;
  }

  /* ---------- álgebra (KaTeX) ---------- */
  function texHTML(t) {
    try { return katex.renderToString(t, { displayMode: false, throwOnError: false, strict: false }); } catch (e) { return esc(t); }
  }

  /* ---------- render DOM ---------- */
  function toDOM(rep, theme = 'dark') {
    const root = document.createElement('article');
    root.className = 'report rtheme-' + theme;
    root.innerHTML = `<header class="rep-head"><div class="rep-mod">${esc(rep.module)}</div><h2>${esc(rep.title)}</h2>${rep.subtitle ? `<p class="rep-sub">${esc(rep.subtitle)}</p>` : ''}<div class="rep-date">${esc(rep.date)}</div></header>`;
    rep.blocks.forEach((b) => {
      const el = document.createElement('div'); el.className = 'blk blk-' + b.t;
      if (b.t === 'h') { el.innerHTML = `<h3><span class="ornament">✦</span> ${esc(b.text)}</h3>`; }
      else if (b.t === 'p') { el.innerHTML = `<p>${esc(b.text).replace(/\n/g, '<br>')}</p>`; }
      else if (b.t === 'eq') { el.innerHTML = `<div class="eq">${esc(b.text).replace(/\n/g, '<br>')}</div>`; }
      else if (b.t === 'step') {
        el.innerHTML = `<div class="step"><div class="step-n">${esc(b.n)}</div><div class="step-b"><h4>${esc(b.title)}</h4>${b.lines.map((l) => (l && l.tex !== undefined) ? `<div class="sl tex">${texHTML(l.tex)}</div>` : `<div class="sl">${esc(l)}</div>`).join('')}</div></div>`;
      }
      else if (b.t === 'kv') {
        el.innerHTML = (b.caption ? `<div class="cap">${esc(b.caption)}</div>` : '') + `<table class="kv">${b.rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table>`;
      }
      else if (b.t === 'table') {
        const hl = (b.opts && b.opts.highlightRow) || [];
        el.innerHTML = (b.caption ? `<div class="cap">${esc(b.caption)}</div>` : '') + `<div class="tscroll"><table class="grid"><thead><tr>${b.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${b.rows.map((row, i) => `<tr class="${hl.includes(i) ? 'hl' : ''}">${row.map((v) => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      }
      else if (b.t === 'chart') {
        const cv = document.createElement('canvas'); cv.className = 'chart'; el.appendChild(cv);
        if (b.caption) { const c = document.createElement('div'); c.className = 'cap center'; c.textContent = b.caption; el.appendChild(c); }
        requestAnimationFrame(() => Charts.render(b.spec, cv, theme === 'paper' ? 'paper' : 'dark'));
        el._cv = cv;
      }
      else if (b.t === 'result') { el.innerHTML = `<div class="result"><span class="rl">${esc(b.label)}</span><span class="rv">${esc(b.value)}</span></div>`; }
      else if (b.t === 'concl') { el.innerHTML = `<div class="concl ${b.kind}"><span class="ci">${b.kind === 'ok' ? '☾' : b.kind === 'bad' ? '✠' : '✦'}</span><div>${esc(b.text).replace(/\n/g, '<br>')}</div></div>`; }
      root.appendChild(el);
    });
    return root;
  }

  /* ---------- cuaderno (localStorage) ---------- */
  const KEY = 'grimorio.cuaderno.v1';
  const store = {
    all() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } },
    save(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; } },
    add(rep) { const l = store.all(); l.unshift(rep); return store.save(l); },
    remove(id) { store.save(store.all().filter((r) => r.id !== id)); },
    clear() { store.save([]); }
  };

  return { create, toDOM, F, esc, store, texHTML };
})();
