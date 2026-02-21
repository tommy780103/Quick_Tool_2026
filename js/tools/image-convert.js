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
        const w = img.naturalWidth;
        const h = img.naturalHeight;

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0);

        const blob = await ChoiTool.canvasToBlob(canvas, format, quality);
        const newName = ChoiTool.changeExt(file.name, ext);

        results.push({
          blob, name: newName, originalSize: file.size,
          img, format, quality,
          width: w, height: h,
          aspectRatio: w / h, aspectLock: true,
        });
        appendResultItem(file.name, results.length - 1);
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
  function appendResultItem(originalName, index) {
    const r = results[index];
    const item = document.createElement('div');
    item.className = 'result-item result-item-with-preview';

    // サムネイル
    const thumb = document.createElement('img');
    thumb.className = 'result-item-thumb';
    thumb.src = URL.createObjectURL(r.blob);
    thumb.addEventListener('click', () => ChoiTool.showImagePreview(thumb.src));

    // 情報
    const info = document.createElement('div');
    info.className = 'result-item-info';
    const nameEl = document.createElement('div');
    nameEl.className = 'result-item-name';
    nameEl.textContent = r.name;
    const metaEl = document.createElement('div');
    metaEl.className = 'result-item-meta';
    const sizeSpan = document.createElement('span');
    sizeSpan.textContent = ChoiTool.formatFileSize(r.blob.size);
    metaEl.appendChild(document.createTextNode(
      originalName + ' (' + ChoiTool.formatFileSize(r.originalSize) + ') → '
    ));
    metaEl.appendChild(sizeSpan);
    info.appendChild(nameEl);
    info.appendChild(metaEl);

    // サイズ変更コントロール
    const sizeCtrl = document.createElement('div');
    sizeCtrl.className = 'result-item-size-ctrl';

    const wInput = createSizeInput(r.width, '幅 (px)');
    const hInput = createSizeInput(r.height, '高さ (px)');
    const sep = document.createElement('span');
    sep.className = 'result-size-sep';
    sep.textContent = '\u00d7';

    const aspectBtn = createAspectBtn(r);

    let updatingSize = false;
    wInput.addEventListener('input', () => {
      if (updatingSize) return;
      const v = parseInt(wInput.value, 10);
      if (!v || v < 1) return;
      r.width = v;
      if (r.aspectLock) {
        updatingSize = true;
        r.height = Math.round(v / r.aspectRatio);
        hInput.value = r.height;
        updatingSize = false;
      }
    });

    hInput.addEventListener('input', () => {
      if (updatingSize) return;
      const v = parseInt(hInput.value, 10);
      if (!v || v < 1) return;
      r.height = v;
      if (r.aspectLock) {
        updatingSize = true;
        r.width = Math.round(v * r.aspectRatio);
        wInput.value = r.width;
        updatingSize = false;
      }
    });

    const applyResize = async () => {
      const newW = parseInt(wInput.value, 10);
      const newH = parseInt(hInput.value, 10);
      if (!newW || !newH || newW < 1 || newH < 1) return;
      r.width = newW;
      r.height = newH;
      try {
        const canvas = ChoiTool.stepDownResize(r.img, newW, newH);
        r.blob = await ChoiTool.canvasToBlob(canvas, r.format, r.quality);
        URL.revokeObjectURL(thumb.src);
        thumb.src = URL.createObjectURL(r.blob);
        sizeSpan.textContent = ChoiTool.formatFileSize(r.blob.size);
      } catch (e) {
        ChoiTool.showToast('リサイズに失敗しました', 'error');
      }
    };
    wInput.addEventListener('change', applyResize);
    hInput.addEventListener('change', applyResize);

    sizeCtrl.appendChild(wInput);
    sizeCtrl.appendChild(sep);
    sizeCtrl.appendChild(hInput);
    sizeCtrl.appendChild(aspectBtn);

    // DLボタン
    const dlBtn = document.createElement('button');
    dlBtn.className = 'btn btn-sm btn-secondary';
    dlBtn.textContent = 'DL';
    dlBtn.addEventListener('click', () => ChoiTool.downloadBlob(r.blob, r.name));

    item.appendChild(thumb);
    item.appendChild(info);
    item.appendChild(sizeCtrl);
    item.appendChild(dlBtn);
    resultList.appendChild(item);
  }

  // --- 一括ダウンロード ---
  downloadAllBtn.addEventListener('click', () => {
    results.forEach((r) => ChoiTool.downloadBlob(r.blob, r.name));
  });

  // --- ヘルパー ---
  function createSizeInput(value, title) {
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'result-size-input';
    input.value = value;
    input.min = 1;
    input.max = 10000;
    input.title = title;
    return input;
  }

  function createAspectBtn(r) {
    const btn = document.createElement('button');
    btn.className = 'result-aspect-btn active';
    btn.title = 'アスペクト比を固定';
    btn.innerHTML = '<svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">' +
      '<path d="M8 1a3 3 0 00-3 3v2H4a1 1 0 00-1 1v6a1 1 0 001 1h8a1 1 0 001-1V7a1 1 0 00-1-1h-1V4a3 3 0 00-3-3zm1.5 5V4a1.5 1.5 0 10-3 0v2h3z"/></svg>';
    btn.addEventListener('click', () => {
      r.aspectLock = !r.aspectLock;
      btn.classList.toggle('active', r.aspectLock);
    });
    return btn;
  }

  // --- リセット ---
  document.getElementById('ic-reset').addEventListener('click', () => {
    results = [];
    resultList.innerHTML = '';
    resultArea.style.display = 'none';
    document.getElementById('ic-file').value = '';
  });

})();
