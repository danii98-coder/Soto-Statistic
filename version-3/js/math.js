/* Soto Estadístico — núcleo matemático: distribuciones, estadísticos y conteo */
const Stat = (function () {
  /* ---------- funciones especiales ---------- */
  const G = 7, C = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  function lgamma(x) {
    if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
    x -= 1; let a = C[0]; const t = x + G + 0.5;
    for (let i = 1; i < G + 2; i++) a += C[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }
  // gamma incompleta regularizada P(a,x)
  function gammaP(a, x) {
    if (x <= 0) return 0;
    if (x < a + 1) {
      let ap = a, sum = 1 / a, del = sum;
      for (let n = 0; n < 500; n++) { ap++; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-15) break; }
      return sum * Math.exp(-x + a * Math.log(x) - lgamma(a));
    }
    let b = x + 1 - a, c = 1 / 1e-300, d = 1 / b, h = d;
    for (let i = 1; i < 500; i++) {
      const an = -i * (i - a); b += 2;
      d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
      c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-15) break;
    }
    return 1 - Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
  }
  function betacf(a, b, x) {
    let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < 1e-300) d = 1e-300; d = 1 / d; let h = d;
    for (let m = 1; m <= 500; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300;
      c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300;
      c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d; const del = d * c; h *= del;
      if (Math.abs(del - 1) < 1e-15) break;
    }
    return h;
  }
  // beta incompleta regularizada I_x(a,b)
  function betaI(x, a, b) {
    if (x <= 0) return 0; if (x >= 1) return 1;
    const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    if (x < (a + 1) / (a + b + 2)) return bt * betacf(a, b, x) / a;
    return 1 - bt * betacf(b, a, 1 - x) / b;
  }

  /* ---------- distribuciones ---------- */
  const normPdf = (z) => Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
  const normCdf = (z) => z === 0 ? 0.5 : (z > 0 ? 0.5 * (1 + gammaP(0.5, z * z / 2)) : 0.5 * (1 - gammaP(0.5, z * z / 2)));
  function normInv(p) {
    if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
    const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    let x;
    if (p < 0.02425) { const q = Math.sqrt(-2 * Math.log(p)); x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    else if (p > 1 - 0.02425) { const q = Math.sqrt(-2 * Math.log(1 - p)); x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    else { const q = p - 0.5, r = q * q; x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
    for (let i = 0; i < 2; i++) { const e = normCdf(x) - p, u = e * Math.sqrt(2 * Math.PI) * Math.exp(x * x / 2); x = x - u / (1 + x * u / 2); }
    return x;
  }
  const tPdf = (t, v) => Math.exp(lgamma((v + 1) / 2) - lgamma(v / 2)) / Math.sqrt(v * Math.PI) * Math.pow(1 + t * t / v, -(v + 1) / 2);
  function tCdf(t, v) {
    const x = v / (v + t * t), p = 0.5 * betaI(x, v / 2, 0.5);
    return t > 0 ? 1 - p : p;
  }
  const chiPdf = (x, k) => x <= 0 ? 0 : Math.exp((k / 2 - 1) * Math.log(x) - x / 2 - (k / 2) * Math.log(2) - lgamma(k / 2));
  const chiCdf = (x, k) => x <= 0 ? 0 : gammaP(k / 2, x / 2);
  function fPdf(x, d1, d2) {
    if (x <= 0) return 0;
    return Math.exp(0.5 * (d1 * Math.log(d1 * x) + d2 * Math.log(d2) - (d1 + d2) * Math.log(d1 * x + d2)) - Math.log(x) - (lgamma(d1 / 2) + lgamma(d2 / 2) - lgamma((d1 + d2) / 2)));
  }
  const fCdf = (x, d1, d2) => x <= 0 ? 0 : betaI(d1 * x / (d1 * x + d2), d1 / 2, d2 / 2);

  function invert(cdf, p, lo, hi) {
    while (cdf(hi) < p && hi < 1e12) hi *= 2;
    while (cdf(lo) > p && lo > -1e12) lo = lo < 0 ? lo * 2 : lo - 1;
    for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (cdf(m) < p) lo = m; else hi = m; if (hi - lo < 1e-13 * Math.max(1, Math.abs(m))) break; }
    return (lo + hi) / 2;
  }
  const tInv = (p, v) => p === 0.5 ? 0 : invert((x) => tCdf(x, v), p, -10, 10);
  const chiInv = (p, k) => invert((x) => chiCdf(x, k), p, 0, Math.max(10, k * 3));
  const fInv = (p, d1, d2) => invert((x) => fCdf(x, d1, d2), p, 0, 10);

  /* ---------- discretas ---------- */
  const lchoose = (n, k) => lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1);
  const binomPmf = (k, n, p) => (k < 0 || k > n) ? 0 : (p === 0 ? (k === 0 ? 1 : 0) : p === 1 ? (k === n ? 1 : 0) : Math.exp(lchoose(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p)));
  const poisPmf = (k, l) => k < 0 ? 0 : Math.exp(k * Math.log(l) - l - lgamma(k + 1));

  /* ---------- conteo (BigInt) ---------- */
  function fact(n) { let r = 1n; for (let i = 2n; i <= BigInt(n); i++) r *= i; return r; }
  function perm(n, r) { let x = 1n; for (let i = 0; i < r; i++) x *= BigInt(n - i); return x; }
  function comb(n, r) { if (r > n - r) r = n - r; let x = 1n; for (let i = 1; i <= r; i++) { x = x * BigInt(n - r + i) / BigInt(i); } return x; }

  /* ---------- descriptiva ---------- */
  const sum = (a) => a.reduce((s, x) => s + x, 0);
  const mean = (a) => sum(a) / a.length;
  const variance = (a, pop) => { const m = mean(a); return sum(a.map((x) => (x - m) ** 2)) / (a.length - (pop ? 0 : 1)); };
  const sd = (a, pop) => Math.sqrt(variance(a, pop));
  function quantile(a, q) { const s = [...a].sort((x, y) => x - y), pos = (s.length - 1) * q, b = Math.floor(pos), r = pos - b; return s[b + 1] !== undefined ? s[b] + r * (s[b + 1] - s[b]) : s[b]; }
  const median = (a) => quantile(a, 0.5);
  function mode(a) { const m = new Map(); a.forEach((x) => m.set(x, (m.get(x) || 0) + 1)); const mx = Math.max(...m.values()); return mx === 1 ? [] : [...m].filter(([, c]) => c === mx).map(([x]) => x); }
  function parseNums(txt) { return (txt || '').split(/[\s;,\n\t]+/).filter((t) => t !== '').map(Number).filter((x) => !isNaN(x) && isFinite(x)); }

  return { lgamma, gammaP, betaI, normPdf, normCdf, normInv, tPdf, tCdf, tInv, chiPdf, chiCdf, chiInv, fPdf, fCdf, fInv,
    binomPmf, poisPmf, fact, perm, comb, sum, mean, variance, sd, quantile, median, mode, parseNums };
})();
if (typeof module !== 'undefined') module.exports = Stat;
