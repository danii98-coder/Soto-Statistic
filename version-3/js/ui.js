/* Componentes de interfaz: formularios, herramientas, resultados, iconos, avisos */
const UI = (function () {
  const $ = (h) => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstChild; };
  const esc = Report.esc;

  const ICONS = {
    home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/><path d="M12 4V2"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/><path d="M17 4l.6 1.4L19 6l-1.4.6L17 8l-.6-1.4L15 6l1.4-.6z"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M12 2v2M5 4.5l1.2 1.5M19 4.5L17.8 6"/>',
    star: '<path d="M12 2l2.4 6.6L21 9.5l-5 4.4 1.6 6.6L12 17l-5.6 3.5L8 13.9 3 9.5l6.6-.9z"/>',
    branch: '<path d="M12 22V10"/><path d="M12 14c-3 0-5-2-5-5M12 11c3 0 5-2 5-5M12 17c-2.5-.5-4-2-4.5-4"/><path d="M7 9l-2-2M17 6l2-2"/>',
    web: '<path d="M12 2v20M2 12h20M4.5 4.5l15 15M19.5 4.5l-15 15"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="8"/>',
    book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 21.5A2.5 2.5 0 0 0 6.5 24H20v-2"/><path d="M9 7h7M9 11h5"/>',
    dice: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.2"/><circle cx="16" cy="8" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="8" cy="16" r="1.2"/><circle cx="16" cy="16" r="1.2"/>',
    bell: '<path d="M2 19c3 0 4-3 5-8s2-8 5-8 4 3 5 8 2 8 5 8z"/>',
    scale: '<path d="M12 3v18M6 21h12"/><path d="M5 7h14"/><path d="M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16M15 4v16"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>',
    scroll: '<path d="M6 3h11a2 2 0 0 1 2 2v13a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V5a2 2 0 0 1 1-2z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/>',
    ghost: '<path d="M5 21V10a7 7 0 0 1 14 0v11l-2.3-2-2.4 2-2.3-2-2.3 2-2.4-2z"/><circle cx="9.5" cy="10" r="1"/><circle cx="14.5" cy="10" r="1"/>',
    hat: '<path d="M3 18h18M7 18l2-11h6l2 11"/><path d="M8 13h8"/>',
    dl: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>'
  };
  const icon = (n, s = 20) => `<svg class="ico" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[n] || ICONS.star}</svg>`;

  function toast(msg, kind = 'info') {
    let host = document.getElementById('toasts'); if (!host) { host = $('<div id="toasts"></div>'); document.body.appendChild(host); }
    const t = $(`<div class="toast ${kind}">${esc(msg)}</div>`); host.appendChild(t); setTimeout(() => t.classList.add('out'), 3200); setTimeout(() => t.remove(), 3700);
  }

  /* ---------- formulario ---------- */
  function form(fields) {
    const el = document.createElement('div'); el.className = 'form';
    const refs = {};
    fields.forEach((f) => {
      const wrap = document.createElement('label'); wrap.className = 'fld' + (f.wide ? ' wide' : '') + (f.type === 'checkbox' ? ' chk' : '');
      let input;
      if (f.type === 'select') {
        input = document.createElement('select'); (f.options || []).forEach(([v, l]) => { const o = document.createElement('option'); o.value = v; o.textContent = l; input.appendChild(o); });
        input.value = f.value !== undefined ? f.value : f.options[0][0];
      } else if (f.type === 'textarea') {
        input = document.createElement('textarea'); input.rows = f.rows || 5; input.value = f.value || ''; input.placeholder = f.placeholder || ''; input.spellcheck = false;
      } else if (f.type === 'checkbox') {
        input = document.createElement('input'); input.type = 'checkbox'; input.checked = !!f.value;
      } else {
        input = document.createElement('input'); input.type = f.type === 'text' ? 'text' : 'text'; input.inputMode = f.type === 'text' ? 'text' : 'decimal';
        input.value = f.value !== undefined && f.value !== null ? f.value : ''; input.placeholder = f.placeholder || (f.blank ? '¿? se despeja' : ''); input.autocomplete = 'off';
      }
      input.id = 'f_' + f.id + '_' + Math.random().toString(36).slice(2, 6); refs[f.id] = { input, wrap, def: f };
      const lab = f.type === 'checkbox' ? `<span class="lab">${esc(f.label)}</span>` : `<span class="lab">${esc(f.label)}${f.unit ? ` <em>${esc(f.unit)}</em>` : ''}</span>`;
      if (f.type === 'checkbox') { wrap.appendChild(input); wrap.insertAdjacentHTML('beforeend', lab); } else { wrap.insertAdjacentHTML('beforeend', lab); wrap.appendChild(input); }
      if (f.hint) wrap.insertAdjacentHTML('beforeend', `<small>${esc(f.hint)}</small>`);
      el.appendChild(wrap);
    });
    const api = {
      el, vals() {
        const o = {};
        Object.entries(refs).forEach(([k, { input, def }]) => {
          if (def.type === 'checkbox') o[k] = input.checked;
          else if (def.type === 'select' || def.type === 'text' || def.type === 'textarea') o[k] = input.value;
          else { const s = input.value.trim().replace(',', '.'); o[k] = s === '' ? null : (isNaN(Number(s)) ? NaN : Number(s)); }
        }); return o;
      },
      set(id, v) { const r = refs[id]; if (!r) return; if (r.def.type === 'checkbox') r.input.checked = !!v; else r.input.value = v === null || v === undefined ? '' : v; refresh(); },
      setAll(o) { Object.entries(o).forEach(([k, v]) => { const r = refs[k]; if (r) { if (r.def.type === 'checkbox') r.input.checked = !!v; else r.input.value = v === null ? '' : v; } }); refresh(); },
      clear() { Object.values(refs).forEach(({ input, def }) => { if (def.type === 'checkbox') return; if (def.type === 'select') return; input.value = ''; }); refresh(); }
    };
    function refresh() { const v = api.vals(); Object.values(refs).forEach(({ wrap, def }) => { wrap.style.display = def.show && !def.show(v) ? 'none' : ''; }); }
    el.addEventListener('input', refresh); el.addEventListener('change', refresh); refresh();
    return api;
  }

  /* ---------- barra de resultado ---------- */
  function showResult(out, rep) {
    out.innerHTML = '';
    const bar = $(`<div class="rbar"><span class="rbar-t">Exportar este resultado</span>
      <button class="btn sm xl" data-k="xlsx">${icon('table', 16)} Excel</button>
      <button class="btn sm wd" data-k="docx">${icon('scroll', 16)} Word</button>
      <button class="btn sm pd" data-k="pdf">${icon('book', 16)} PDF</button>
      <button class="btn sm ghost" data-k="print">Imprimir</button>
      <button class="btn sm ghost" data-k="nb">${icon('star', 16)} Al cuaderno</button></div>`);
    bar.addEventListener('click', async (e) => {
      const b = e.target.closest('button'); if (!b) return; const k = b.dataset.k;
      try {
        if (k === 'nb') { Report.store.add(rep) ? toast('Añadido al cuaderno ✦', 'ok') : toast('No se pudo guardar en el cuaderno', 'bad'); return; }
        if (k === 'print') return printReport(rep);
        b.disabled = true; toast('Preparando el documento…'); await Exporter[k]([rep]); toast('Documento listo ✦', 'ok'); b.disabled = false;
      } catch (err) { console.error(err); toast('Error al exportar: ' + err.message, 'bad'); bar.querySelectorAll('button').forEach((x) => (x.disabled = false)); }
    });
    out.appendChild(bar); out.appendChild(Report.toDOM(rep, 'dark'));
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function printReport(rep) {
    let host = document.getElementById('printArea'); if (!host) { host = $('<div id="printArea"></div>'); document.body.appendChild(host); }
    host.innerHTML = ''; host.appendChild(Report.toDOM(rep, 'paper')); document.body.classList.add('printing');
    setTimeout(() => { window.print(); document.body.classList.remove('printing'); host.innerHTML = ''; }, 450);
  }

  /* ---------- herramienta estándar: formulario + resultado ---------- */
  function tool(root, o) {
    root.innerHTML = '';
    const head = $(`<div class="tool-head"><h2>${esc(o.title)}</h2>${o.desc ? `<p>${o.desc}</p>` : ''}</div>`);
    root.appendChild(head);
    const grid = $('<div class="tool-grid"></div>'); const left = $('<section class="card input-card"></section>'); const out = $('<section class="out"></section>');
    const f = form(o.fields); left.appendChild(f.el);
    if (o.note) left.appendChild($(`<div class="note">${o.note}</div>`));
    const actions = $('<div class="actions"></div>');
    const go = $(`<button class="btn primary">${icon('eye', 18)} ${esc(o.runLabel || 'Calcular')}</button>`);
    const clr = $('<button class="btn ghost">Limpiar</button>');
    actions.append(go, clr); left.appendChild(actions);
    if (o.examples && o.examples.length) {
      const ex = $('<div class="examples"><div class="ex-t">Ejemplos sugeridos</div></div>');
      o.examples.forEach((e) => { const b = $(`<button class="chip">${esc(e.label)}</button>`); b.onclick = () => { f.clear(); f.setAll(e.values); run(); }; ex.appendChild(b); });
      left.appendChild(ex);
    }
    grid.append(left, out); root.appendChild(grid);
    out.appendChild($(`<div class="placeholder"><div class="ph-ico">${icon(o.icon || 'moon', 44)}</div><p>Completa los datos y pulsa <b>${esc(o.runLabel || 'Calcular')}</b>.<br>El resultado aparecerá aquí con su procedimiento paso a paso.</p></div>`));
    function run() {
      try { const rep = o.run(f.vals()); if (rep) showResult(out, rep); }
      catch (e) { out.innerHTML = `<div class="err"><span>✠</span><div><b>Revisa los datos</b><br>${esc(e.message)}</div></div>`; if (!(e instanceof UserError)) console.error(e); }
    }
    go.onclick = run; clr.onclick = () => { f.clear(); };
    left.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') run(); });
    return { form: f, run, out };
  }
  class UserError extends Error { }
  const fail = (m) => { throw new UserError(m); };

  return { $, icon, toast, form, tool, showResult, printReport, fail, UserError };
})();
