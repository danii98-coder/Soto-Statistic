/* Aplicación: registro de módulos, navegación por hash y portada */
const App = (function () {
  const modules = [];
  const reg = { modules, register(m) { modules.push(m); } };
  let current = null;

  function parseHash() { const [m, t] = (location.hash.replace(/^#\/?/, '') || 'inicio').split('/'); return { m, t }; }

  function buildNav() {
    const nav = document.getElementById('nav'); nav.innerHTML = '';
    const items = [{ id: 'inicio', name: 'Inicio', icon: 'home' }, ...modules];
    items.forEach((m) => { const a = document.createElement('a'); a.href = '#' + m.id; a.dataset.id = m.id; a.innerHTML = `${UI.icon(m.icon, 20)}<span>${Report.esc(m.name)}</span>`; nav.appendChild(a); });
  }

  function renderHome(main) {
    main.innerHTML = `<section class="hero"><div class="hero-moon"></div>
      <p class="hero-kicker">Estadística Inferencial · Muestreo y pruebas de hipótesis</p>
      <h1>Soto Estadístico</h1>
      <p class="hero-sub">Resuelve ejercicios de muestreo y pruebas de hipótesis paso a paso, con las tablas, la campana y el álgebra. Exporta a Excel, Word y PDF.</p></section>
      <div class="cards">${modules.map((m) => `<a class="mcard" href="#${m.id}/${m.tools ? m.tools[0].id : ''}"><div class="mi">${UI.icon(m.icon, 30)}</div><h3>${Report.esc(m.name)}</h3><p>${Report.esc(m.blurb || '')}</p><div class="mtools">${(m.tools || []).map((t) => `<span>${Report.esc(t.name)}</span>`).join('')}</div></a>`).join('')}</div>
      <div class="how card"><h3>Cómo funciona</h3><ol>
        <li><b>Elige el módulo</b> en el menú y completa los datos. Los ejemplos sugeridos se cargan con un clic.</li>
        <li><b>Deja vacío lo que no sabes</b>: en tamaño de muestra, el programa despeja n, e, confianza, σ o N.</li>
        <li><b>Lee el procedimiento</b>: fórmula, sustitución, decisión (aceptar o rechazar H₀) y la campana con las regiones.</li>
        <li><b>Exporta</b> a Excel, Word o PDF, o guarda varios resultados en el <b>Cuaderno</b> para un documento completo.</li></ol></div>`;
  }

  function show() {
    const { m, t } = parseHash(); const main = document.getElementById('main'); window.scrollTo(0, 0);
    document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.id === m));
    document.body.classList.remove('nav-open');
    if (m === 'inicio' || !modules.find((x) => x.id === m)) { renderHome(main); return; }
    const mod = modules.find((x) => x.id === m); current = mod;
    const tool = mod.tools.find((x) => x.id === t) || mod.tools[0];
    main.innerHTML = `<div class="mod-head"><div class="mod-ico">${UI.icon(mod.icon, 28)}</div><div><h1>${Report.esc(mod.name)}</h1><p>${Report.esc(mod.blurb || '')}</p></div></div>
      ${mod.tools.length > 1 ? `<nav class="tabs">${mod.tools.map((x) => `<a href="#${mod.id}/${x.id}" class="${x === tool ? 'on' : ''}">${Report.esc(x.name)}</a>`).join('')}</nav>` : ''}<div id="tool"></div>`;
    tool.render(document.getElementById('tool'));
  }

  function init() {
    buildNav(); window.addEventListener('hashchange', show); show();
    document.getElementById('burger').onclick = () => document.body.classList.toggle('nav-open');
    document.getElementById('scrim').onclick = () => document.body.classList.remove('nav-open');
  }
  reg.init = init;
  return reg;
})();
document.addEventListener('DOMContentLoaded', () => App.init());
