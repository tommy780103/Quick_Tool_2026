/* ============================================
   PDF→画像変換
   ============================================ */
(function () {
  const dpiSelect = document.getElementById('p2i-dpi');
  const formatSelect = document.getElementById('p2i-format');
  const progressArea = document.getElementById('p2i-progress');
  const progressFill = document.getElementById('p2i-progress-fill');
  const progressText = document.getElementById('p2i-progress-text');
  const resultArea = document.getElementById('p2i-result');
  const resultGrid = document.getElementById('p2i-grid');
  const downloadAllBtn = document.getElementById('p2i-download-all');

  /** 変換結果 */
  let results = [];

  // --- ドロップゾーン初期化 ---
  ChoiTool.initDropZone('p2i-drop', 'p2i-file', {
    multiple: false,
    onFiles: handleFiles,
  });

  // --- ファイル処理 ---
  async function handleFiles(files) {
    const file = files[0];
    if (!file.type && !file.name.toLowerCase().endsWith('.pdf')) {
      ChoiTool.showToast('PDFファイルを選択してください', 'error');
      return;
    }

    results = [];
    resultGrid.innerHTML = '';
    resultArea.style.display = 'none';
    progressArea.style.display = '';
    progressFill.style.width = '0%';
    progressText.textContent = '読み込み中...';

    const baseName = file.name.replace(/\.pdf$/i, '');

    try {
      const arrayBuffer = await ChoiTool.readFileAs(file, 'arrayBuffer');
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;
      const dpi = parseInt(dpiSelect.value);
      const scale = dpi / 72;
      const format = formatSelect.value;
      const ext = ChoiTool.mimeToExt(format);

      for (let i = 1; i <= totalPages; i++) {
        progressText.textContent = i + ' / ' + totalPages + ' ページ変換中...';
        progressFill.style.width = ((i / totalPages) * 100) + '%';

        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: scale });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        await page.render({ canvasContext: ctx, viewport: viewport }).promise;

        const blob = await ChoiTool.canvasToBlob(canvas, format, 0.92);
        const name = baseName + '_p' + i + '.' + ext;
        const dataURL = canvas.toDataURL(format, 0.92);

        results.push({ blob, name, dataURL });
      }

      // 結果表示
      results.forEach((r, idx) => {
        const item = document.createElement('div');
        item.className = 'result-grid-item';

        const img = document.createElement('img');
        img.src = r.dataURL;
        img.alt = r.name;
        img.title = r.name + ' (' + ChoiTool.formatFileSize(r.blob.size) + ') — クリックでDL';
        item.appendChild(img);

        const label = document.createElement('div');
        label.className = 'result-grid-item-label';
        label.textContent = r.name;
        item.appendChild(label);

        item.addEventListener('click', () => {
          ChoiTool.downloadBlob(results[idx].blob, results[idx].name);
        });

        resultGrid.appendChild(item);
      });

      progressArea.style.display = 'none';
      resultArea.style.display = '';
      ChoiTool.showToast(totalPages + ' ページを画像に変換しました', 'success');
    } catch (e) {
      progressArea.style.display = 'none';
      ChoiTool.showToast('PDF→画像変換に失敗しました: ' + e.message, 'error');
    }
  }

  // --- 全件ダウンロード ---
  downloadAllBtn.addEventListener('click', () => {
    results.forEach((r) => ChoiTool.downloadBlob(r.blob, r.name));
  });
})();
