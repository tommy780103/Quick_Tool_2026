/* ============================================
   画像圧縮
   ============================================ */
(function () {
  const formatSelect = document.getElementById('icomp-format');
  const qualitySlider = document.getElementById('icomp-quality');
  const qualityVal = document.getElementById('icomp-quality-val');
  const resultArea = document.getElementById('icomp-result');
  const resultList = document.getElementById('icomp-list');
  const downloadAllBtn = document.getElementById('icomp-download-all');

  /** 圧縮結果を保持 */
  let results = [];

  // --- 品質スライダー連動 ---
  qualitySlider.addEventListener('input', () => {
    qualityVal.textContent = qualitySlider.value;
  });

  // --- ドロップゾーン初期化 ---
  ChoiTool.initDropZone('icomp-drop', 'icomp-file', {
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
        const ratio = ((1 - blob.size / file.size) * 100).toFixed(1);

        results.push({ blob, name: newName, originalSize: file.size, ratio });
        appendResultItem(file.name, file.size, blob.size, newName, ratio, results.length - 1);
      } catch (e) {
        ChoiTool.showToast(`${file.name} の圧縮に失敗しました`, 'error');
      }
    }

    if (results.length > 0) {
      resultArea.style.display = '';
      ChoiTool.showToast(`${results.length} 件の画像を圧縮しました`, 'success');
    }
  }

  // --- 結果アイテム表示 ---
  function appendResultItem(originalName, originalSize, compressedSize, newName, ratio, index) {
    const ratioNum = parseFloat(ratio);
    const ratioClass = ratioNum > 0 ? 'good' : 'bad';

    const item = document.createElement('div');
    item.className = 'result-item';
    item.innerHTML =
      '<div class="result-item-info">' +
        '<div class="result-item-name">' + escapeHTML(newName) + '</div>' +
        '<div class="result-item-meta">' +
          ChoiTool.formatFileSize(originalSize) + ' → ' + ChoiTool.formatFileSize(compressedSize) +
        '</div>' +
      '</div>' +
      '<span class="result-item-ratio ' + ratioClass + '">' +
        (ratioNum > 0 ? '-' : '+') + Math.abs(ratioNum) + '%' +
      '</span>' +
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
