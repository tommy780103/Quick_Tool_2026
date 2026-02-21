/* ============================================
   画像リサイズ
   ============================================ */
(function () {
  const settingsPanel = document.getElementById('ir-settings');
  const originalSizeEl = document.getElementById('ir-original-size');
  const modeSelect = document.getElementById('ir-mode');
  const pxRow = document.getElementById('ir-px-row');
  const percentRow = document.getElementById('ir-percent-row');
  const widthInput = document.getElementById('ir-width');
  const heightInput = document.getElementById('ir-height');
  const scaleSlider = document.getElementById('ir-scale');
  const scaleVal = document.getElementById('ir-scale-val');
  const aspectCheckbox = document.getElementById('ir-aspect');
  const formatSelect = document.getElementById('ir-format');
  const executeBtn = document.getElementById('ir-execute');
  const resultArea = document.getElementById('ir-result');
  const previewEl = document.getElementById('ir-preview');
  const infoEl = document.getElementById('ir-info');
  const downloadBtn = document.getElementById('ir-download');

  let sourceImg = null;
  let sourceFile = null;
  let resultBlob = null;
  let resultName = '';
  let aspectRatio = 1;
  let updatingField = false;

  // --- スケールスライダー連動 ---
  scaleSlider.addEventListener('input', () => {
    scaleVal.textContent = scaleSlider.value;
  });

  // --- モード切替 ---
  modeSelect.addEventListener('change', () => {
    const isPx = modeSelect.value === 'px';
    pxRow.style.display = isPx ? '' : 'none';
    percentRow.style.display = isPx ? 'none' : '';
  });

  // --- アスペクト比ロック: 幅変更で高さ追従 ---
  widthInput.addEventListener('input', () => {
    if (aspectCheckbox.checked && sourceImg && !updatingField) {
      updatingField = true;
      heightInput.value = Math.round(parseInt(widthInput.value, 10) / aspectRatio) || '';
      updatingField = false;
    }
  });

  // --- アスペクト比ロック: 高さ変更で幅追従 ---
  heightInput.addEventListener('input', () => {
    if (aspectCheckbox.checked && sourceImg && !updatingField) {
      updatingField = true;
      widthInput.value = Math.round(parseInt(heightInput.value, 10) * aspectRatio) || '';
      updatingField = false;
    }
  });

  // --- ドロップゾーン初期化 ---
  ChoiTool.initDropZone('ir-drop', 'ir-file', {
    multiple: false,
    onFiles: handleFile,
  });

  // --- ファイル読み込み ---
  async function handleFile(files) {
    const file = files[0];
    if (!file || !ChoiTool.isImageFile(file)) {
      ChoiTool.showToast('画像ファイルを選択してください', 'error');
      return;
    }

    sourceFile = file;
    resultArea.style.display = 'none';

    try {
      const dataURL = await ChoiTool.readImageAsDataURL(file);
      sourceImg = await ChoiTool.loadImage(dataURL);
      aspectRatio = sourceImg.naturalWidth / sourceImg.naturalHeight;

      originalSizeEl.textContent =
        sourceImg.naturalWidth + ' x ' + sourceImg.naturalHeight + ' px';

      widthInput.value = sourceImg.naturalWidth;
      heightInput.value = sourceImg.naturalHeight;
      scaleSlider.value = 100;
      scaleVal.textContent = '100';

      settingsPanel.style.display = '';
      ChoiTool.showToast('画像を読み込みました', 'success');
    } catch (e) {
      ChoiTool.showToast('画像の読み込みに失敗しました', 'error');
    }
  }

  // --- リサイズ実行 ---
  executeBtn.addEventListener('click', async () => {
    if (!sourceImg) return;

    let newW, newH;

    if (modeSelect.value === 'px') {
      newW = parseInt(widthInput.value, 10);
      newH = parseInt(heightInput.value, 10);
    } else {
      const scale = parseInt(scaleSlider.value, 10) / 100;
      newW = Math.round(sourceImg.naturalWidth * scale);
      newH = Math.round(sourceImg.naturalHeight * scale);
    }

    if (!newW || !newH || newW < 1 || newH < 1) {
      ChoiTool.showToast('有効なサイズを指定してください', 'error');
      return;
    }

    try {
      const canvas = stepDownResize(sourceImg, newW, newH);
      const format = formatSelect.value;
      const quality = 0.92;
      resultBlob = await ChoiTool.canvasToBlob(canvas, format, quality);
      resultName = ChoiTool.changeExt(sourceFile.name, ChoiTool.mimeToExt(format));

      // プレビュー
      previewEl.innerHTML = '';
      const previewImg = document.createElement('img');
      previewImg.src = URL.createObjectURL(resultBlob);
      previewImg.style.maxWidth = '100%';
      previewEl.appendChild(previewImg);

      // 情報
      infoEl.innerHTML =
        '<div>' + newW + ' x ' + newH + ' px</div>' +
        '<div>ファイルサイズ: ' + ChoiTool.formatFileSize(resultBlob.size) + '</div>';

      resultArea.style.display = '';
      ChoiTool.showToast('リサイズが完了しました', 'success');
    } catch (e) {
      ChoiTool.showToast('リサイズに失敗しました', 'error');
    }
  });

  // --- ダウンロード ---
  downloadBtn.addEventListener('click', () => {
    if (resultBlob) {
      ChoiTool.downloadBlob(resultBlob, resultName);
    }
  });

  // --- 高品質ステップダウンリサイズ ---
  function stepDownResize(img, targetW, targetH) {
    let currentW = img.naturalWidth;
    let currentH = img.naturalHeight;

    // ソースcanvas
    let src = document.createElement('canvas');
    src.width = currentW;
    src.height = currentH;
    src.getContext('2d').drawImage(img, 0, 0);

    // 段階的に半分ずつ縮小（2倍以上の縮小時）
    while (currentW / 2 > targetW && currentH / 2 > targetH) {
      const halfW = Math.round(currentW / 2);
      const halfH = Math.round(currentH / 2);
      const tmp = document.createElement('canvas');
      tmp.width = halfW;
      tmp.height = halfH;
      tmp.getContext('2d').drawImage(src, 0, 0, halfW, halfH);
      src = tmp;
      currentW = halfW;
      currentH = halfH;
    }

    // 最終サイズへ
    if (currentW !== targetW || currentH !== targetH) {
      const final = document.createElement('canvas');
      final.width = targetW;
      final.height = targetH;
      final.getContext('2d').drawImage(src, 0, 0, targetW, targetH);
      return final;
    }

    return src;
  }

  // --- リセット ---
  document.getElementById('ir-reset').addEventListener('click', () => {
    sourceImg = null;
    sourceFile = null;
    resultBlob = null;
    resultName = '';
    settingsPanel.style.display = 'none';
    resultArea.style.display = 'none';
    previewEl.innerHTML = '';
    infoEl.innerHTML = '';
    document.getElementById('ir-file').value = '';
  });
})();
