/* ============================================
   画像リサイズ / トリミング
   ============================================ */
(function () {
  const settingsPanel = document.getElementById('ir-settings');
  const originalSizeEl = document.getElementById('ir-original-size');
  const modeSelect = document.getElementById('ir-mode');
  const pxRow = document.getElementById('ir-px-row');
  const percentRow = document.getElementById('ir-percent-row');
  const cropRow = document.getElementById('ir-crop-row');
  const aspectRow = document.getElementById('ir-aspect-row');
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
  const cropSizeEl = document.getElementById('ir-crop-size');

  let sourceImg = null;
  let sourceFile = null;
  let resultBlob = null;
  let resultName = '';
  let aspectRatio = 1;
  let updatingField = false;

  // --- トリミング状態 ---
  let cropCanvas = null;
  let cropCtx = null;
  let displayScale = 1;
  let cropRect = { x: 0, y: 0, w: 0, h: 0 };
  let cropAspectRatio = null;
  let dragState = null;

  const HANDLE_SIZE = 8;
  const HANDLE_HIT = 14;
  const MIN_CROP = 20;

  const HANDLE_CURSORS = {
    nw: 'nw-resize', ne: 'ne-resize', sw: 'sw-resize', se: 'se-resize',
    n: 'ns-resize', s: 'ns-resize', w: 'ew-resize', e: 'ew-resize',
  };

  // --- スケールスライダー連動 ---
  scaleSlider.addEventListener('input', () => {
    scaleVal.textContent = scaleSlider.value;
  });

  // --- モード切替 ---
  modeSelect.addEventListener('change', () => {
    const mode = modeSelect.value;
    pxRow.style.display = mode === 'px' ? '' : 'none';
    percentRow.style.display = mode === 'percent' ? '' : 'none';
    cropRow.style.display = mode === 'crop' ? '' : 'none';
    aspectRow.style.display = mode === 'crop' ? 'none' : '';
    executeBtn.textContent = mode === 'crop' ? 'トリミング実行' : 'リサイズ実行';

    if (mode === 'crop' && sourceImg) {
      requestAnimationFrame(() => initCropMode());
    }
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

      if (modeSelect.value === 'crop') {
        requestAnimationFrame(() => initCropMode());
      }

      ChoiTool.showToast('画像を読み込みました', 'success');
    } catch (e) {
      ChoiTool.showToast('画像の読み込みに失敗しました', 'error');
    }
  }

  // ============================================
  // トリミングモード
  // ============================================

  function initCropMode() {
    if (!sourceImg) return;

    const workspace = document.getElementById('ir-crop-workspace');
    cropCanvas = document.getElementById('ir-crop-canvas');
    cropCtx = cropCanvas.getContext('2d');

    const maxW = workspace.clientWidth - 16 || 600;
    const maxH = 500;
    displayScale = Math.min(maxW / sourceImg.naturalWidth, maxH / sourceImg.naturalHeight, 1);

    cropCanvas.width = Math.round(sourceImg.naturalWidth * displayScale);
    cropCanvas.height = Math.round(sourceImg.naturalHeight * displayScale);

    // 初期クロップ範囲 = 全体
    cropRect = { x: 0, y: 0, w: cropCanvas.width, h: cropCanvas.height };
    cropAspectRatio = null;
    dragState = null;

    // 比率ボタンリセット
    document.querySelectorAll('.ir-crop-ratio-btn').forEach(b => b.classList.remove('active'));
    var freeBtn = document.querySelector('.ir-crop-ratio-btn[data-ratio="free"]');
    if (freeBtn) freeBtn.classList.add('active');

    drawCropOverlay();
    updateCropSizeDisplay();

    // イベント登録（重複防止のため一旦解除）
    cropCanvas.removeEventListener('mousedown', onCropMouseDown);
    cropCanvas.removeEventListener('mousemove', onCropHover);
    document.removeEventListener('mousemove', onCropDragMove);
    document.removeEventListener('mouseup', onCropMouseUp);
    cropCanvas.removeEventListener('touchstart', onCropTouchStart);
    document.removeEventListener('touchmove', onCropTouchMove);
    document.removeEventListener('touchend', onCropTouchEnd);

    cropCanvas.addEventListener('mousedown', onCropMouseDown);
    cropCanvas.addEventListener('mousemove', onCropHover);
    document.addEventListener('mouseup', onCropMouseUp);
    cropCanvas.addEventListener('touchstart', onCropTouchStart, { passive: false });
    document.addEventListener('touchmove', onCropTouchMove, { passive: false });
    document.addEventListener('touchend', onCropTouchEnd);
  }

  // --- 比率ボタン ---
  document.querySelectorAll('.ir-crop-ratio-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.ir-crop-ratio-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');

      var ratio = btn.dataset.ratio;
      if (ratio === 'free') {
        cropAspectRatio = null;
      } else {
        var parts = ratio.split(':');
        cropAspectRatio = Number(parts[0]) / Number(parts[1]);
        applyCropAspectRatio();
      }
      drawCropOverlay();
      updateCropSizeDisplay();
    });
  });

  function applyCropAspectRatio() {
    if (!cropAspectRatio || !cropCanvas) return;

    var cw = cropCanvas.width;
    var ch = cropCanvas.height;
    var cx = cropRect.x + cropRect.w / 2;
    var cy = cropRect.y + cropRect.h / 2;

    var newW = cropRect.w;
    var newH = newW / cropAspectRatio;

    if (newH > cropRect.h) {
      newH = cropRect.h;
      newW = newH * cropAspectRatio;
    }
    if (newW > cw) { newW = cw; newH = newW / cropAspectRatio; }
    if (newH > ch) { newH = ch; newW = newH * cropAspectRatio; }

    var newX = cx - newW / 2;
    var newY = cy - newH / 2;
    if (newX < 0) newX = 0;
    if (newY < 0) newY = 0;
    if (newX + newW > cw) newX = cw - newW;
    if (newY + newH > ch) newY = ch - newH;

    cropRect = { x: Math.round(newX), y: Math.round(newY), w: Math.round(newW), h: Math.round(newH) };
  }

  // --- 描画 ---
  function drawCropOverlay() {
    if (!cropCtx || !cropCanvas || !sourceImg) return;

    var w = cropCanvas.width;
    var h = cropCanvas.height;
    var c = cropRect;

    cropCtx.clearRect(0, 0, w, h);

    // 画像描画
    cropCtx.drawImage(sourceImg, 0, 0, w, h);

    // 選択範囲外のオーバーレイ
    cropCtx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    cropCtx.fillRect(0, 0, w, c.y);
    cropCtx.fillRect(0, c.y + c.h, w, h - c.y - c.h);
    cropCtx.fillRect(0, c.y, c.x, c.h);
    cropCtx.fillRect(c.x + c.w, c.y, w - c.x - c.w, c.h);

    // 選択枠
    cropCtx.strokeStyle = '#fff';
    cropCtx.lineWidth = 2;
    cropCtx.strokeRect(c.x, c.y, c.w, c.h);

    // 三分割ガイド
    if (c.w > 40 && c.h > 40) {
      cropCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      cropCtx.lineWidth = 1;
      for (var i = 1; i <= 2; i++) {
        var lx = c.x + c.w * i / 3;
        var ly = c.y + c.h * i / 3;
        cropCtx.beginPath();
        cropCtx.moveTo(lx, c.y);
        cropCtx.lineTo(lx, c.y + c.h);
        cropCtx.stroke();
        cropCtx.beginPath();
        cropCtx.moveTo(c.x, ly);
        cropCtx.lineTo(c.x + c.w, ly);
        cropCtx.stroke();
      }
    }

    // ハンドル描画
    var handles = getHandlePositions();
    cropCtx.shadowColor = 'rgba(0,0,0,0.3)';
    cropCtx.shadowBlur = 3;
    for (var key in handles) {
      var hp = handles[key];
      cropCtx.fillStyle = '#fff';
      cropCtx.fillRect(hp.x - HANDLE_SIZE / 2, hp.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
      cropCtx.shadowColor = 'transparent';
      cropCtx.shadowBlur = 0;
      cropCtx.strokeStyle = '#0078d4';
      cropCtx.lineWidth = 2;
      cropCtx.strokeRect(hp.x - HANDLE_SIZE / 2, hp.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
      cropCtx.shadowColor = 'rgba(0,0,0,0.3)';
      cropCtx.shadowBlur = 3;
    }
    cropCtx.shadowColor = 'transparent';
    cropCtx.shadowBlur = 0;
  }

  function getHandlePositions() {
    var c = cropRect;
    return {
      nw: { x: c.x, y: c.y },
      n:  { x: c.x + c.w / 2, y: c.y },
      ne: { x: c.x + c.w, y: c.y },
      w:  { x: c.x, y: c.y + c.h / 2 },
      e:  { x: c.x + c.w, y: c.y + c.h / 2 },
      sw: { x: c.x, y: c.y + c.h },
      s:  { x: c.x + c.w / 2, y: c.y + c.h },
      se: { x: c.x + c.w, y: c.y + c.h },
    };
  }

  function hitTestHandle(x, y) {
    var handles = getHandlePositions();
    for (var key in handles) {
      if (Math.abs(x - handles[key].x) <= HANDLE_HIT && Math.abs(y - handles[key].y) <= HANDLE_HIT) {
        return key;
      }
    }
    return null;
  }

  function isInsideCrop(x, y) {
    return x >= cropRect.x && x <= cropRect.x + cropRect.w &&
           y >= cropRect.y && y <= cropRect.y + cropRect.h;
  }

  function getCanvasCoords(e) {
    var rect = cropCanvas.getBoundingClientRect();
    var sx = cropCanvas.width / rect.width;
    var sy = cropCanvas.height / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  }

  // --- マウスイベント ---
  function onCropMouseDown(e) {
    var pos = getCanvasCoords(e);
    var handle = hitTestHandle(pos.x, pos.y);

    if (handle) {
      dragState = { type: 'resize', handle: handle, startX: pos.x, startY: pos.y, startCrop: { x: cropRect.x, y: cropRect.y, w: cropRect.w, h: cropRect.h } };
      e.preventDefault();
    } else if (isInsideCrop(pos.x, pos.y)) {
      dragState = { type: 'move', startX: pos.x, startY: pos.y, startCrop: { x: cropRect.x, y: cropRect.y, w: cropRect.w, h: cropRect.h } };
      cropCanvas.style.cursor = 'grabbing';
      e.preventDefault();
    } else {
      // 範囲外クリック → 新しいクロップ開始
      cropRect = { x: pos.x, y: pos.y, w: 0, h: 0 };
      dragState = { type: 'resize', handle: 'se', startX: pos.x, startY: pos.y, startCrop: { x: pos.x, y: pos.y, w: 0, h: 0 } };
      e.preventDefault();
    }
    // ドラッグ中はdocumentレベルでmousemoveを処理
    document.addEventListener('mousemove', onCropDragMove);
  }

  function onCropHover(e) {
    if (dragState) return;
    var pos = getCanvasCoords(e);
    var handle = hitTestHandle(pos.x, pos.y);
    if (handle) {
      cropCanvas.style.cursor = HANDLE_CURSORS[handle];
    } else if (isInsideCrop(pos.x, pos.y)) {
      cropCanvas.style.cursor = 'grab';
    } else {
      cropCanvas.style.cursor = 'crosshair';
    }
  }

  function onCropDragMove(e) {
    if (!dragState) return;
    var pos = getCanvasCoords(e);
    var dx = pos.x - dragState.startX;
    var dy = pos.y - dragState.startY;
    var sc = dragState.startCrop;
    var cw = cropCanvas.width;
    var ch = cropCanvas.height;

    if (dragState.type === 'move') {
      var newX = Math.max(0, Math.min(sc.x + dx, cw - sc.w));
      var newY = Math.max(0, Math.min(sc.y + dy, ch - sc.h));
      cropRect = { x: newX, y: newY, w: sc.w, h: sc.h };
    } else {
      resizeCrop(dragState.handle, dx, dy, sc, cw, ch);
    }

    drawCropOverlay();
    updateCropSizeDisplay();
  }

  function onCropMouseUp() {
    if (!dragState) return;
    document.removeEventListener('mousemove', onCropDragMove);
    dragState = null;
    if (cropCanvas) cropCanvas.style.cursor = 'crosshair';
    // 極小クロップ防止
    if (cropRect.w < MIN_CROP || cropRect.h < MIN_CROP) {
      cropRect = { x: 0, y: 0, w: cropCanvas.width, h: cropCanvas.height };
      if (cropAspectRatio) applyCropAspectRatio();
      drawCropOverlay();
      updateCropSizeDisplay();
    }
  }

  // --- タッチイベント ---
  function onCropTouchStart(e) {
    if (e.touches.length !== 1) return;
    var t = e.touches[0];
    onCropMouseDown({ clientX: t.clientX, clientY: t.clientY, preventDefault: function () { e.preventDefault(); } });
  }

  function onCropTouchMove(e) {
    if (!dragState || e.touches.length !== 1) return;
    e.preventDefault();
    var t = e.touches[0];
    onCropDragMove({ clientX: t.clientX, clientY: t.clientY });
  }

  function onCropTouchEnd() {
    onCropMouseUp();
  }

  // --- クロップ領域のリサイズ ---
  function resizeCrop(handle, dx, dy, sc, cw, ch) {
    var x1 = sc.x, y1 = sc.y, x2 = sc.x + sc.w, y2 = sc.y + sc.h;

    if (handle.indexOf('n') !== -1) y1 = sc.y + dy;
    if (handle.indexOf('s') !== -1) y2 = sc.y + sc.h + dy;
    if (handle.indexOf('w') !== -1) x1 = sc.x + dx;
    if (handle.indexOf('e') !== -1) x2 = sc.x + sc.w + dx;

    // アスペクト比制約
    if (cropAspectRatio) {
      var newW = x2 - x1;
      var newH = y2 - y1;

      if (handle.length === 2) {
        // コーナー: 幅基準で高さを算出
        var desiredH = Math.abs(newW) / cropAspectRatio;
        if (handle.indexOf('n') !== -1) {
          y1 = y2 - desiredH;
        } else {
          y2 = y1 + desiredH;
        }
      } else if (handle === 'e' || handle === 'w') {
        var dH = Math.abs(newW) / cropAspectRatio;
        var cy = (y1 + y2) / 2;
        y1 = cy - dH / 2;
        y2 = cy + dH / 2;
      } else {
        var dW = Math.abs(newH) * cropAspectRatio;
        var cx = (x1 + x2) / 2;
        x1 = cx - dW / 2;
        x2 = cx + dW / 2;
      }
    }

    // 最小サイズ
    if (x2 - x1 < MIN_CROP) {
      if (handle.indexOf('w') !== -1) x1 = x2 - MIN_CROP; else x2 = x1 + MIN_CROP;
    }
    if (y2 - y1 < MIN_CROP) {
      if (handle.indexOf('n') !== -1) y1 = y2 - MIN_CROP; else y2 = y1 + MIN_CROP;
    }

    // キャンバス範囲内にクランプ
    if (x1 < 0) x1 = 0;
    if (y1 < 0) y1 = 0;
    if (x2 > cw) x2 = cw;
    if (y2 > ch) y2 = ch;

    cropRect = {
      x: Math.round(Math.min(x1, x2)),
      y: Math.round(Math.min(y1, y2)),
      w: Math.round(Math.abs(x2 - x1)),
      h: Math.round(Math.abs(y2 - y1)),
    };
  }

  function updateCropSizeDisplay() {
    if (!cropSizeEl || !sourceImg) return;
    var actual = getActualCropRect();
    cropSizeEl.textContent = actual.w + ' x ' + actual.h + ' px';
  }

  function getActualCropRect() {
    return {
      x: Math.round(cropRect.x / displayScale),
      y: Math.round(cropRect.y / displayScale),
      w: Math.round(cropRect.w / displayScale),
      h: Math.round(cropRect.h / displayScale),
    };
  }

  // ============================================
  // リサイズ / トリミング実行
  // ============================================

  executeBtn.addEventListener('click', async () => {
    if (!sourceImg) return;

    var newW, newH;
    var canvas;

    if (modeSelect.value === 'crop') {
      var actual = getActualCropRect();
      if (actual.w < 1 || actual.h < 1) {
        ChoiTool.showToast('有効な範囲を選択してください', 'error');
        return;
      }
      canvas = document.createElement('canvas');
      canvas.width = actual.w;
      canvas.height = actual.h;
      canvas.getContext('2d').drawImage(
        sourceImg,
        actual.x, actual.y, actual.w, actual.h,
        0, 0, actual.w, actual.h
      );
      newW = actual.w;
      newH = actual.h;
    } else {
      if (modeSelect.value === 'px') {
        newW = parseInt(widthInput.value, 10);
        newH = parseInt(heightInput.value, 10);
      } else {
        var scale = parseInt(scaleSlider.value, 10) / 100;
        newW = Math.round(sourceImg.naturalWidth * scale);
        newH = Math.round(sourceImg.naturalHeight * scale);
      }
      if (!newW || !newH || newW < 1 || newH < 1) {
        ChoiTool.showToast('有効なサイズを指定してください', 'error');
        return;
      }
      canvas = stepDownResize(sourceImg, newW, newH);
    }

    try {
      var format = formatSelect.value;
      var quality = 0.92;
      resultBlob = await ChoiTool.canvasToBlob(canvas, format, quality);
      resultName = ChoiTool.changeExt(sourceFile.name, ChoiTool.mimeToExt(format));

      previewEl.innerHTML = '';
      var previewImg = document.createElement('img');
      previewImg.src = URL.createObjectURL(resultBlob);
      previewImg.style.maxWidth = '100%';
      previewEl.appendChild(previewImg);

      infoEl.innerHTML =
        '<div>' + newW + ' x ' + newH + ' px</div>' +
        '<div>ファイルサイズ: ' + ChoiTool.formatFileSize(resultBlob.size) + '</div>';

      resultArea.style.display = '';
      ChoiTool.showToast(modeSelect.value === 'crop' ? 'トリミングが完了しました' : 'リサイズが完了しました', 'success');
    } catch (e) {
      ChoiTool.showToast('処理に失敗しました', 'error');
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

    let src = document.createElement('canvas');
    src.width = currentW;
    src.height = currentH;
    src.getContext('2d').drawImage(img, 0, 0);

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
    dragState = null;
    cropCanvas = null;
    cropCtx = null;
    settingsPanel.style.display = 'none';
    resultArea.style.display = 'none';
    previewEl.innerHTML = '';
    infoEl.innerHTML = '';
    document.getElementById('ir-file').value = '';
  });
})();
