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
  const applyBtn = document.getElementById('pm-apply');

  const ACCEPTED_EXTENSIONS = ['.pdf', '.xlsx', '.xls'];

  /** アップロードされたファイル配列 */
  let sourceFiles = [];
  let resultBlob = null;

  /** ページ並べ替え・回転用の状態 */
  let mergedPdfBytes = null;
  let pageStates = [];
  let isModified = false;

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

  // Excel→PDF変換は ChoiTool.excelToPdfBytes を使用

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
          pdfBytes = await ChoiTool.excelToPdfBytes(file);
        } else {
          continue;
        }

        const srcPdf = await PDFLib.PDFDocument.load(pdfBytes);
        const pages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
        pages.forEach((page) => mergedPdf.addPage(page));
      }

      const totalPages = mergedPdf.getPageCount();
      mergedPdfBytes = new Uint8Array(await mergedPdf.save());
      resultBlob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      pageStates = Array.from({ length: totalPages }, (_, i) => ({ originalIndex: i, rotation: 0 }));
      isModified = false;
      applyBtn.style.display = 'none';

      resultInfo.textContent = totalPages + ' ページ / ' + ChoiTool.formatFileSize(resultBlob.size);
      resultArea.style.display = '';
      renderPageGrid();
      ChoiTool.showToast('ファイルを結合しました', 'success');
    } catch (e) {
      ChoiTool.showToast('結合に失敗しました: ' + e.message, 'error');
    } finally {
      executeBtn.disabled = false;
      executeBtn.textContent = '結合実行';
    }
  });

  // --- ページグリッド描画 ---
  async function renderPageGrid() {
    const grid = document.getElementById('pm-page-grid');
    grid.innerHTML = '';
    const pdf = await pdfjsLib.getDocument({ data: mergedPdfBytes.slice() }).promise;

    for (let i = 0; i < pageStates.length; i++) {
      const ps = pageStates[i];
      const page = await pdf.getPage(ps.originalIndex + 1);
      const vp = page.getViewport({ scale: 0.5 });

      const card = document.createElement('div');
      card.className = 'pm-page-card';
      card.draggable = true;
      card.dataset.index = i;

      // ヘッダー（番号 + 回転ボタン）
      const header = document.createElement('div');
      header.className = 'pm-page-card-header';
      const num = document.createElement('span');
      num.className = 'pm-page-num';
      num.textContent = (i + 1) + ' / ' + pageStates.length;
      const rotBtn = document.createElement('button');
      rotBtn.className = 'pm-page-card-rotate';
      rotBtn.textContent = '\u21BB';
      rotBtn.title = '90\u00B0回転';
      rotBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        ps.rotation = (ps.rotation + 90) % 360;
        applyRotationCSS(wrap, ps.rotation);
        markAsModified();
      });
      header.appendChild(num);
      header.appendChild(rotBtn);

      // Canvas
      const wrap = document.createElement('div');
      wrap.className = 'pm-page-card-canvas-wrap';
      const canvas = document.createElement('canvas');
      canvas.width = vp.width;
      canvas.height = vp.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
      wrap.appendChild(canvas);
      applyRotationCSS(wrap, ps.rotation);

      card.appendChild(header);
      card.appendChild(wrap);
      grid.appendChild(card);
    }

    initPageGridSortable();
  }

  // --- CSS回転表示 ---
  function applyRotationCSS(wrap, rotation) {
    const canvas = wrap.querySelector('canvas');
    if (!canvas) return;
    const isLandscape = rotation === 90 || rotation === 270;
    const scale = isLandscape ? Math.min(1, wrap.clientWidth / canvas.height) : 1;
    canvas.style.transform = 'rotate(' + rotation + 'deg)' + (isLandscape ? ' scale(' + scale + ')' : '');
  }

  // --- グリッド内ドラッグ並べ替え ---
  function initPageGridSortable() {
    const grid = document.getElementById('pm-page-grid');
    let dragEl = null;

    grid.addEventListener('dragstart', (e) => {
      dragEl = e.target.closest('.pm-page-card');
      if (!dragEl) return;
      dragEl.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    grid.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const target = e.target.closest('.pm-page-card');
      if (!target || target === dragEl) return;
      grid.querySelectorAll('.pm-page-card').forEach(c => c.classList.remove('drag-over'));
      target.classList.add('drag-over');
      const rect = target.getBoundingClientRect();
      const mid = rect.left + rect.width / 2;
      if (e.clientX < mid) {
        grid.insertBefore(dragEl, target);
      } else {
        grid.insertBefore(dragEl, target.nextSibling);
      }
    });

    grid.addEventListener('dragend', () => {
      if (dragEl) dragEl.classList.remove('dragging');
      grid.querySelectorAll('.pm-page-card').forEach(c => c.classList.remove('drag-over'));
      dragEl = null;
      // pageStatesの順序をDOMの順序に同期
      const cards = grid.querySelectorAll('.pm-page-card');
      const newStates = Array.from(cards).map(card => pageStates[parseInt(card.dataset.index)]);
      pageStates = newStates;
      // data-indexとページ番号を更新
      cards.forEach((card, i) => {
        card.dataset.index = i;
        card.querySelector('.pm-page-num').textContent = (i + 1) + ' / ' + pageStates.length;
      });
      markAsModified();
    });
  }

  // --- 変更フラグ管理 ---
  function markAsModified() {
    isModified = true;
    applyBtn.style.display = '';
  }

  // --- 変更を適用 ---
  applyBtn.addEventListener('click', async () => {
    applyBtn.disabled = true;
    applyBtn.textContent = '適用中...';
    try {
      const srcPdf = await PDFLib.PDFDocument.load(mergedPdfBytes);
      const newPdf = await PDFLib.PDFDocument.create();
      for (const ps of pageStates) {
        const [page] = await newPdf.copyPages(srcPdf, [ps.originalIndex]);
        if (ps.rotation !== 0) {
          const current = page.getRotation().angle;
          page.setRotation(PDFLib.degrees(current + ps.rotation));
        }
        newPdf.addPage(page);
      }
      mergedPdfBytes = new Uint8Array(await newPdf.save());
      resultBlob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      pageStates = Array.from({ length: newPdf.getPageCount() }, (_, i) => ({ originalIndex: i, rotation: 0 }));
      isModified = false;
      applyBtn.style.display = 'none';
      resultInfo.textContent = newPdf.getPageCount() + ' ページ / ' + ChoiTool.formatFileSize(resultBlob.size);
      renderPageGrid();
      ChoiTool.showToast('変更を適用しました', 'success');
    } catch (e) {
      ChoiTool.showToast('適用に失敗しました: ' + e.message, 'error');
    } finally {
      applyBtn.disabled = false;
      applyBtn.textContent = '変更を適用';
    }
  });

  // --- ダウンロード ---
  downloadBtn.addEventListener('click', async () => {
    if (isModified) {
      if (!confirm('未適用の変更があります。現在の変更を適用してからダウンロードしますか？\n「OK」で適用してDL、「キャンセル」で適用前のPDFをDL')) {
        ChoiTool.downloadBlob(resultBlob, 'merged.pdf');
        return;
      }
      applyBtn.click();
      // 適用完了を待つ
      await new Promise(resolve => {
        const check = setInterval(() => {
          if (!applyBtn.disabled) {
            clearInterval(check);
            resolve();
          }
        }, 100);
      });
    }
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
    mergedPdfBytes = null;
    pageStates = [];
    isModified = false;
    fileList.innerHTML = '';
    settingsPanel.style.display = 'none';
    resultArea.style.display = 'none';
    document.getElementById('pm-page-grid').innerHTML = '';
    applyBtn.style.display = 'none';
    resultInfo.textContent = '';
    document.getElementById('pm-file').value = '';
  });
})();
