/* Gráficos en canvas: campanas de aceptación/rechazo, histogramas, barras, dispersión, intervalos */
const Charts = (function () {
  const THEMES = {
    dark: { bg: '#14111f', fg: '#e6e0f2', mute: '#8f87a8', grid: 'rgba(160,140,220,.13)', axis: '#6d6590', curve: '#c3b0ff', ra: 'rgba(128,118,214,.30)', raLine: '#9a8cf0', rr: 'rgba(184,60,78,.62)', rrLine: '#d4556a', mark: '#f0c75e', bar: '#7f6fd0', bar2: '#b83c4e', line: '#f0c75e' },
    paper: { bg: '#ffffff', fg: '#25203a', mute: '#6b6580', grid: 'rgba(60,40,110,.10)', axis: '#8a84a0', curve: '#3d2c7a', ra: 'rgba(110,98,200,.22)', raLine: '#5b4bb5', rr: 'rgba(176,48,70,.50)', rrLine: '#a82a42', mark: '#b7791f', bar: '#6657c4', bar2: '#a82a42', line: '#b7791f' }
  };
  const fmt = (x, d = 3) => (Math.abs(x) >= 1e5 || (Math.abs(x) < 1e-3 && x !== 0)) ? x.toExponential(2) : (+x.toFixed(d)).toString();

  function setup(canvas, w, h, theme) {
    const dpr = canvas._dpr || window.devicePixelRatio || 1;
    canvas.width = w * dpr; canvas.height = h * dpr; canvas.style.width = '100%'; canvas.style.maxWidth = w + 'px'; canvas.style.aspectRatio = w + '/' + h;
    const c = canvas.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = theme.bg; c.fillRect(0, 0, w, h);
    return c;
  }
  function title(c, t, W, th) {
    if (!t) return; c.fillStyle = th.fg; c.font = '600 15px Inter, sans-serif'; c.textAlign = 'center'; c.fillText(t, W / 2, 24);
  }
  function niceTicks(lo, hi, n = 6) {
    const span = hi - lo, raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag;
    const step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag, out = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  }

  function pdfOf(s) {
    if (s.dist === 'z') return (x) => Stat.normPdf(x);
    if (s.dist === 't') return (x) => Stat.tPdf(x, s.df);
    if (s.dist === 'chi') return (x) => Stat.chiPdf(x, s.df);
    return (x) => Stat.fPdf(x, s.df, s.df2);
  }
  const SYM = { z: 'Z', t: 't', chi: 'χ²', f: 'F' };

  function dist(c, s, W, H, th) {
    const m = { l: 46, r: 24, t: 44, b: 52 }, pw = W - m.l - m.r, ph = H - m.t - m.b;
    const pdf = pdfOf(s);
    let lo, hi;
    const sym = s.dist === 'z' || s.dist === 't';
    const qh = sym ? 8 : (s.dist === 'chi' ? Stat.chiInv(0.995, s.df) : Stat.fInv(0.99, s.df, s.df2)) * 1.5;
    s = Object.assign({}, s, { marks: (s.marks || []).map((k) => Object.assign({}, k, { x: sym ? Math.max(-qh, Math.min(qh, k.x)) : Math.min(qh, k.x) })) });
    const xs = [...s.marks.map((k) => k.x), ...(s.rr || []).flat().filter(isFinite), ...(s.ra || []).filter(isFinite)];
    if (sym) { const ext = Math.max(3.8, ...xs.map(Math.abs)) + 0.4; lo = -ext; hi = ext; }
    else {
      lo = 0;
      const q = s.dist === 'chi' ? Stat.chiInv(0.995, s.df) : Stat.fInv(0.99, s.df, s.df2);
      hi = Math.max(q, ...xs.filter(isFinite)) * 1.12;
    }
    let ymax = 0; const N = 400, pts = [];
    for (let i = 0; i <= N; i++) { const x = lo + (hi - lo) * i / N, y = pdf(x); pts.push([x, y]); if (isFinite(y)) ymax = Math.max(ymax, Math.min(y, 5)); }
    ymax *= 1.18;
    const X = (x) => m.l + (x - lo) / (hi - lo) * pw, Y = (y) => m.t + ph - y / ymax * ph;
    title(c, s.title, W, th);
    // rejilla
    c.strokeStyle = th.grid; c.lineWidth = 1;
    niceTicks(lo, hi, 8).forEach((v) => { c.beginPath(); c.moveTo(X(v), m.t); c.lineTo(X(v), m.t + ph); c.stroke(); });
    // regiones
    const fillRegion = (a, b, col) => {
      a = Math.max(a, lo); b = Math.min(b, hi); if (!(b > a)) return;
      c.beginPath(); c.moveTo(X(a), Y(0));
      pts.forEach(([x, y]) => { if (x >= a && x <= b) c.lineTo(X(x), Y(Math.min(y, ymax))); });
      c.lineTo(X(b), Y(0)); c.closePath(); c.fillStyle = col; c.fill();
    };
    if (s.ra) fillRegion(s.ra[0], s.ra[1], th.ra);
    (s.rr || []).forEach((r) => fillRegion(r[0], r[1], th.rr));
    // curva
    c.beginPath(); pts.forEach(([x, y], i) => { const px = X(x), py = Y(Math.min(y, ymax)); i ? c.lineTo(px, py) : c.moveTo(px, py); });
    c.strokeStyle = th.curve; c.lineWidth = 2.4; c.stroke();
    // eje
    c.strokeStyle = th.axis; c.lineWidth = 1.2; c.beginPath(); c.moveTo(m.l, Y(0)); c.lineTo(m.l + pw, Y(0)); c.stroke();
    c.fillStyle = th.mute; c.font = '12px Inter, sans-serif'; c.textAlign = 'center';
    niceTicks(lo, hi, 8).forEach((v) => c.fillText(fmt(v, 2), X(v), Y(0) + 17));
    c.fillText(s.xlabel || SYM[s.dist], m.l + pw / 2, H - 10);
    // etiquetas de región
    c.font = '600 12.5px Inter, sans-serif';
    if (s.raLabel && s.ra) { const a = Math.max(s.ra[0], lo), b = Math.min(s.ra[1], hi); c.fillStyle = th.raLine; c.textAlign = 'center'; c.fillText(s.raLabel, X((a + b) / 2), Y(ymax * 0.36)); c.fillStyle = th.mute; c.font = '11.5px Inter, sans-serif'; c.fillText('Región de aceptación', X((a + b) / 2), Y(ymax * 0.36) + 17); }
    (s.rr || []).forEach((r) => {
      const a = Math.max(r[0], lo), b = Math.min(r[1], hi); if (!(b > a)) return;
      const cx = (a + b) / 2; c.fillStyle = th.rrLine; c.font = '600 12px Inter, sans-serif'; c.textAlign = 'center';
      const left = cx < (lo + hi) / 2 && s.dist !== 'chi' && s.dist !== 'f';
      const px = Math.min(Math.max(X(cx), m.l + 30), m.l + pw - 30);
      c.fillText(s.rrLabel || 'R.R.', px, Y(0) - 10 - (b - a) / (hi - lo) * 0);
    });
    // líneas críticas
    (s.crit || []).forEach((v) => {
      if (!isFinite(v)) return; c.setLineDash([5, 4]); c.strokeStyle = th.rrLine; c.lineWidth = 1.6; c.beginPath(); c.moveTo(X(v), Y(0)); c.lineTo(X(v), Y(pdf(v) * 1)); c.stroke(); c.setLineDash([]);
      c.fillStyle = th.rrLine; c.font = '600 12px Inter, sans-serif'; c.textAlign = 'center'; c.fillText(fmt(v, 3), X(v), Y(0) + 33);
    });
    // marcas (estadístico calculado)
    (s.marks || []).forEach((k, i) => {
      c.strokeStyle = th.mark; c.lineWidth = 2.2; c.beginPath(); c.moveTo(X(k.x), Y(0) + 4); c.lineTo(X(k.x), m.t + 16 + i * 0); c.stroke();
      c.fillStyle = th.mark; c.beginPath(); c.arc(X(k.x), Y(0), 5, 0, 7); c.fill();
      c.font = '600 12.5px Inter, sans-serif'; c.textAlign = X(k.x) > W - 110 ? 'right' : 'left';
      c.fillText(k.label, X(k.x) + (c.textAlign === 'left' ? 8 : -8), m.t + 14 + i * 16);
    });
    // leyenda
    const lg = []; if (s.ra) lg.push([th.ra, th.raLine, s.raName || 'Aceptación']); if ((s.rr || []).length) lg.push([th.rr, th.rrLine, s.rrName || 'Rechazo']);
    let lx = m.l + 4; c.textAlign = 'left'; c.font = '12px Inter, sans-serif';
    lg.forEach(([f, st, t]) => { c.fillStyle = f; c.fillRect(lx, H - 30 + 0, 0, 0); lx += 0; });
  }

  function hist(c, s, W, H, th) {
    const m = { l: 56, r: 24, t: 44, b: 64 }, pw = W - m.l - m.r, ph = H - m.t - m.b, B = s.bins;
    const ymax = Math.max(...B.map((b) => b.count), 1) * 1.15, lo = B[0].lo, hi = B[B.length - 1].hi;
    const X = (x) => m.l + (x - lo) / (hi - lo) * pw, Y = (y) => m.t + ph - y / ymax * ph;
    title(c, s.title, W, th);
    c.strokeStyle = th.grid; niceTicks(0, ymax, 5).forEach((v) => { c.beginPath(); c.moveTo(m.l, Y(v)); c.lineTo(m.l + pw, Y(v)); c.stroke(); c.fillStyle = th.mute; c.font = '12px Inter'; c.textAlign = 'right'; c.fillText(fmt(v, 0), m.l - 8, Y(v) + 4); });
    B.forEach((b) => {
      c.fillStyle = th.bar; c.globalAlpha = 0.85; c.fillRect(X(b.lo) + 1, Y(b.count), X(b.hi) - X(b.lo) - 2, Y(0) - Y(b.count)); c.globalAlpha = 1;
      c.strokeStyle = th.raLine; c.strokeRect(X(b.lo) + 1, Y(b.count), X(b.hi) - X(b.lo) - 2, Y(0) - Y(b.count));
      c.fillStyle = th.fg; c.font = '600 12px Inter'; c.textAlign = 'center'; c.fillText(b.count, (X(b.lo) + X(b.hi)) / 2, Y(b.count) - 6);
      c.fillStyle = th.mute; c.font = '11px Inter'; c.fillText(fmt((b.lo + b.hi) / 2, 2), (X(b.lo) + X(b.hi)) / 2, Y(0) + 16);
    });
    if (s.normal) {
      const n = s.normal, w = (hi - lo) / B.length, tot = s.total;
      c.beginPath(); for (let i = 0; i <= 200; i++) { const x = lo + (hi - lo) * i / 200, y = Stat.normPdf((x - n.mean) / n.sd) / n.sd * tot * w; i ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y)); }
      c.strokeStyle = th.line; c.lineWidth = 2.2; c.stroke();
    }
    c.fillStyle = th.mute; c.font = '12px Inter'; c.textAlign = 'center'; c.fillText(s.xlabel || 'Clases (marca de clase)', m.l + pw / 2, H - 12);
    c.save(); c.translate(14, m.t + ph / 2); c.rotate(-Math.PI / 2); c.fillText('Frecuencia', 0, 0); c.restore();
  }

  function bars(c, s, W, H, th) {
    const m = { l: 56, r: 24, t: 44, b: 60 }, pw = W - m.l - m.r, ph = H - m.t - m.b, n = s.values.length;
    const ymax = Math.max(...s.values, 1e-9) * 1.18, bw = pw / n;
    const Y = (y) => m.t + ph - y / ymax * ph;
    title(c, s.title, W, th);
    c.strokeStyle = th.grid; niceTicks(0, ymax, 5).forEach((v) => { c.beginPath(); c.moveTo(m.l, Y(v)); c.lineTo(m.l + pw, Y(v)); c.stroke(); c.fillStyle = th.mute; c.font = '12px Inter'; c.textAlign = 'right'; c.fillText(fmt(v, v < 1 ? 3 : 0), m.l - 8, Y(v) + 4); });
    const every = Math.ceil(n / 24);
    s.values.forEach((v, i) => {
      const hl = (s.highlight || []).includes(i);
      c.fillStyle = hl ? th.bar2 : th.bar; c.globalAlpha = 0.88; c.fillRect(m.l + i * bw + bw * 0.12, Y(v), bw * 0.76, Y(0) - Y(v)); c.globalAlpha = 1;
      if (n <= 16) { c.fillStyle = th.fg; c.font = '600 11.5px Inter'; c.textAlign = 'center'; c.fillText(s.fmtVal ? s.fmtVal(v) : fmt(v, v < 1 ? 3 : 0), m.l + i * bw + bw / 2, Y(v) - 6); }
      if (i % every === 0) { c.fillStyle = th.mute; c.font = '11.5px Inter'; c.textAlign = 'center'; c.fillText(String(s.labels[i]).slice(0, 14), m.l + i * bw + bw / 2, Y(0) + 16); }
    });
    c.strokeStyle = th.axis; c.beginPath(); c.moveTo(m.l, Y(0)); c.lineTo(m.l + pw, Y(0)); c.stroke();
    c.fillStyle = th.mute; c.font = '12px Inter'; c.textAlign = 'center'; if (s.xlabel) c.fillText(s.xlabel, m.l + pw / 2, H - 10);
    if (s.ylabel) { c.save(); c.translate(14, m.t + ph / 2); c.rotate(-Math.PI / 2); c.fillText(s.ylabel, 0, 0); c.restore(); }
  }

  function scatter(c, s, W, H, th) {
    const m = { l: 60, r: 28, t: 44, b: 56 }, pw = W - m.l - m.r, ph = H - m.t - m.b;
    const padx = (Math.max(...s.xs) - Math.min(...s.xs) || 1) * 0.08, pady = (Math.max(...s.ys) - Math.min(...s.ys) || 1) * 0.12;
    const x0 = Math.min(...s.xs) - padx, x1 = Math.max(...s.xs) + padx, y0 = Math.min(...s.ys) - pady, y1 = Math.max(...s.ys) + pady;
    const X = (x) => m.l + (x - x0) / (x1 - x0) * pw, Y = (y) => m.t + ph - (y - y0) / (y1 - y0) * ph;
    title(c, s.title, W, th);
    c.strokeStyle = th.grid; c.font = '12px Inter'; c.fillStyle = th.mute;
    niceTicks(y0, y1, 5).forEach((v) => { c.beginPath(); c.moveTo(m.l, Y(v)); c.lineTo(m.l + pw, Y(v)); c.stroke(); c.textAlign = 'right'; c.fillText(fmt(v, 2), m.l - 8, Y(v) + 4); });
    niceTicks(x0, x1, 7).forEach((v) => { c.beginPath(); c.moveTo(X(v), m.t); c.lineTo(X(v), m.t + ph); c.stroke(); c.textAlign = 'center'; c.fillText(fmt(v, 2), X(v), m.t + ph + 18); });
    if (s.b !== undefined) { c.beginPath(); c.moveTo(X(x0), Y(s.a + s.b * x0)); c.lineTo(X(x1), Y(s.a + s.b * x1)); c.strokeStyle = th.line; c.lineWidth = 2.4; c.stroke(); }
    s.xs.forEach((x, i) => { c.beginPath(); c.arc(X(x), Y(s.ys[i]), 5, 0, 7); c.fillStyle = th.bar; c.fill(); c.strokeStyle = th.raLine; c.lineWidth = 1.2; c.stroke(); });
    c.fillStyle = th.mute; c.textAlign = 'center'; c.fillText(s.xlabel || 'X', m.l + pw / 2, H - 10);
    c.save(); c.translate(14, m.t + ph / 2); c.rotate(-Math.PI / 2); c.fillText(s.ylabel || 'Y', 0, 0); c.restore();
    if (s.eq) { c.fillStyle = th.line; c.font = '600 13px Inter'; c.textAlign = 'left'; c.fillText(s.eq, m.l + 10, m.t + 18); }
  }

  function ci(c, s, W, H, th) {
    const m = { l: 40, r: 40 }, pw = W - m.l - m.r, cy = H / 2 + 10;
    const span = s.hi - s.lo || 1, lo = s.lo - span * 0.35, hi = s.hi + span * 0.35;
    const X = (x) => m.l + (x - lo) / (hi - lo) * pw;
    title(c, s.title, W, th);
    c.strokeStyle = th.axis; c.lineWidth = 1.4; c.beginPath(); c.moveTo(m.l, cy + 34); c.lineTo(m.l + pw, cy + 34); c.stroke();
    c.fillStyle = th.mute; c.font = '12px Inter'; c.textAlign = 'center'; niceTicks(lo, hi, 8).forEach((v) => { c.beginPath(); c.moveTo(X(v), cy + 30); c.lineTo(X(v), cy + 38); c.stroke(); c.fillText(fmt(v, 3), X(v), cy + 54); });
    c.fillStyle = th.ra; c.fillRect(X(s.lo), cy - 16, X(s.hi) - X(s.lo), 32); c.strokeStyle = th.raLine; c.lineWidth = 2; c.strokeRect(X(s.lo), cy - 16, X(s.hi) - X(s.lo), 32);
    c.fillStyle = th.mark; c.beginPath(); c.arc(X(s.est), cy, 7, 0, 7); c.fill();
    c.fillStyle = th.fg; c.font = '600 13px Inter'; c.textAlign = 'center';
    c.fillText(fmt(s.lo, 4), X(s.lo), cy - 26); c.fillText(fmt(s.hi, 4), X(s.hi), cy - 26);
    c.fillStyle = th.mark; c.fillText(s.estLabel + ' = ' + fmt(s.est, 4), X(s.est), cy + 74 > H ? cy + 70 : cy + 76);
    (s.extra || []).forEach((e) => { c.fillStyle = th.rrLine; c.beginPath(); c.arc(X(e.x), cy, 5, 0, 7); c.fill(); c.fillText(e.label, X(e.x), cy + 24); });
  }

  const KINDS = { dist, hist, bars, scatter, ci };
  const size = (spec) => [spec.w || 720, spec.h || (spec.kind === 'ci' ? 210 : 360)];
  function render(spec, canvas, themeName) {
    const th = THEMES[themeName || 'dark'], [W, H] = size(spec);
    const c = setup(canvas, W, H, th); KINDS[spec.kind](c, spec, W, H, th);
  }
  function toDataURL(spec, themeName) {
    const cv = document.createElement('canvas'); cv._dpr = 2; render(spec, cv, themeName || 'paper'); return cv.toDataURL('image/png');
  }
  return { render, toDataURL, THEMES, size };
})();
