/* ============================================
   ファイル分割（PDF / Excel → PDF分割）
   ============================================ */
(function () {
  const settingsPanel = document.getElementById('ps-settings');
  const totalDisplay = document.getElementById('ps-total');
  const modeSelect = document.getElementById('ps-mode');
  const rangeRow = document.getElementById('ps-range-row');
  const rangeInput = document.getElementById('ps-range');
  const everyRow = document.getElementById('ps-every-row');
  const everyNInput = document.getElementById('ps-every-n');
  const executeBtn = document.getElementById('ps-execute');
  const resultArea = document.getElementById('ps-result');
  const resultList = document.getElementById('ps-list');
  const downloadAllBtn = document.getElementById('ps-download-all');
  const pageGrid = document.getElementById('ps-page-grid');

  const ACCEPTED_EXTENSIONS = ['.pdf', '.xlsx', '.xls'];

  /** 読み込んだPDFバイト列（Excel変換後含む） */
  let srcPdfBytes = null;
  let srcFileName = '';
  let totalPages = 0;
  let results = [];
  /** ページ選択状態（rangeモード用） */
  let selectedPages = new Set();

  // --- ドロップゾーン初期化 ---
  ChoiTool.initDropZone('ps-drop', 'ps-file', {
    multiple: true,
    onFiles: handleFiles,
  });

  // --- ファイル種別判定 ---
  function isPdf(file) {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  }

  // --- ファイル読み込み ---
  async function handleFiles(files) {
    var valid = files.filter(function (f) {
      var ext = f.name.toLowerCase().match(/\.[^.]+$/);
      return ext && ACCEPTED_EXTENSIONS.indexOf(ext[0]) !== -1;
    });
    if (valid.length === 0) {
      ChoiTool.showToast('PDF または Excel ファイルを選択してください', 'error');
      return;
    }

    try {
      if (valid.length === 1) {
        // 単一ファイル
        var file = valid[0];
        var pdfBytes;
        if (isPdf(file)) {
          pdfBytes = new Uint8Array(await ChoiTool.readFileAs(file, 'arrayBuffer'));
        } else {
          ChoiTool.showToast('Excelを変換中...', 'info');
          pdfBytes = await ChoiTool.excelToPdfBytes(file);
        }
        srcPdfBytes = pdfBytes;
        srcFileName = file.name.replace(/\.[^.]+$/, '');
      } else {
        // 複数ファイル → 結合してから分割
        ChoiTool.showToast(valid.length + ' ファイルを結合中...', 'info');
        var mergedPdf = await PDFLib.PDFDocument.create();
        for (var fi = 0; fi < valid.length; fi++) {
          var f = valid[fi];
          var bytes;
          if (isPdf(f)) {
            bytes = new Uint8Array(await ChoiTool.readFileAs(f, 'arrayBuffer'));
          } else {
            bytes = await ChoiTool.excelToPdfBytes(f);
          }
          var doc = await PDFLib.PDFDocument.load(bytes);
          var pages = await mergedPdf.copyPages(doc, doc.getPageIndices());
          pages.forEach(function (page) { mergedPdf.addPage(page); });
        }
        srcPdfBytes = new Uint8Array(await mergedPdf.save());
        srcFileName = 'merged';
      }

      var pdf = await PDFLib.PDFDocument.load(srcPdfBytes);
      totalPages = pdf.getPageCount();
      totalDisplay.textContent = totalPages;
      selectedPages = new Set();
      settingsPanel.style.display = '';
      resultArea.style.display = 'none';
      renderPageGrid();
      ChoiTool.showToast(totalPages + ' ページを読み込みました', 'info');
    } catch (e) {
      ChoiTool.showToast('ファイルの読み込みに失敗しました: ' + e.message, 'error');
    }
  }

  // --- ページプレビューグリッド描画 ---
  async function renderPageGrid() {
    pageGrid.innerHTML = '';
    if (!srcPdfBytes) return;

    var pdf = await pdfjsLib.getDocument({ data: srcPdfBytes.slice() }).promise;

    for (var i = 0; i < totalPages; i++) {
      var page = await pdf.getPage(i + 1);
      var vp = page.getViewport({ scale: 0.4 });

      var card = document.createElement('div');
      card.className = 'pm-page-card';
      card.dataset.page = i + 1;

      // ヘッダー（ページ番号）
      var header = document.createElement('div');
      header.className = 'pm-page-card-header';
      var num = document.createElement('span');
      num.className = 'pm-page-num';
      num.textContent = (i + 1) + ' / ' + totalPages;
      header.appendChild(num);

      // Canvas
      var wrap = document.createElement('div');
      wrap.className = 'pm-page-card-canvas-wrap';
      var canvas = document.createElement('canvas');
      canvas.width = vp.width;
      canvas.height = vp.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
      wrap.appendChild(canvas);

      card.appendChild(header);
      card.appendChild(wrap);
      pageGrid.appendChild(card);

      // クリックで選択/解除（rangeモード時にページ番号をrangeInputに反映）
      card.addEventListener('click', (function (pageNum, cardEl) {
        return function () {
          if (selectedPages.has(pageNum)) {
            selectedPages.delete(pageNum);
            cardEl.classList.remove('selected');
            cardEl.classList.add('deselected');
          } else {
            selectedPages.add(pageNum);
            cardEl.classList.add('selected');
            cardEl.classList.remove('deselected');
          }
          syncSelectionToRangeInput();

          // 選択があるカードのdeselected更新
          pageGrid.querySelectorAll('.pm-page-card').forEach(function (c) {
            var pn = parseInt(c.dataset.page);
            if (selectedPages.size > 0 && !selectedPages.has(pn)) {
              c.classList.add('deselected');
            } else {
              c.classList.remove('deselected');
            }
          });
        };
      })(i + 1, card));
    }
  }

  // --- 選択状態をrangeInputに反映 ---
  function syncSelectionToRangeInput() {
    if (selectedPages.size === 0) {
      rangeInput.value = '';
      return;
    }
    var sorted = Array.from(selectedPages).sort(function (a, b) { return a - b; });
    var ranges = [];
    var start = sorted[0];
    var end = sorted[0];
    for (var i = 1; i < sorted.length; i++) {
      if (sorted[i] === end + 1) {
        end = sorted[i];
      } else {
        ranges.push(start === end ? String(start) : start + '-' + end);
        start = sorted[i];
        end = sorted[i];
      }
    }
    ranges.push(start === end ? String(start) : start + '-' + end);
    rangeInput.value = ranges.join(', ');
  }

  // --- モード切り替え ---
  modeSelect.addEventListener('change', function () {
    var mode = modeSelect.value;
    rangeRow.style.display = mode === 'range' ? '' : 'none';
    everyRow.style.display = mode === 'every' ? '' : 'none';
  });

  // --- ページ範囲パーサー ---
  function parseRange(rangeStr, max) {
    var pages = [];
    var parts = rangeStr.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    for (var pi = 0; pi < parts.length; pi++) {
      var match = parts[pi].match(/^(\d+)\s*-\s*(\d+)$/);
      if (match) {
        var start = Math.max(1, parseInt(match[1]));
        var end = Math.min(max, parseInt(match[2]));
        for (var i = start; i <= end; i++) pages.push(i);
      } else {
        var n = parseInt(parts[pi]);
        if (n >= 1 && n <= max) pages.push(n);
      }
    }
    return pages;
  }

  // --- 分割実行 ---
  executeBtn.addEventListener('click', async function () {
    if (!srcPdfBytes) {
      ChoiTool.showToast('ファイルを読み込んでください', 'error');
      return;
    }

    var mode = modeSelect.value;
    results = [];
    resultList.innerHTML = '';
    executeBtn.disabled = true;
    executeBtn.textContent = '分割中...';

    try {
      if (mode === 'range') {
        var pages = parseRange(rangeInput.value, totalPages);
        if (pages.length === 0) {
          ChoiTool.showToast('有効なページ範囲を入力するか、サムネイルをクリックして選択してください', 'error');
          return;
        }
        var srcPdf = await PDFLib.PDFDocument.load(srcPdfBytes);
        var newPdf = await PDFLib.PDFDocument.create();
        var indices = pages.map(function (p) { return p - 1; });
        var copiedPages = await newPdf.copyPages(srcPdf, indices);
        copiedPages.forEach(function (page) { newPdf.addPage(page); });
        var bytes = await newPdf.save();
        var blob = new Blob([bytes], { type: 'application/pdf' });
        var name = srcFileName + '_p' + rangeInput.value.replace(/\s/g, '') + '.pdf';
        results.push({ blob: blob, name: name, pageCount: pages.length });
      } else if (mode === 'every') {
        var n = parseInt(everyNInput.value) || 1;
        var srcPdf2 = await PDFLib.PDFDocument.load(srcPdfBytes);
        for (var start = 0; start < totalPages; start += n) {
          var end = Math.min(start + n, totalPages);
          var newPdf2 = await PDFLib.PDFDocument.create();
          var idx = [];
          for (var i = start; i < end; i++) idx.push(i);
          var cp = await newPdf2.copyPages(srcPdf2, idx);
          cp.forEach(function (page) { newPdf2.addPage(page); });
          var b = await newPdf2.save();
          var bl = new Blob([b], { type: 'application/pdf' });
          var nm = srcFileName + '_p' + (start + 1) + '-' + end + '.pdf';
          results.push({ blob: bl, name: nm, pageCount: end - start });
        }
      } else {
        // each
        var srcPdf3 = await PDFLib.PDFDocument.load(srcPdfBytes);
        for (var j = 0; j < totalPages; j++) {
          var np = await PDFLib.PDFDocument.create();
          var cp2 = await np.copyPages(srcPdf3, [j]);
          np.addPage(cp2[0]);
          var b2 = await np.save();
          var bl2 = new Blob([b2], { type: 'application/pdf' });
          var nm2 = srcFileName + '_p' + (j + 1) + '.pdf';
          results.push({ blob: bl2, name: nm2, pageCount: 1 });
        }
      }

      // 結果表示
      results.forEach(function (r, idx) {
        appendResultItem(r.name, r.pageCount, r.blob.size, idx);
      });

      if (results.length > 0) {
        resultArea.style.display = '';
        ChoiTool.showToast(results.length + ' 件のPDFに分割しました', 'success');
      }
    } catch (e) {
      ChoiTool.showToast('分割に失敗しました: ' + e.message, 'error');
    } finally {
      executeBtn.disabled = false;
      executeBtn.textContent = '分割実行';
    }
  });

  var previewArea = document.getElementById('ps-preview');
  var activePreviewIdx = -1;

  // --- 結果アイテム表示 ---
  function appendResultItem(name, pageCount, size, index) {
    var item = document.createElement('div');
    item.className = 'result-item';
    item.innerHTML =
      '<div class="result-item-info">' +
        '<div class="result-item-name">' + escapeHTML(name) + '</div>' +
        '<div class="result-item-meta">' + pageCount + ' ページ / ' + ChoiTool.formatFileSize(size) + '</div>' +
      '</div>' +
      '<button class="btn btn-sm btn-secondary ps-preview-btn">プレビュー</button>' +
      '<button class="btn btn-sm btn-secondary ps-dl-btn">DL</button>';
    resultList.appendChild(item);

    item.querySelector('.ps-dl-btn').addEventListener('click', function () {
      ChoiTool.downloadBlob(results[index].blob, results[index].name);
    });

    item.querySelector('.ps-preview-btn').addEventListener('click', function () {
      if (activePreviewIdx === index) {
        previewArea.style.display = 'none';
        activePreviewIdx = -1;
        return;
      }
      activePreviewIdx = index;
      ChoiTool.renderPdfPreview(results[index].blob, previewArea);
    });
  }

  // --- 全件ダウンロード ---
  downloadAllBtn.addEventListener('click', function () {
    results.forEach(function (r) { ChoiTool.downloadBlob(r.blob, r.name); });
  });

  var escapeHTML = ChoiTool.escapeHTML;

  // --- リセット ---
  document.getElementById('ps-reset').addEventListener('click', function () {
    srcPdfBytes = null;
    srcFileName = '';
    totalPages = 0;
    results = [];
    selectedPages = new Set();
    resultList.innerHTML = '';
    pageGrid.innerHTML = '';
    settingsPanel.style.display = 'none';
    resultArea.style.display = 'none';
    previewArea.style.display = 'none';
    previewArea.innerHTML = '';
    activePreviewIdx = -1;
    totalDisplay.textContent = '-';
    document.getElementById('ps-file').value = '';
  });
})();
