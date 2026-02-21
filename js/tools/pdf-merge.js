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

  // --- Excel → PDF変換（SheetJS + jsPDF + autotable） ---
  async function excelToPdfBytes(file) {
    const arrayBuffer = await ChoiTool.readFileAs(file, 'arrayBuffer');
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const doc = new jspdf.jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

    let isFirstSheet = true;
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      if (jsonData.length === 0) continue;

      if (!isFirstSheet) {
        doc.addPage('a4', 'landscape');
      }
      isFirstSheet = false;

      // シート名をヘッダーとして表示
      doc.setFontSize(11);
      doc.text(sheetName, 40, 30);

      const head = [jsonData[0].map(String)];
      const body = jsonData.slice(1).map((row) => row.map(String));

      doc.autoTable({
        startY: 40,
        head: head,
        body: body,
        styles: {
          fontSize: 8,
          cellPadding: 4,
          overflow: 'linebreak',
          font: 'helvetica',
        },
        headStyles: {
          fillColor: [0, 120, 212],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        margin: { top: 40, left: 40, right: 40 },
        tableWidth: 'auto',
      });
    }

    const pdfArrayBuffer = doc.output('arraybuffer');
    return new Uint8Array(pdfArrayBuffer);
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
})();
