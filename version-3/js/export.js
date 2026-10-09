/* Exportación: Excel (ExcelJS), Word (docx) y PDF (html2pdf) a partir de los reportes */
const Exporter = (function () {
  const C = { ink: '2A1B4A', purple: '3D2C7A', lilac: 'E8E2F8', pale: 'F6F3FC', red: '8B2E3C', gold: 'B7791F', goldBg: 'FBF1D9' };
  const KIND = { ok: { bg: 'E3F1EA', fg: '1F5C3F' }, bad: { bg: 'F8E1E4', fg: '8B1E34' }, info: { bg: 'EEE9FB', fg: '3D2C7A' } };

  function download(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '_').replace(/^_|_$/g, '').slice(0, 50) || 'reporte';
  const stamp = () => new Date().toISOString().slice(0, 10);
  const dataToBytes = (url) => { const b = atob(url.split(',')[1]), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  const numOrStr = (v) => (typeof v === 'string' && /^[−-]?\d+(\.\d+)?$/.test(v.trim())) ? Number(v.replace('−', '-')) : v;

  /* ===== álgebra como imagen (para Excel y Word) ===== */
  const texCache = new Map();
  async function texImg(tex) {
    if (texCache.has(tex)) return texCache.get(tex);
    const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:-9000px;top:0;';
    const el = document.createElement('div'); el.style.cssText = 'display:inline-block;padding:4px 8px;background:#fff;color:#25203a;font-size:20px;'; el.innerHTML = Report.texHTML(tex); host.appendChild(el); document.body.appendChild(host);
    try {
      const canvas = await html2pdf().set({ margin: 0, html2canvas: { scale: 3, backgroundColor: '#ffffff' } }).from(el).toCanvas().get('canvas');
      const r = { url: canvas.toDataURL('image/png'), w: canvas.width / 3, h: canvas.height / 3 }; texCache.set(tex, r); return r;
    } finally { host.remove(); }
  }
  async function prepTex(reports) {
    for (const r of reports) for (const b of r.blocks) if (b.t === 'step') for (const l of b.lines) if (l && l.tex !== undefined) await texImg(l.tex);
  }
  const plain = (l) => (l && l.tex !== undefined ? l.tex : l);

  /* =================== EXCEL =================== */
  async function xlsx(reports, filename) {
    await prepTex(reports);
    const wb = new ExcelJS.Workbook(); wb.creator = 'Soto Estadístico'; wb.created = new Date();
    const used = new Set();
    const sheetName = (t) => { let n = t.replace(/[\\\/?*\[\]:]/g, ' ').slice(0, 28).trim() || 'Hoja', k = n, i = 2; while (used.has(k)) k = n.slice(0, 26) + ' ' + i++; used.add(k); return k; };
    if (reports.length > 1) {
      const ws = wb.addWorksheet('Índice', { views: [{ showGridLines: false }] });
      ws.columns = [{ width: 6 }, { width: 46 }, { width: 28 }, { width: 24 }];
      ws.mergeCells('A1:D1'); const t = ws.getCell('A1'); t.value = '✦ GRIMORIO ESTADÍSTICO — Cuaderno de resultados'; t.font = { name: 'Cambria', size: 18, bold: true, color: { argb: 'FFFFFFFF' } }; t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.ink } }; t.alignment = { vertical: 'middle', indent: 1 }; ws.getRow(1).height = 42;
      ws.addRow([]); const hr = ws.addRow(['N.º', 'Ejercicio / Resultado', 'Módulo', 'Fecha']);
      hr.eachCell((c) => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.purple } }; });
      reports.forEach((r, i) => { const row = ws.addRow([i + 1, r.title, r.module, r.date]); if (i % 2) row.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.pale } }; }); });
    }
    for (const rep of reports) {
      const ws = wb.addWorksheet(sheetName(rep.title), { views: [{ showGridLines: false }], pageSetup: { orientation: 'portrait', fitToPage: true, fitToHeight: 0 } });
      ws.columns = [{ width: 20 }, ...Array(9).fill({ width: 15 })];
      const LAST = 'J'; let row = 1;
      const merge = (r, a = 'A', b = LAST) => { ws.mergeCells(`${a}${r}:${b}${r}`); return ws.getCell(`${a}${r}`); };
      const fill = (c, argb) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + argb } }; };
      const lines = (txt, per = 125) => String(txt).split('\n').reduce((s, l) => s + Math.max(1, Math.ceil(l.length / per)), 0);
      let c = merge(row); c.value = '✦  ' + rep.title; c.font = { name: 'Cambria', size: 18, bold: true, color: { argb: 'FFFFFFFF' } }; fill(c, C.ink); c.alignment = { vertical: 'middle', indent: 1, wrapText: true }; ws.getRow(row).height = 40; row++;
      c = merge(row); c.value = `${rep.module}  ·  ${rep.date}${rep.subtitle ? '  ·  ' + rep.subtitle : ''}`; c.font = { italic: true, size: 10, color: { argb: 'FFD8D0F0' } }; fill(c, C.purple); c.alignment = { indent: 1, vertical: 'middle' }; ws.getRow(row).height = 20; row += 2;
      for (const b of rep.blocks) {
        if (b.t === 'h') {
          row++; c = merge(row); c.value = '✦  ' + b.text; c.font = { name: 'Cambria', size: 13, bold: true, color: { argb: 'FF' + C.purple } }; fill(c, C.lilac);
          c.border = { left: { style: 'thick', color: { argb: 'FF' + C.red } } }; c.alignment = { vertical: 'middle', indent: 1 }; ws.getRow(row).height = 24; row++;
        } else if (b.t === 'p') {
          c = merge(row); c.value = b.text; c.alignment = { wrapText: true, vertical: 'top', indent: 1 }; ws.getRow(row).height = 16 * lines(b.text); row++;
        } else if (b.t === 'eq') {
          c = merge(row); c.value = b.text; c.font = { name: 'Cambria Math', italic: true, size: 12, color: { argb: 'FF' + C.ink } }; fill(c, C.pale);
          c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; ws.getRow(row).height = 22 * lines(b.text, 100); row++;
        } else if (b.t === 'step') {
          const n = ws.getCell(`A${row}`); n.value = b.n; n.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }; fill(n, C.purple); n.alignment = { horizontal: 'center', vertical: 'middle' };
          c = merge(row, 'B', LAST); c.value = b.title; c.font = { bold: true, size: 11.5, color: { argb: 'FF' + C.purple } }; fill(c, C.lilac); c.alignment = { vertical: 'middle', indent: 1 }; ws.getRow(row).height = 22; const top = row; row++;
          b.lines.forEach((l) => {
            if (l && l.tex !== undefined) { const im = texCache.get(l.tex), k = 0.8, id = wb.addImage({ base64: im.url, extension: 'png' }); merge(row, 'B', LAST); ws.addImage(id, { tl: { col: 1.15, row: row - 1 + 0.08 }, ext: { width: im.w * k, height: im.h * k } }); ws.getRow(row).height = im.h * k * 0.75 + 8; row++; return; }
            const cc = merge(row, 'B', LAST); cc.value = l; cc.alignment = { wrapText: true, vertical: 'top', indent: 2 }; ws.getRow(row).height = 16 * lines(l, 105); row++;
          });
          ws.mergeCells(`A${top + 1}:A${Math.max(top + 1, row - 1)}`); fill(ws.getCell(`A${top + 1}`), C.pale); row++;
        } else if (b.t === 'kv') {
          if (b.caption) { c = merge(row); c.value = b.caption; c.font = { bold: true, color: { argb: 'FF' + C.red } }; row++; }
          b.rows.forEach(([k, v], i) => {
            ws.mergeCells(`A${row}:D${row}`); ws.mergeCells(`E${row}:H${row}`);
            const a = ws.getCell(`A${row}`), d = ws.getCell(`E${row}`); a.value = k; d.value = numOrStr(v); a.font = { bold: true, color: { argb: 'FF' + C.purple } }; fill(a, C.pale); d.alignment = { horizontal: 'left', indent: 1 };
            [a, d].forEach((x) => { x.border = { bottom: { style: 'hair', color: { argb: 'FFB9B0D8' } } }; }); a.alignment = { indent: 1 }; row++;
          }); row++;
        } else if (b.t === 'table') {
          if (b.caption) { c = merge(row); c.value = b.caption; c.font = { bold: true, color: { argb: 'FF' + C.red } }; row++; }
          const hr = ws.getRow(row); b.head.forEach((h, i) => { const x = hr.getCell(i + 1); x.value = h; x.font = { bold: true, color: { argb: 'FFFFFFFF' } }; fill(x, C.purple); x.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; }); hr.height = 24; row++;
          const hl = (b.opts && b.opts.highlightRow) || [];
          b.rows.forEach((r, ri) => { const rr = ws.getRow(row); r.forEach((v, i) => { const x = rr.getCell(i + 1); x.value = numOrStr(v); x.alignment = { horizontal: i === 0 && typeof x.value === 'string' ? 'left' : 'center' }; x.border = { bottom: { style: 'hair', color: { argb: 'FFB9B0D8' } } }; if (hl.includes(ri)) { fill(x, C.goldBg); x.font = { bold: true }; } else if (ri % 2) fill(x, C.pale); }); row++; });
          row++;
        } else if (b.t === 'chart') {
          const url = Charts.toDataURL(b.spec, 'paper'), [W, H] = Charts.size(b.spec);
          const wpx = 700, hpx = Math.round(wpx * H / W), id = wb.addImage({ base64: url, extension: 'png' });
          ws.addImage(id, { tl: { col: 0.2, row: row - 1 + 0.1 }, ext: { width: wpx, height: hpx } }); row += Math.ceil(hpx / 20) + 1;
          if (b.caption) { c = merge(row); c.value = b.caption; c.font = { italic: true, size: 10, color: { argb: 'FF6B6580' } }; c.alignment = { horizontal: 'center' }; row++; } row++;
        } else if (b.t === 'result') {
          ws.mergeCells(`A${row}:E${row}`); ws.mergeCells(`F${row}:J${row}`); const a = ws.getCell(`A${row}`), d = ws.getCell(`F${row}`);
          a.value = b.label; a.font = { bold: true, size: 12, color: { argb: 'FF' + C.ink } }; d.value = numOrStr(b.value); d.font = { bold: true, size: 16, color: { argb: 'FF' + C.red } };
          fill(a, C.goldBg); fill(d, C.goldBg); a.alignment = { vertical: 'middle', indent: 1, wrapText: true }; d.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          a.border = d.border = { top: { style: 'thin', color: { argb: 'FF' + C.gold } }, bottom: { style: 'thin', color: { argb: 'FF' + C.gold } } };
          ws.getRow(row).height = Math.max(32, 18 * lines(b.value, 40)); row += 2;
        } else if (b.t === 'concl') {
          const k = KIND[b.kind] || KIND.info; c = merge(row); c.value = (b.kind === 'ok' ? '☾  ' : b.kind === 'bad' ? '✠  ' : '✦  ') + b.text; c.font = { bold: true, size: 11.5, color: { argb: 'FF' + k.fg } }; fill(c, k.bg);
          c.alignment = { wrapText: true, vertical: 'middle', indent: 1 }; c.border = { left: { style: 'thick', color: { argb: 'FF' + k.fg } } }; ws.getRow(row).height = Math.max(30, 18 * lines(b.text, 110)); row += 2;
        }
      }
    }
    const buf = await wb.xlsx.writeBuffer();
    download(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename || `Soto_${slug(reports[0].title)}_${stamp()}.xlsx`);
  }

  /* =================== WORD =================== */
  async function docxExport(reports, filename) {
    await prepTex(reports);
    const d = docx, { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, AlignmentType, BorderStyle, ImageRun, Header, Footer, PageNumber, PageBreak } = d;
    const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    const shade = (fill) => ({ type: ShadingType.CLEAR, color: 'auto', fill });
    const hair = { style: BorderStyle.SINGLE, size: 4, color: 'C9C1E3' };
    const run = (text, o = {}) => new TextRun({ text, font: 'Calibri', size: 22, ...o });
    const para = (text, o = {}) => new Paragraph({ children: String(text).split('\n').flatMap((l, i) => [i ? new TextRun({ break: 1 }) : null, run(l, o.run)].filter(Boolean)), spacing: { after: 100 }, ...(o.p || {}) });
    const cell = (children, o = {}) => new TableCell({ children: [].concat(children), margins: { top: 70, bottom: 70, left: 110, right: 110 }, ...o });
    const TW = 9700, full = (rows, extra = {}, cw) => new Table({ width: { size: TW, type: WidthType.DXA }, columnWidths: cw, layout: d.TableLayoutType ? d.TableLayoutType.FIXED : undefined, rows, ...extra });
    const texPara = (tex) => { const im = texCache.get(tex), k = Math.min(0.78, 520 / im.w); return new Paragraph({ spacing: { after: 40 }, children: [new ImageRun({ type: 'png', data: dataToBytes(im.url), transformation: { width: Math.round(im.w * k), height: Math.round(im.h * k) } })] }); };
    const children = [];
    reports.forEach((rep, ri) => {
      if (ri) children.push(new Paragraph({ children: [new PageBreak()] }));
      children.push(new Paragraph({ children: [run(rep.module.toUpperCase(), { size: 18, color: C.red, bold: true, characterSpacing: 40 })], spacing: { after: 40 } }));
      children.push(new Paragraph({ children: [run(rep.title, { font: 'Cambria', size: 40, bold: true, color: C.ink })], spacing: { after: 60 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: C.purple, space: 4 } } }));
      if (rep.subtitle) children.push(para(rep.subtitle, { run: { italics: true, color: '6B6580' } }));
      children.push(para(rep.date, { run: { size: 18, color: '8A84A0' } }));
      for (const b of rep.blocks) {
        if (b.t === 'h') children.push(new Paragraph({ children: [run('✦  ' + b.text, { font: 'Cambria', size: 28, bold: true, color: C.purple })], spacing: { before: 280, after: 120 }, shading: shade(C.lilac), border: { left: { style: BorderStyle.SINGLE, size: 24, color: C.red, space: 6 } }, keepNext: true }));
        else if (b.t === 'p') children.push(para(b.text));
        else if (b.t === 'eq') children.push(new Paragraph({ children: b.text.split('\n').flatMap((l, i) => [i ? new TextRun({ break: 1 }) : null, new TextRun({ text: l, font: 'Cambria Math', italics: true, size: 24, color: C.ink })].filter(Boolean)), alignment: AlignmentType.CENTER, shading: shade(C.pale), spacing: { before: 80, after: 140 } }));
        else if (b.t === 'step') {
          children.push(full([new TableRow({ cantSplit: true, children: [
            cell(new Paragraph({ alignment: AlignmentType.CENTER, children: [run(String(b.n), { bold: true, size: 30, color: 'FFFFFF', font: 'Cambria' })] }), { width: { size: 700, type: WidthType.DXA }, shading: shade(C.purple), verticalAlign: 'center' }),
            cell([new Paragraph({ children: [run(b.title, { bold: true, color: C.purple, size: 23 })], spacing: { after: 60 } }), ...b.lines.map((l) => (l && l.tex !== undefined) ? texPara(l.tex) : para(l, { p: { spacing: { after: 50 } } }))], { shading: shade('FBFAFE') })
          ] })], { borders: { top: hair, bottom: hair, left: none, right: none, insideHorizontal: none, insideVertical: none } }, [700, 9000]));
          children.push(new Paragraph({ spacing: { after: 100 } }));
        } else if (b.t === 'kv') {
          if (b.caption) children.push(para(b.caption, { run: { bold: true, color: C.red } }));
          children.push(full(b.rows.map(([k, v]) => new TableRow({ cantSplit: true, children: [cell(para(k, { run: { bold: true, color: C.purple }, p: { spacing: { after: 0 } } }), { width: { size: 4000, type: WidthType.DXA }, shading: shade(C.pale) }), cell(para(v, { p: { spacing: { after: 0 } } }))] })), { borders: { top: hair, bottom: hair, left: hair, right: hair, insideHorizontal: hair, insideVertical: hair } }, [4000, 5700]));
          children.push(new Paragraph({ spacing: { after: 120 } }));
        } else if (b.t === 'table') {
          if (b.caption) children.push(para(b.caption, { run: { bold: true, color: C.red } }));
          const hl = (b.opts && b.opts.highlightRow) || [];
          const rows = [new TableRow({ tableHeader: true, children: b.head.map((h) => cell(new Paragraph({ alignment: AlignmentType.CENTER, children: [run(String(h), { bold: true, color: 'FFFFFF', size: 19 })] }), { shading: shade(C.purple) })) }),
            ...b.rows.map((r, ri2) => new TableRow({ cantSplit: true, children: r.map((v) => cell(new Paragraph({ alignment: AlignmentType.CENTER, children: [run(String(v), { size: 19, bold: hl.includes(ri2) })] }), { shading: shade(hl.includes(ri2) ? C.goldBg : ri2 % 2 ? C.pale : 'FFFFFF') })) }))];
          children.push(full(rows, { borders: { top: hair, bottom: hair, left: hair, right: hair, insideHorizontal: hair, insideVertical: hair } }, b.head.map(() => Math.floor(TW / b.head.length))));
          children.push(new Paragraph({ spacing: { after: 140 } }));
        } else if (b.t === 'chart') {
          const [W, H] = Charts.size(b.spec), wpx = 560;
          children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100, after: 60 }, children: [new ImageRun({ type: 'png', data: dataToBytes(Charts.toDataURL(b.spec, 'paper')), transformation: { width: wpx, height: Math.round(wpx * H / W) } })] }));
          if (b.caption) children.push(para(b.caption, { run: { italics: true, size: 19, color: '6B6580' }, p: { alignment: AlignmentType.CENTER } }));
        } else if (b.t === 'result') {
          children.push(full([new TableRow({ cantSplit: true, children: [
            cell(para(b.label, { run: { bold: true, color: C.ink }, p: { spacing: { after: 0 } } }), { width: { size: 5300, type: WidthType.DXA }, shading: shade(C.goldBg), verticalAlign: 'center' }),
            cell(new Paragraph({ alignment: AlignmentType.CENTER, children: [run(String(b.value), { bold: true, size: 32, color: C.red, font: 'Cambria' })] }), { shading: shade(C.goldBg), verticalAlign: 'center' })] })], { borders: { top: { style: BorderStyle.SINGLE, size: 6, color: C.gold }, bottom: { style: BorderStyle.SINGLE, size: 6, color: C.gold }, left: none, right: none, insideHorizontal: none, insideVertical: none } }, [5300, 4400]));
          children.push(new Paragraph({ spacing: { after: 140 } }));
        } else if (b.t === 'concl') {
          const k = KIND[b.kind] || KIND.info;
          children.push(full([new TableRow({ cantSplit: true, children: [cell(para((b.kind === 'ok' ? '☾  ' : b.kind === 'bad' ? '✠  ' : '✦  ') + b.text, { run: { bold: true, color: k.fg }, p: { spacing: { after: 0 } } }), { shading: shade(k.bg) })] })], { borders: { left: { style: BorderStyle.SINGLE, size: 36, color: k.fg }, top: none, bottom: none, right: none, insideHorizontal: none, insideVertical: none } }, [9700]));
          children.push(new Paragraph({ spacing: { after: 140 } }));
        }
      }
    });
    const doc = new Document({
      creator: 'Soto Estadístico', title: reports[0].title,
      sections: [{
        properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } },
        headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [run('✦ Soto Estadístico', { font: 'Cambria', italics: true, size: 18, color: '8A84A0' })] })] }) },
        footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run('Página ', { size: 18, color: '8A84A0' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '8A84A0' })] })] }) },
        children
      }]
    });
    download(await Packer.toBlob(doc), filename || `Soto_${slug(reports[0].title)}_${stamp()}.docx`);
  }

  /* =================== PDF =================== */
  async function pdf(reports, filename) {
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-12000px;top:0;width:794px;';
    const box = document.createElement('div'); box.style.cssText = 'width:794px;background:#fff;'; box.className = 'pdf-root'; host.appendChild(box);
    const imgs = [];
    reports.forEach((r, i) => {
      const el = Report.toDOM(r, 'paper'); if (i) el.style.pageBreakBefore = 'always';
      const specs = r.blocks.filter((b) => b.t === 'chart');
      el.querySelectorAll('canvas.chart').forEach((cv, j) => { // las gráficas viajan como imagen para que el PDF las conserve
        const img = new Image(); const data = Charts.toDataURL(specs[j].spec, 'paper'); img.src = data; img.style.cssText = 'width:100%;max-width:720px;display:block;margin:0 auto;border:1px solid #d6cdf0;border-radius:8px'; imgs.push(new Promise((res) => { img.onload = img.onerror = res; setTimeout(res, 4000); })); cv.replaceWith(img);
      });
      box.appendChild(el);
    });
    document.body.appendChild(host); await Promise.all(imgs);
    try {
      const SC = 2, worker = html2pdf().set({ margin: 0, html2canvas: { scale: SC, backgroundColor: '#ffffff', useCORS: true, windowWidth: 794, scrollX: 0, scrollY: 0 }, jsPDF: { unit: 'mm', format: 'a4' } }).from(box);
      const canvas = await worker.toCanvas().get('canvas');
      const tiny = document.createElement('div'); tiny.style.cssText = 'width:4px;height:4px;background:#fff'; const pdf = await html2pdf().set({ margin: 0, jsPDF: { unit: 'mm', format: 'a4', compress: true } }).from(tiny).toPdf().get('pdf'), PW = 210, PH = 297, mx = 10, mt = 14, mb = 16, cw = PW - 2 * mx, ph = PH - mt - mb;
      const pxMm = canvas.width / cw, pagePx = Math.floor(ph * pxMm), top0 = box.getBoundingClientRect().top;
      const rel = (e) => Math.round((e.getBoundingClientRect().top - top0) * SC);
      const blockTops = [...box.querySelectorAll('.rep-head, .blk')].filter((e) => !(e.previousElementSibling && e.previousElementSibling.classList.contains('blk-h'))).map(rel), rowTops = [...box.querySelectorAll('tr')].map(rel), forced = [...box.children].map(rel).slice(1);
      let start = 0, page = 0; const H = canvas.height;
      while (start < H - 2) {
        let end = start + pagePx;
        const nextForced = forced.find((t) => t > start + 4); if (nextForced !== undefined && nextForced <= end) end = nextForced;
        else if (end < H) { const cand = blockTops.filter((t) => t > start + 40 && t <= end); const cut = cand.length ? Math.max(...cand) : Math.max(start + 40, ...rowTops.filter((t) => t > start + 40 && t <= end), 0); end = cand.length ? cut : (cut > start + 40 ? cut : end); }
        else end = H;
        end = Math.min(end, H);
        const slice = document.createElement('canvas'); slice.width = canvas.width; slice.height = end - start; const c = slice.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, slice.width, slice.height); c.drawImage(canvas, 0, start, canvas.width, end - start, 0, 0, canvas.width, end - start);
        if (page) pdf.addPage(); page++;
        pdf.addImage(slice.toDataURL('image/jpeg', 0.95), 'JPEG', mx, mt, cw, (end - start) / pxMm);
        start = end;
      }
      const n = pdf.getNumberOfPages();
      for (let i = 1; i <= n; i++) { pdf.setPage(i); pdf.setFontSize(8); pdf.setTextColor(138, 132, 160); pdf.text('Soto Estadístico', mx, 8); pdf.text(`Página ${i} de ${n}`, PW - mx, PH - 8, { align: 'right' }); pdf.setDrawColor(61, 44, 122); pdf.setLineWidth(0.4); pdf.line(mx, 10, PW - mx, 10); }
      download(pdf.output('blob'), filename || `Soto_${slug(reports[0].title)}_${stamp()}.pdf`);
    } finally { host.remove(); }
  }

  return { xlsx, docx: docxExport, pdf };
})();
