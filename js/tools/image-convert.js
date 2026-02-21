/* ============================================
   画像フォーマット変換
   ============================================ */
(function () {
  const formatSelect = document.getElementById('ic-format');
  const qualitySlider = document.getElementById('ic-quality');
  const qualityVal = document.getElementById('ic-quality-val');
  const qualityRow = document.getElementById('ic-quality-row');
  const resultArea = document.getElementById('ic-result');
  const resultList = document.getElementById('ic-list');
  const downloadAllBtn = document.getElementById('ic-download-all');

  /** 変換結果を保持 */
  let results = [];

  // --- 品質スライダー連動 ---
  qualitySlider.addEventListener('input', () => {
    qualityVal.textContent = qualitySlider.value;
  });

  // --- PNG選択時は品質行を非表示 ---
  formatSelect.addEventListener('change', () => {
    qualityRow.style.display = formatSelect.value === 'image/png' ? 'none' : '';
  });

  // --- ドロップゾーン初期化 ---
  ChoiTool.initDropZone('ic-drop', 'ic-file', {
    multiple: true,
    onFiles: handleFiles,
  });

  // --- ファイル処理 ---
  async function handleFiles(files) {
    const imageFiles = files.filter((f) => ChoiTool.isImageFile(f));
    if (imageFiles.length === 0) {
      ChoiTool.showToast('画像ファイルを選択してください', 'error');
      return;
    }

    results = [];
    resultList.innerHTML = '';
    resultArea.style.display = 'none';

    const format = formatSelect.value;
    const quality = parseInt(qualitySlider.value, 10) / 100;
    const ext = ChoiTool.mimeToExt(format);

    for (const file of imageFiles) {
      try {
        const dataURL = await ChoiTool.readImageAsDataURL(file);
        const img = await ChoiTool.loadImage(dataURL);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const blob = await ChoiTool.canvasToBlob(canvas, format, quality);
        const newName = ChoiTool.changeExt(file.name, ext);

        results.push({ blob, name: newName, originalSize: file.size });
        appendResultItem(file.name, file.size, blob.size, newName, results.length - 1);
      } catch (e) {
        ChoiTool.showToast(`${file.name} の変換に失敗しました`, 'error');
      }
    }

    if (results.length > 0) {
      resultArea.style.display = '';
      ChoiTool.showToast(`${results.length} 件の画像を変換しました`, 'success');
    }
  }

  // --- 結果アイテム表示 ---
  function appendResultItem(originalName, originalSize, convertedSize, newName, index) {
    const item = document.createElement('div');
    item.className = 'result-item';
    item.innerHTML =
      '<div class="result-item-info">' +
        '<div class="result-item-name">' + escapeHTML(newName) + '</div>' +
        '<div class="result-item-meta">' +
          escapeHTML(originalName) + ' (' + ChoiTool.formatFileSize(originalSize) + ') → ' +
          ChoiTool.formatFileSize(convertedSize) +
        '</div>' +
      '</div>' +
      '<button class="btn btn-sm btn-secondary" data-idx="' + index + '">DL</button>';
    resultList.appendChild(item);

    item.querySelector('button').addEventListener('click', () => {
      const r = results[index];
      ChoiTool.downloadBlob(r.blob, r.name);
    });
  }

  // --- 一括ダウンロード ---
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
