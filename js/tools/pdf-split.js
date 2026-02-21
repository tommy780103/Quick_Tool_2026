/* ============================================
   PDF分割
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

  /** 読み込んだPDF */
  let srcBuffer = null;
  let srcFileName = '';
  let totalPages = 0;
  let results = [];

  // --- ドロップゾーン初期化 ---
  ChoiTool.initDropZone('ps-drop', 'ps-file', {
    multiple: false,
    onFiles: handleFiles,
  });

  // --- ファイル読み込み ---
  async function handleFiles(files) {
    const file = files[0];
    if (!file.type && !file.name.toLowerCase().endsWith('.pdf')) {
      ChoiTool.showToast('PDFファイルを選択してください', 'error');
      return;
    }

    try {
      srcBuffer = await ChoiTool.readFileAs(file, 'arrayBuffer');
      srcFileName = file.name.replace(/\.pdf$/i, '');
      const pdf = await PDFLib.PDFDocument.load(srcBuffer);
      totalPages = pdf.getPageCount();
      totalDisplay.textContent = totalPages;
      settingsPanel.style.display = '';
      resultArea.style.display = 'none';
      ChoiTool.showToast(totalPages + ' ページのPDFを読み込みました', 'info');
    } catch (e) {
      ChoiTool.showToast('PDFの読み込みに失敗しました', 'error');
    }
  }

  // --- モード切り替え ---
  modeSelect.addEventListener('change', () => {
    const mode = modeSelect.value;
    rangeRow.style.display = mode === 'range' ? '' : 'none';
    everyRow.style.display = mode === 'every' ? '' : 'none';
  });

  // --- ページ範囲パーサー ---
  function parseRange(rangeStr, max) {
    const pages = [];
    const parts = rangeStr.split(',').map((s) => s.trim()).filter(Boolean);
    for (const part of parts) {
      const match = part.match(/^(\d+)\s*-\s*(\d+)$/);
      if (match) {
        const start = Math.max(1, parseInt(match[1]));
        const end = Math.min(max, parseInt(match[2]));
        for (let i = start; i <= end; i++) pages.push(i);
      } else {
        const n = parseInt(part);
        if (n >= 1 && n <= max) pages.push(n);
      }
    }
    return pages;
  }

  // --- 分割実行 ---
  executeBtn.addEventListener('click', async () => {
    if (!srcBuffer) {
      ChoiTool.showToast('PDFファイルを読み込んでください', 'error');
      return;
    }

    const mode = modeSelect.value;
    results = [];
    resultList.innerHTML = '';
    executeBtn.disabled = true;
    executeBtn.textContent = '分割中...';

    try {
      if (mode === 'range') {
        const pages = parseRange(rangeInput.value, totalPages);
        if (pages.length === 0) {
          ChoiTool.showToast('有効なページ範囲を入力してください', 'error');
          return;
        }
        const srcPdf = await PDFLib.PDFDocument.load(srcBuffer);
        const newPdf = await PDFLib.PDFDocument.create();
        const indices = pages.map((p) => p - 1);
        const copiedPages = await newPdf.copyPages(srcPdf, indices);
        copiedPages.forEach((page) => newPdf.addPage(page));
        const bytes = await newPdf.save();
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const name = srcFileName + '_p' + rangeInput.value.replace(/\s/g, '') + '.pdf';
        results.push({ blob, name, pageCount: pages.length });
      } else if (mode === 'every') {
        const n = parseInt(everyNInput.value) || 1;
        const srcPdf = await PDFLib.PDFDocument.load(srcBuffer);
        for (let start = 0; start < totalPages; start += n) {
          const end = Math.min(start + n, totalPages);
          const newPdf = await PDFLib.PDFDocument.create();
          const indices = [];
          for (let i = start; i < end; i++) indices.push(i);
          const copiedPages = await newPdf.copyPages(srcPdf, indices);
          copiedPages.forEach((page) => newPdf.addPage(page));
          const bytes = await newPdf.save();
          const blob = new Blob([bytes], { type: 'application/pdf' });
          const name = srcFileName + '_p' + (start + 1) + '-' + end + '.pdf';
          results.push({ blob, name, pageCount: end - start });
        }
      } else {
        // each
        const srcPdf = await PDFLib.PDFDocument.load(srcBuffer);
        for (let i = 0; i < totalPages; i++) {
          const newPdf = await PDFLib.PDFDocument.create();
          const [copiedPage] = await newPdf.copyPages(srcPdf, [i]);
          newPdf.addPage(copiedPage);
          const bytes = await newPdf.save();
          const blob = new Blob([bytes], { type: 'application/pdf' });
          const name = srcFileName + '_p' + (i + 1) + '.pdf';
          results.push({ blob, name, pageCount: 1 });
        }
      }

      // 結果表示
      results.forEach((r, idx) => {
        appendResultItem(r.name, r.pageCount, r.blob.size, idx);
      });

      if (results.length > 0) {
        resultArea.style.display = '';
        ChoiTool.showToast(results.length + ' 件のPDFに分割しました', 'success');
      }
    } catch (e) {
      ChoiTool.showToast('PDF分割に失敗しました: ' + e.message, 'error');
    } finally {
      executeBtn.disabled = false;
      executeBtn.textContent = '分割する';
    }
  });

  const previewArea = document.getElementById('ps-preview');
  let activePreviewIdx = -1;

  // --- 結果アイテム表示 ---
  function appendResultItem(name, pageCount, size, index) {
    const item = document.createElement('div');
    item.className = 'result-item';
    item.innerHTML =
      '<div class="result-item-info">' +
        '<div class="result-item-name">' + escapeHTML(name) + '</div>' +
        '<div class="result-item-meta">' + pageCount + ' ページ / ' + ChoiTool.formatFileSize(size) + '</div>' +
      '</div>' +
      '<button class="btn btn-sm btn-secondary ps-preview-btn">プレビュー</button>' +
      '<button class="btn btn-sm btn-secondary ps-dl-btn">DL</button>';
    resultList.appendChild(item);

    item.querySelector('.ps-dl-btn').addEventListener('click', () => {
      ChoiTool.downloadBlob(results[index].blob, results[index].name);
    });

    item.querySelector('.ps-preview-btn').addEventListener('click', () => {
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
  downloadAllBtn.addEventListener('click', () => {
    results.forEach((r) => ChoiTool.downloadBlob(r.blob, r.name));
  });

  // --- HTMLエスケープ ---
  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();
