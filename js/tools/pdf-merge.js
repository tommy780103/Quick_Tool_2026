/* ============================================
   ファイル結合（PDF / Excel → PDF）
   ============================================ */
(function () {
  const settingsPanel = document.getElementById('pm-settings');
  const fileList = document.getElementById('pm-list');
  const executeBtn = document.getElementById('pm-execute');
  const resultArea = document.getElementById('pm-result');
  const resultInfo = document.getElementById('pm-info');
  const downloadBtn = document.getElementById('pm-download');

  const ACCEPTED_EXTENSIONS = ['.pdf', '.xlsx', '.xls'];

  /** アップロードされたファイル配列 */
  let sourceFiles = [];
  let resultBlob = null;

  // --- ドロップゾーン初期化 ---
  ChoiTool.initDropZone('pm-drop', 'pm-file', {
    multiple: true,
    onFiles: handleFiles,
  });

  // --- ファイル追加 ---
  function handleFiles(files) {
    const valid = files.filter((f) => {
      const ext = f.name.toLowerCase().match(/\.[^.]+$/);
      return ext && ACCEPTED_EXTENSIONS.includes(ext[0]);
    });
    if (valid.length === 0) {
      ChoiTool.showToast('PDF または Excel ファイルを選択してください', 'error');
      return;
    }
    valid.forEach((f) => sourceFiles.push(f));
    renderFileList();
    settingsPanel.style.display = '';
    resultArea.style.display = 'none';
  }

  // --- ファイル種別判定 ---
  function isPdf(file) {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  }

  function isExcel(file) {
    const name = file.name.toLowerCase();
    return name.endsWith('.xlsx') || name.endsWith('.xls');
  }

  // --- ファイルリスト描画 ---
  function renderFileList() {
    fileList.innerHTML = '';
    sourceFiles.forEach((file, i) => {
      const item = document.createElement('div');
      item.className = 'file-list-item';
      item.draggable = true;
      item.dataset.index = i;

      const badge = isExcel(file) ? '<span class="file-badge excel">Excel</span>' : '<span class="file-badge pdf">PDF</span>';

      item.innerHTML =
        '<span class="file-list-item-grip">\u283F</span>' +
        badge +
        '<span class="file-list-item-name">' + escapeHTML(file.name) + '</span>' +
        '<span class="file-list-item-size">' + ChoiTool.formatFileSize(file.size) + '</span>' +
        '<button class="file-list-item-remove" data-idx="' + i + '">\u00D7</button>';
      fileList.appendChild(item);
    });

    // 削除ボタン
    fileList.querySelectorAll('.file-list-item-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        sourceFiles.splice(parseInt(btn.dataset.idx), 1);
        renderFileList();
        if (sourceFiles.length === 0) {
          settingsPanel.style.display = 'none';
        }
      });
    });
  }

  // --- 並べ替え初期化 ---
  ChoiTool.initSortable('pm-list', (newOrder) => {
    const reordered = newOrder.map((i) => sourceFiles[i]);
    sourceFiles = reordered;
    renderFileList();
  });

  // --- Excel → PDF変換（SheetJS + Canvas + pdf-lib） ---
  // ブラウザのシステムフォントで描画するため日本語が正しく表示される
  async function excelToPdfBytes(file) {
    const arrayBuffer = await ChoiTool.readFileAs(file, 'arrayBuffer');
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const pdfDoc = await PDFLib.PDFDocument.create();

    // A4横 (points)
    var PAGE_W = 841.89;
    var PAGE_H = 595.28;
    var MARGIN = 40;

    for (var si = 0; si < workbook.SheetNames.length; si++) {
      var sheetName = workbook.SheetNames[si];
      var sheet = workbook.Sheets[sheetName];
      var data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      if (data.length === 0) continue;

      var canvases = renderSheetPages(
        sheetName, data, PAGE_W - MARGIN * 2, PAGE_H - MARGIN * 2
      );

      for (var ci = 0; ci < canvases.length; ci++) {
        var blob = await ChoiTool.canvasToBlob(canvases[ci], 'image/png', 1);
        var pngBytes = new Uint8Array(await ChoiTool.readFileAs(blob, 'arrayBuffer'));
        var img = await pdfDoc.embedPng(pngBytes);

        var page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        var scaleW = (PAGE_W - MARGIN * 2) / canvases[ci].width;
        var scaleH = (PAGE_H - MARGIN * 2) / canvases[ci].height;
        var s = Math.min(scaleW, scaleH, 1);

        page.drawImage(img, {
          x: MARGIN,
          y: PAGE_H - MARGIN - canvases[ci].height * s,
          width: canvases[ci].width * s,
          height: canvases[ci].height * s,
        });
      }
    }

    return new Uint8Array(await pdfDoc.save());
  }

  // --- Excelシートをページ分割してCanvas描画 ---
  function renderSheetPages(sheetName, data, contentW, contentH) {
    var SCALE = 2; // 高解像度描画
    var FONT = '"Meiryo", "Yu Gothic", "Hiragino Sans", sans-serif';
    var FONT_SIZE = 9 * SCALE;
    var BOLD_FONT = 'bold ' + FONT_SIZE + 'px ' + FONT;
    var NORMAL_FONT = FONT_SIZE + 'px ' + FONT;
    var TITLE_FONT = 'bold ' + (11 * SCALE) + 'px ' + FONT;
    var PAD = 5 * SCALE;
    var ROW_H = FONT_SIZE + PAD * 2;
    var HDR_H = FONT_SIZE + PAD * 2 + 2 * SCALE;
    var TITLE_H = 22 * SCALE;
    var W = contentW * SCALE;
    var H = contentH * SCALE;

    var headers = data[0].map(String);
    var rows = data.slice(1).map(function (r) { return r.map(String); });

    // 列幅を計測
    var mc = document.createElement('canvas').getContext('2d');
    mc.font = NORMAL_FONT;
    var colWidths = headers.map(function (h, i) {
      mc.font = BOLD_FONT;
      var maxW = mc.measureText(h).width;
      mc.font = NORMAL_FONT;
      for (var ri = 0; ri < rows.length; ri++) {
        var w = mc.measureText(rows[ri][i] || '').width;
        if (w > maxW) maxW = w;
      }
      return maxW + PAD * 2;
    });

    // 幅をページに合わせてスケール
    var totalColW = colWidths.reduce(function (a, b) { return a + b; }, 0);
    var ratio = W / totalColW;
    for (var i = 0; i < colWidths.length; i++) {
      colWidths[i] = Math.floor(colWidths[i] * ratio);
    }
    var tableW = colWidths.reduce(function (a, b) { return a + b; }, 0);

    // ページあたりの行数
    var rowsPerPage = Math.max(1, Math.floor((H - TITLE_H - HDR_H) / ROW_H));
    var totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
    var pages = [];

    for (var p = 0; p < totalPages; p++) {
      var pageRows = rows.slice(p * rowsPerPage, (p + 1) * rowsPerPage);
      var canvasH = TITLE_H + HDR_H + pageRows.length * ROW_H + SCALE;

      var canvas = document.createElement('canvas');
      canvas.width = tableW;
      canvas.height = canvasH;
      var ctx = canvas.getContext('2d');

      // 背景
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, tableW, canvasH);

      // シート名
      ctx.fillStyle = '#323130';
      ctx.font = TITLE_FONT;
      ctx.textBaseline = 'middle';
      ctx.fillText(sheetName + (p > 0 ? ' (続き)' : ''), PAD, TITLE_H / 2);

      var y = TITLE_H;

      // ヘッダー行
      ctx.fillStyle = '#0078d4';
      ctx.fillRect(0, y, tableW, HDR_H);
      ctx.fillStyle = '#ffffff';
      ctx.font = BOLD_FONT;
      var x = 0;
      for (var hi = 0; hi < headers.length; hi++) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, colWidths[hi], HDR_H);
        ctx.clip();
        ctx.fillText(headers[hi], x + PAD, y + HDR_H / 2);
        ctx.restore();
        x += colWidths[hi];
      }
      y += HDR_H;

      // データ行
      ctx.font = NORMAL_FONT;
      for (var ri = 0; ri < pageRows.length; ri++) {
        if (ri % 2 === 1) {
          ctx.fillStyle = '#f5f5f5';
          ctx.fillRect(0, y, tableW, ROW_H);
        }
        ctx.fillStyle = '#323130';
        x = 0;
        for (var ci = 0; ci < pageRows[ri].length; ci++) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(x, y, colWidths[ci] || 0, ROW_H);
          ctx.clip();
          ctx.fillText(pageRows[ri][ci], x + PAD, y + ROW_H / 2);
          ctx.restore();
          x += colWidths[ci] || 0;
        }
        y += ROW_H;
      }

      // 罫線
      ctx.strokeStyle = '#e1dfdd';
      ctx.lineWidth = SCALE * 0.5;
      ctx.beginPath();
      // 横線
      y = TITLE_H;
      for (var li = 0; li <= pageRows.length + 1; li++) {
        ctx.moveTo(0, y);
        ctx.lineTo(tableW, y);
        y += li === 0 ? HDR_H : ROW_H;
      }
      // 縦線
      x = 0;
      var gridBottom = TITLE_H + HDR_H + pageRows.length * ROW_H;
      for (var vi = 0; vi <= colWidths.length; vi++) {
        ctx.moveTo(x, TITLE_H);
        ctx.lineTo(x, gridBottom);
        if (vi < colWidths.length) x += colWidths[vi];
      }
      ctx.stroke();

      pages.push(canvas);
    }

    return pages;
  }

  // --- 結合実行 ---
  executeBtn.addEventListener('click', async () => {
    if (sourceFiles.length < 1) {
      ChoiTool.showToast('ファイルを追加してください', 'error');
      return;
    }

    executeBtn.disabled = true;
    executeBtn.textContent = '変換・結合中...';

    try {
      const mergedPdf = await PDFLib.PDFDocument.create();

      for (const file of sourceFiles) {
        let pdfBytes;

        if (isPdf(file)) {
          pdfBytes = new Uint8Array(await ChoiTool.readFileAs(file, 'arrayBuffer'));
        } else if (isExcel(file)) {
          pdfBytes = await excelToPdfBytes(file);
        } else {
          continue;
        }

        const srcPdf = await PDFLib.PDFDocument.load(pdfBytes);
        const pages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
        pages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedBytes = await mergedPdf.save();
      resultBlob = new Blob([mergedBytes], { type: 'application/pdf' });

      const totalPages = mergedPdf.getPageCount();
      resultInfo.textContent = totalPages + ' ページ / ' + ChoiTool.formatFileSize(resultBlob.size);
      resultArea.style.display = '';
      ChoiTool.renderPdfPreview(resultBlob, 'pm-preview');
      ChoiTool.showToast('ファイルを結合しました', 'success');
    } catch (e) {
      ChoiTool.showToast('結合に失敗しました: ' + e.message, 'error');
    } finally {
      executeBtn.disabled = false;
      executeBtn.textContent = '結合実行';
    }
  });

  // --- ダウンロード ---
  downloadBtn.addEventListener('click', () => {
    if (resultBlob) {
      ChoiTool.downloadBlob(resultBlob, 'merged.pdf');
    }
  });

  // --- HTMLエスケープ ---
  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
  // --- リセット ---
  document.getElementById('pm-reset').addEventListener('click', () => {
    sourceFiles = [];
    resultBlob = null;
    fileList.innerHTML = '';
    settingsPanel.style.display = 'none';
    resultArea.style.display = 'none';
    document.getElementById('pm-preview').innerHTML = '';
    document.getElementById('pm-preview').style.display = 'none';
    resultInfo.textContent = '';
    document.getElementById('pm-file').value = '';
  });
})();
