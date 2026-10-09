/* Módulo Cuaderno: reúne resultados guardados y exporta un documento completo */
(function () {
  function render(el) {
    el.innerHTML = '';
    const list = Report.store.all();
    el.appendChild(UI.$(`<div class="tool-head"><h2>Cuaderno de resultados</h2><p>Guarda varios resultados con «Al cuaderno» y exporta todo junto: un solo Excel con una hoja por ejercicio, un Word o un PDF completo con índice.</p></div>`));
    if (!list.length) { el.appendChild(UI.$(`<div class="card empty">${UI.icon('book', 40)}<p>El cuaderno está vacío.<br>Calcula algo y pulsa <b>Al cuaderno</b> para guardarlo aquí.</p></div>`)); return; }
    const bar = UI.$(`<div class="rbar"><span class="rbar-t">${list.length} resultado(s) guardados</span>
      <button class="btn sm xl" data-k="xlsx">Excel completo</button><button class="btn sm wd" data-k="docx">Word completo</button><button class="btn sm pd" data-k="pdf">PDF completo</button><button class="btn sm ghost" data-k="clear">Vaciar</button></div>`);
    bar.addEventListener('click', async (e) => {
      const b = e.target.closest('button'); if (!b) return; const k = b.dataset.k;
      if (k === 'clear') { if (confirm('¿Vaciar todo el cuaderno?')) { Report.store.clear(); render(el); } return; }
      const reps = [...list].reverse(); b.disabled = true; UI.toast('Preparando el documento…');
      try { await Exporter[k](reps, `Soto_Cuaderno_${new Date().toISOString().slice(0, 10)}.${k}`); UI.toast('Documento listo ✦', 'ok'); } catch (err) { console.error(err); UI.toast('Error: ' + err.message, 'bad'); }
      b.disabled = false;
    });
    el.appendChild(bar);
    const view = UI.$('<div class="nb-view"></div>');
    list.forEach((r) => {
      const it = UI.$(`<div class="nb-item"><div class="t"><b>${Report.esc(r.title)}</b><span>${Report.esc(r.module)} · ${Report.esc(r.date)}</span></div><button class="btn sm ghost" data-a="v">Ver</button><button class="btn sm ghost" data-a="d">Quitar</button></div>`);
      it.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.a === 'd') { Report.store.remove(r.id); render(el); } else { view.innerHTML = ''; view.appendChild(Report.toDOM(r, 'dark')); view.scrollIntoView({ behavior: 'smooth' }); } });
      el.appendChild(it);
    });
    el.appendChild(view);
  }
  App.register({ id: 'cuaderno', name: 'Cuaderno', icon: 'book', blurb: 'Reúne tus resultados y expórtalos juntos en Excel, Word o PDF.', tools: [{ id: 'cuaderno', name: 'Cuaderno', render }] });
})();
