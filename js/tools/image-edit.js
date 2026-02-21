/* ============================================
   画像編集 (Fabric.js)
   ============================================ */
(function () {
  // --- DOM要素 ---
  const dropZone = document.getElementById('ie-drop');
  const editorEl = document.getElementById('ie-editor');
  const containerEl = document.getElementById('ie-canvas-container');
  const undoBtn = document.getElementById('ie-undo');
  const redoBtn = document.getElementById('ie-redo');
  const deleteBtn = document.getElementById('ie-delete');
  const clearBtn = document.getElementById('ie-clear');
  const replaceBtn = document.getElementById('ie-replace-image');
  const replaceFile = document.getElementById('ie-replace-file');
  const exportFormat = document.getElementById('ie-export-format');
  const downloadBtn = document.getElementById('ie-download');
  const toolbarBtns = document.querySelectorAll('#ie-toolbar .ie-tool-btn');

  // プロパティパネル
  const propEmpty = document.getElementById('ie-prop-empty');
  const propCommon = document.getElementById('ie-prop-common');
  const propText = document.getElementById('ie-prop-text');
  const propPen = document.getElementById('ie-prop-pen');
  const fillInput = document.getElementById('ie-prop-fill');
  const strokeInput = document.getElementById('ie-prop-stroke');
  const strokeWidthInput = document.getElementById('ie-prop-stroke-width');
  const opacityInput = document.getElementById('ie-prop-opacity');
  const opacityVal = document.getElementById('ie-prop-opacity-val');
  const fontSizeInput = document.getElementById('ie-prop-font-size');
  const boldBtn = document.getElementById('ie-prop-bold');
  const italicBtn = document.getElementById('ie-prop-italic');
  const penColorInput = document.getElementById('ie-prop-pen-color');
  const penWidthInput = document.getElementById('ie-prop-pen-width');
  const penWidthVal = document.getElementById('ie-prop-pen-width-val');
  const fillClearBtn = document.getElementById('ie-fill-clear');
  const strokeClearBtn = document.getElementById('ie-stroke-clear');

  // モザイク・ぼかしプロパティパネル
  const propMosaic = document.getElementById('ie-prop-mosaic');
  const propBlur = document.getElementById('ie-prop-blur');
  const mosaicSizeInput = document.getElementById('ie-mosaic-size');
  const mosaicSizeVal = document.getElementById('ie-mosaic-size-val');
  const blurRadiusInput = document.getElementById('ie-blur-radius');
  const blurRadiusVal = document.getElementById('ie-blur-radius-val');

  // クリア（透明）状態 — デフォルトは塗りクリア（四角・丸は透明塗り）
  let fillIsClear = true;
  let strokeIsClear = false;

  // --- 状態 ---
  let fc = null; // fabric.Canvas
  let sourceFileName = 'edited';
  let originalWidth = 0;
  let originalHeight = 0;
  let currentTool = 'select';
  let undoStack = [];
  let redoStack = [];
  let isUndoRedoing = false;
  let isDrawing = false;
  let startX = 0;
  let startY = 0;
  let tempShape = null;

  // --- ドロップゾーン ---
  ChoiTool.initDropZone('ie-drop', 'ie-file', {
    multiple: false,
    onFiles: handleFile,
  });

  async function handleFile(files) {
    const file = files[0];
    if (!file || !ChoiTool.isImageFile(file)) {
      ChoiTool.showToast('画像ファイルを選択してください', 'error');
      return;
    }
    sourceFileName = file.name;
    try {
      const dataURL = await ChoiTool.readImageAsDataURL(file);
      initEditor(dataURL);
    } catch (e) {
      ChoiTool.showToast('画像の読み込みに失敗しました', 'error');
    }
  }

  // --- エディタ初期化 ---
  function initEditor(imageDataURL) {
    dropZone.style.display = 'none';
    editorEl.style.display = '';

    if (fc) { fc.dispose(); fc = null; }
    undoStack = [];
    redoStack = [];

    const img = new Image();
    img.onload = function () {
      originalWidth = img.width;
      originalHeight = img.height;

      fc = new fabric.Canvas('ie-canvas', {
        width: img.width,
        height: img.height,
        selection: true,
      });

      fc.setBackgroundImage(imageDataURL, function () {
        fc.renderAll();
        saveState();
      }, { originX: 'left', originY: 'top', scaleX: 1, scaleY: 1 });

      setupCanvasEvents();
      setTool('select');

      // 初期クリア状態をUIに反映
      setFillClear(fillIsClear);
      setStrokeClear(strokeIsClear);

      // レイアウト確定後にズーム適用（表示直後はサイズ未確定のため遅延）
      requestAnimationFrame(function () {
        applyZoom();
        ChoiTool.showToast('画像を読み込みました', 'success');
      });
    };
    img.src = imageDataURL;
  }

  // ウィンドウリサイズ時にキャンバスサイズを追従
  window.addEventListener('resize', ChoiTool.debounce(function () {
    if (fc && editorEl.style.display !== 'none') applyZoom();
  }, 200));

  function applyZoom() {
    if (!fc) return;
    // コンテナの実測幅を取得（ツールバー・プロパティパネルを除いた領域）
    var containerW = containerEl.clientWidth;
    // フォールバック: コンテナ幅が取得できない場合はワークスペースから推定
    if (!containerW || containerW < 100) {
      var workspace = containerEl.parentElement;
      var sidebar = 48;   // ツールバー幅
      var props = 180;    // プロパティパネル幅
      containerW = (workspace ? workspace.clientWidth : window.innerWidth) - sidebar - props;
    }
    var maxW = containerW - 32;
    // 横画像のときは幅優先でスケーリングし、高さは制約を緩める
    var isLandscape = originalWidth > originalHeight;
    var viewH = window.innerHeight - 200;
    var maxH = isLandscape
      ? Math.max(viewH, originalHeight * (maxW / originalWidth))
      : Math.max(containerEl.clientHeight, viewH) - 32;
    var scale = Math.min(1, maxW / originalWidth, maxH / originalHeight);
    fc.setZoom(scale);
    fc.setWidth(originalWidth * scale);
    fc.setHeight(originalHeight * scale);
  }

  // --- ツール切り替え ---
  function setTool(name) {
    currentTool = name;
    toolbarBtns.forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.tool === name);
    });

    if (!fc) return;
    fc.isDrawingMode = (name === 'pen');
    fc.selection = (name === 'select');

    if (name === 'pen') {
      fc.freeDrawingBrush = new fabric.PencilBrush(fc);
      fc.freeDrawingBrush.color = penColorInput.value;
      fc.freeDrawingBrush.width = parseInt(penWidthInput.value, 10);
      fc.defaultCursor = 'crosshair';
      showPenProps();
    } else if (name === 'select') {
      fc.defaultCursor = 'default';
      updatePropsFromSelection();
    } else if (name === 'mosaic') {
      fc.defaultCursor = 'crosshair';
      showMosaicProps();
    } else if (name === 'blur') {
      fc.defaultCursor = 'crosshair';
      showBlurProps();
    } else if (name === 'arrow') {
      // 矢印デフォルト: 赤、太さ3
      fc.defaultCursor = 'crosshair';
      setFillClear(false);
      fillInput.value = '#ff0000';
      strokeInput.value = '#ff0000';
      strokeWidthInput.value = 3;
      setStrokeClear(false);
      hideAllProps();
    } else if (name === 'rect' || name === 'ellipse') {
      // 四角・丸デフォルト: 塗りクリア、線赤、太さ2
      fc.defaultCursor = 'crosshair';
      setFillClear(true);
      strokeInput.value = '#ff0000';
      strokeWidthInput.value = 2;
      setStrokeClear(false);
      hideAllProps();
    } else if (name === 'text') {
      // テキストデフォルト: 赤
      fc.defaultCursor = 'crosshair';
      setFillClear(false);
      fillInput.value = '#ff0000';
      hideAllProps();
    } else {
      fc.defaultCursor = 'crosshair';
      hideAllProps();
    }
  }

  toolbarBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setTool(btn.dataset.tool);
    });
  });

  // --- Canvas イベント ---
  function setupCanvasEvents() {
    fc.on('mouse:down', onMouseDown);
    fc.on('mouse:move', onMouseMove);
    fc.on('mouse:up', onMouseUp);
    fc.on('selection:created', onSelectionChange);
    fc.on('selection:updated', onSelectionChange);
    fc.on('selection:cleared', onSelectionCleared);
    fc.on('object:modified', function () { saveState(); });
    fc.on('path:created', function () { saveState(); });
  }

  function getPointer(opt) {
    return fc.getPointer(opt.e);
  }

  function onMouseDown(opt) {
    if (currentTool === 'select' || currentTool === 'pen') return;
    // オブジェクト上のクリックは無視（選択を優先）
    if (opt.target) return;

    var p = getPointer(opt);
    startX = p.x;
    startY = p.y;

    if (currentTool === 'text') {
      addText(p.x, p.y);
      setTool('select');
      return;
    }

    isDrawing = true;
    createTempShape(p.x, p.y);
  }

  function onMouseMove(opt) {
    if (!isDrawing || !tempShape) return;
    var p = getPointer(opt);
    updateTempShape(p.x, p.y);
  }

  function onMouseUp() {
    if (!isDrawing) return;
    isDrawing = false;
    var wasTool = currentTool;
    finalizeTempShape();
    if (wasTool === 'mosaic' || wasTool === 'blur') {
      // モザイク・ぼかしは非同期で背景画像を更新するため、
      // saveState はエフェクト適用関数内で行う。ツールはそのまま維持。
      return;
    }
    setTool('select');
    saveState();
  }

  // --- 図形描画 ---
  function getFillColor() {
    return fillIsClear ? 'transparent' : fillInput.value;
  }

  function getStrokeColor() {
    return strokeIsClear ? 'transparent' : strokeInput.value;
  }

  function createTempShape(x, y) {
    var fill = getFillColor();
    var stroke = getStrokeColor();
    var sw = parseInt(strokeWidthInput.value, 10) || 2;

    switch (currentTool) {
      case 'rect':
        tempShape = new fabric.Rect({
          left: x, top: y, width: 0, height: 0,
          fill: fill, stroke: stroke, strokeWidth: sw,
          selectable: false,
        });
        break;
      case 'ellipse':
        tempShape = new fabric.Ellipse({
          left: x, top: y, rx: 0, ry: 0,
          fill: fill, stroke: stroke, strokeWidth: sw,
          selectable: false,
        });
        break;
      case 'line':
      case 'arrow':
        tempShape = new fabric.Line([x, y, x, y], {
          stroke: stroke, strokeWidth: sw,
          selectable: false,
        });
        break;
      case 'mosaic':
      case 'blur':
        tempShape = new fabric.Rect({
          left: x, top: y, width: 0, height: 0,
          fill: 'rgba(66, 133, 244, 0.2)',
          stroke: 'rgba(66, 133, 244, 0.8)',
          strokeWidth: 1,
          strokeDashArray: [5, 3],
          selectable: false,
        });
        break;
    }
    if (tempShape) fc.add(tempShape);
  }

  function updateTempShape(x, y) {
    if (!tempShape) return;
    switch (currentTool) {
      case 'rect':
        tempShape.set({
          left: Math.min(startX, x), top: Math.min(startY, y),
          width: Math.abs(x - startX), height: Math.abs(y - startY),
        });
        break;
      case 'ellipse':
        var rx = Math.abs(x - startX) / 2;
        var ry = Math.abs(y - startY) / 2;
        tempShape.set({
          left: Math.min(startX, x), top: Math.min(startY, y),
          rx: rx, ry: ry,
        });
        break;
      case 'line':
      case 'arrow':
        tempShape.set({ x2: x, y2: y });
        break;
      case 'mosaic':
      case 'blur':
        tempShape.set({
          left: Math.min(startX, x), top: Math.min(startY, y),
          width: Math.abs(x - startX), height: Math.abs(y - startY),
        });
        break;
    }
    fc.renderAll();
  }

  function finalizeTempShape() {
    if (!tempShape) return;

    // モザイク・ぼかし: 選択範囲に効果を適用して戻る
    if (currentTool === 'mosaic' || currentTool === 'blur') {
      // tempShapeの座標は既にキャンバス論理座標（=画像ピクセル座標）
      var left = Math.round(tempShape.left);
      var top = Math.round(tempShape.top);
      var w = Math.round(tempShape.width);
      var h = Math.round(tempShape.height);

      // 画像範囲にクランプ
      left = Math.max(0, left);
      top = Math.max(0, top);
      w = Math.min(w, originalWidth - left);
      h = Math.min(h, originalHeight - top);

      fc.remove(tempShape);
      tempShape = null;

      if (w > 2 && h > 2) {
        if (currentTool === 'mosaic') {
          applyMosaicToRegion(left, top, w, h, parseInt(mosaicSizeInput.value, 10) || 10);
        } else {
          applyBlurToRegion(left, top, w, h, parseInt(blurRadiusInput.value, 10) || 5);
        }
      }
      return;
    }

    if (currentTool === 'arrow') {
      var x1 = tempShape.x1, y1 = tempShape.y1;
      var x2 = tempShape.x2, y2 = tempShape.y2;
      var angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
      var stroke = tempShape.stroke;
      var sw = tempShape.strokeWidth || 2;
      var headSize = Math.max(10, sw * 3);

      fc.remove(tempShape);

      // グループ内ローカル座標で新規作成
      var cx = (x1 + x2) / 2;
      var cy = (y1 + y2) / 2;
      var line = new fabric.Line([x1 - cx, y1 - cy, x2 - cx, y2 - cy], {
        stroke: stroke, strokeWidth: sw,
        selectable: false,
        originX: 'center', originY: 'center',
      });

      var arrowHead = new fabric.Triangle({
        left: x2 - cx, top: y2 - cy,
        width: headSize, height: headSize,
        fill: stroke,
        angle: angle + 90,
        originX: 'center', originY: 'center',
        selectable: false,
      });

      var group = new fabric.Group([line, arrowHead], {
        left: cx, top: cy,
        originX: 'center', originY: 'center',
        selectable: true,
      });
      fc.add(group);
      fc.setActiveObject(group);
    } else {
      tempShape.set({ selectable: true });
      fc.setActiveObject(tempShape);
    }

    tempShape = null;
  }

  // --- テキスト追加 ---
  function addText(x, y) {
    var textFill = getFillColor() === 'transparent' ? '#ff0000' : getFillColor();
    var text = new fabric.IText('テキスト', {
      left: x, top: y,
      fontSize: parseInt(fontSizeInput.value, 10) || 24,
      fill: textFill,
      fontFamily: 'Meiryo, Yu Gothic, sans-serif',
      editable: true,
    });
    fc.add(text);
    fc.setActiveObject(text);
    text.enterEditing();
    text.selectAll();
    saveState();
  }


  // --- モザイク適用 ---
  function applyMosaicToRegion(left, top, width, height, blockSize) {
    var bgImg = fc.backgroundImage;
    if (!bgImg) return;

    var offCanvas = document.createElement('canvas');
    offCanvas.width = originalWidth;
    offCanvas.height = originalHeight;
    var offCtx = offCanvas.getContext('2d');

    // 現在の背景を描画
    var bgElement = bgImg.getElement();
    offCtx.drawImage(bgElement, 0, 0, originalWidth, originalHeight);

    // 選択領域にモザイクを適用
    var imageData = offCtx.getImageData(left, top, width, height);
    var data = imageData.data;

    for (var y = 0; y < height; y += blockSize) {
      for (var x = 0; x < width; x += blockSize) {
        var bw = Math.min(blockSize, width - x);
        var bh = Math.min(blockSize, height - y);

        // ブロック内の平均色を計算
        var r = 0, g = 0, b = 0, count = 0;
        for (var by = 0; by < bh; by++) {
          for (var bx = 0; bx < bw; bx++) {
            var idx = ((y + by) * width + (x + bx)) * 4;
            r += data[idx]; g += data[idx+1]; b += data[idx+2];
            count++;
          }
        }
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);

        // ブロックを平均色で塗りつぶし
        for (var by = 0; by < bh; by++) {
          for (var bx = 0; bx < bw; bx++) {
            var idx = ((y + by) * width + (x + bx)) * 4;
            data[idx] = r; data[idx+1] = g; data[idx+2] = b;
          }
        }
      }
    }

    offCtx.putImageData(imageData, left, top);

    // 新しい背景として設定
    var newDataURL = offCanvas.toDataURL('image/png');
    fc.setBackgroundImage(newDataURL, function () {
      fc.renderAll();
      saveState();
    }, { originX: 'left', originY: 'top', scaleX: 1, scaleY: 1 });
  }

  // --- ぼかし適用 ---
  function applyBlurToRegion(left, top, width, height, radius) {
    var bgImg = fc.backgroundImage;
    if (!bgImg) return;

    var offCanvas = document.createElement('canvas');
    offCanvas.width = originalWidth;
    offCanvas.height = originalHeight;
    var offCtx = offCanvas.getContext('2d');

    var bgElement = bgImg.getElement();
    offCtx.drawImage(bgElement, 0, 0, originalWidth, originalHeight);

    // Canvas filter でぼかしを適用
    var regionCanvas = document.createElement('canvas');
    regionCanvas.width = width;
    regionCanvas.height = height;
    var regionCtx = regionCanvas.getContext('2d');
    regionCtx.filter = 'blur(' + radius + 'px)';
    regionCtx.drawImage(offCanvas, left, top, width, height, 0, 0, width, height);

    offCtx.drawImage(regionCanvas, left, top);

    var newDataURL = offCanvas.toDataURL('image/png');
    fc.setBackgroundImage(newDataURL, function () {
      fc.renderAll();
      saveState();
    }, { originX: 'left', originY: 'top', scaleX: 1, scaleY: 1 });
  }


  // --- プロパティパネル ---
  function hideAllProps() {
    propEmpty.style.display = '';
    propCommon.style.display = 'none';
    propText.style.display = 'none';
    propPen.style.display = 'none';
    propMosaic.style.display = 'none';
    propBlur.style.display = 'none';
  }

  function showPenProps() {
    propEmpty.style.display = 'none';
    propCommon.style.display = 'none';
    propText.style.display = 'none';
    propPen.style.display = '';
    propMosaic.style.display = 'none';
    propBlur.style.display = 'none';
  }

  function showMosaicProps() {
    propEmpty.style.display = 'none';
    propCommon.style.display = 'none';
    propText.style.display = 'none';
    propPen.style.display = 'none';
    propMosaic.style.display = '';
    propBlur.style.display = 'none';
  }

  function showBlurProps() {
    propEmpty.style.display = 'none';
    propCommon.style.display = 'none';
    propText.style.display = 'none';
    propPen.style.display = 'none';
    propMosaic.style.display = 'none';
    propBlur.style.display = '';
  }

  function onSelectionChange() {
    updatePropsFromSelection();
  }

  function onSelectionCleared() {
    if (currentTool === 'pen') {
      showPenProps();
    } else if (currentTool === 'mosaic') {
      showMosaicProps();
    } else if (currentTool === 'blur') {
      showBlurProps();
    } else {
      hideAllProps();
    }
  }

  function updatePropsFromSelection() {
    if (!fc) return;
    var obj = fc.getActiveObject();
    if (!obj) {
      if (currentTool !== 'pen') hideAllProps();
      return;
    }

    propEmpty.style.display = 'none';
    propCommon.style.display = '';
    propPen.style.display = 'none';

    var isText = (obj.type === 'i-text' || obj.type === 'text');
    propText.style.display = isText ? '' : 'none';

    var objFillClear = (!obj.fill || obj.fill === 'transparent');
    var objStrokeClear = (!obj.stroke || obj.stroke === 'transparent');
    setFillClear(objFillClear);
    setStrokeClear(objStrokeClear);
    if (!objFillClear) fillInput.value = colorToHex(obj.fill) || '#ff0000';
    if (!objStrokeClear) strokeInput.value = colorToHex(obj.stroke) || '#ff0000';
    strokeWidthInput.value = obj.strokeWidth || 0;
    opacityInput.value = Math.round((obj.opacity || 1) * 100);
    opacityVal.textContent = opacityInput.value + '%';

    if (isText) {
      fontSizeInput.value = obj.fontSize || 24;
      boldBtn.classList.toggle('active', obj.fontWeight === 'bold');
      italicBtn.classList.toggle('active', obj.fontStyle === 'italic');
    }
  }

  function colorToHex(c) {
    if (!c || c === 'transparent' || c === '') return null;
    if (c.charAt(0) === '#') return c.length === 7 ? c : c;
    // rgb(r,g,b) → #hex
    var m = c.match(/(\d+)/g);
    if (m && m.length >= 3) {
      return '#' + ((1 << 24) + (parseInt(m[0]) << 16) + (parseInt(m[1]) << 8) + parseInt(m[2]))
        .toString(16).slice(1);
    }
    return null;
  }

  // --- クリアボタン制御 ---
  function setFillClear(clear) {
    fillIsClear = clear;
    fillClearBtn.classList.toggle('active', clear);
    fillInput.classList.toggle('is-clear', clear);
  }

  function setStrokeClear(clear) {
    strokeIsClear = clear;
    strokeClearBtn.classList.toggle('active', clear);
    strokeInput.classList.toggle('is-clear', clear);
  }

  fillClearBtn.addEventListener('click', function () {
    setFillClear(!fillIsClear);
    var obj = fc && fc.getActiveObject();
    if (obj) {
      obj.set('fill', fillIsClear ? 'transparent' : fillInput.value);
      fc.renderAll();
    }
  });

  strokeClearBtn.addEventListener('click', function () {
    setStrokeClear(!strokeIsClear);
    var obj = fc && fc.getActiveObject();
    if (obj) {
      obj.set('stroke', strokeIsClear ? 'transparent' : strokeInput.value);
      fc.renderAll();
    }
  });

  // プロパティ → オブジェクト反映
  fillInput.addEventListener('input', function () {
    if (fillIsClear) setFillClear(false);
    var obj = fc && fc.getActiveObject();
    if (obj) { obj.set('fill', fillInput.value); fc.renderAll(); }
  });

  strokeInput.addEventListener('input', function () {
    if (strokeIsClear) setStrokeClear(false);
    var obj = fc && fc.getActiveObject();
    if (obj) { obj.set('stroke', strokeInput.value); fc.renderAll(); }
  });

  strokeWidthInput.addEventListener('input', function () {
    var obj = fc && fc.getActiveObject();
    if (obj) { obj.set('strokeWidth', parseInt(strokeWidthInput.value, 10) || 0); fc.renderAll(); }
  });

  opacityInput.addEventListener('input', function () {
    opacityVal.textContent = opacityInput.value + '%';
    var obj = fc && fc.getActiveObject();
    if (obj) { obj.set('opacity', parseInt(opacityInput.value, 10) / 100); fc.renderAll(); }
  });

  fontSizeInput.addEventListener('input', function () {
    var obj = fc && fc.getActiveObject();
    if (obj && (obj.type === 'i-text' || obj.type === 'text')) {
      obj.set('fontSize', parseInt(fontSizeInput.value, 10) || 24);
      fc.renderAll();
    }
  });

  boldBtn.addEventListener('click', function () {
    var obj = fc && fc.getActiveObject();
    if (obj && (obj.type === 'i-text' || obj.type === 'text')) {
      var isBold = obj.fontWeight === 'bold';
      obj.set('fontWeight', isBold ? 'normal' : 'bold');
      boldBtn.classList.toggle('active', !isBold);
      fc.renderAll();
    }
  });

  italicBtn.addEventListener('click', function () {
    var obj = fc && fc.getActiveObject();
    if (obj && (obj.type === 'i-text' || obj.type === 'text')) {
      var isItalic = obj.fontStyle === 'italic';
      obj.set('fontStyle', isItalic ? 'normal' : 'italic');
      italicBtn.classList.toggle('active', !isItalic);
      fc.renderAll();
    }
  });

  // ペン設定
  penColorInput.addEventListener('input', function () {
    if (fc && fc.freeDrawingBrush) fc.freeDrawingBrush.color = penColorInput.value;
  });

  penWidthInput.addEventListener('input', function () {
    penWidthVal.textContent = penWidthInput.value + 'px';
    if (fc && fc.freeDrawingBrush) fc.freeDrawingBrush.width = parseInt(penWidthInput.value, 10);
  });

  // モザイク・ぼかし設定
  mosaicSizeInput.addEventListener('input', function () {
    mosaicSizeVal.textContent = mosaicSizeInput.value + 'px';
  });

  blurRadiusInput.addEventListener('input', function () {
    blurRadiusVal.textContent = blurRadiusInput.value + 'px';
  });

  // --- Undo / Redo ---
  var MAX_UNDO = 50;

  function saveState() {
    if (isUndoRedoing || !fc) return;
    var json = JSON.stringify(fc.toJSON());
    undoStack.push(json);
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack = [];
    updateUndoRedoBtns();
  }

  function undo() {
    if (undoStack.length <= 1 || !fc) return;
    isUndoRedoing = true;
    redoStack.push(undoStack.pop());
    var json = undoStack[undoStack.length - 1];
    var bgImage = fc.backgroundImage;
    fc.loadFromJSON(json, function () {
      fc.setBackgroundImage(bgImage, function () {
        applyZoom();
        fc.renderAll();
        isUndoRedoing = false;
        updateUndoRedoBtns();
      });
    });
  }

  function redo() {
    if (redoStack.length === 0 || !fc) return;
    isUndoRedoing = true;
    var json = redoStack.pop();
    undoStack.push(json);
    var bgImage = fc.backgroundImage;
    fc.loadFromJSON(json, function () {
      fc.setBackgroundImage(bgImage, function () {
        applyZoom();
        fc.renderAll();
        isUndoRedoing = false;
        updateUndoRedoBtns();
      });
    });
  }

  function updateUndoRedoBtns() {
    undoBtn.disabled = undoStack.length <= 1;
    redoBtn.disabled = redoStack.length === 0;
  }

  undoBtn.addEventListener('click', undo);
  redoBtn.addEventListener('click', redo);

  // --- 削除 ---
  function deleteSelected() {
    if (!fc) return;
    var active = fc.getActiveObject();
    if (!active) return;
    if (active.type === 'activeSelection') {
      active.forEachObject(function (obj) { fc.remove(obj); });
      fc.discardActiveObject();
    } else {
      fc.remove(active);
    }
    fc.renderAll();
    saveState();
  }

  deleteBtn.addEventListener('click', deleteSelected);

  // --- 全クリア（確認ダイアログ付き） ---
  clearBtn.addEventListener('click', function () {
    if (!fc) return;
    if (fc.getObjects().length === 0) return;
    if (!confirm('すべての描画をクリアしますか？この操作は元に戻せません。')) return;
    fc.getObjects().slice().forEach(function (obj) { fc.remove(obj); });
    fc.discardActiveObject();
    fc.renderAll();
    saveState();
    ChoiTool.showToast('描画をクリアしました', 'info');
  });

  // --- 画像差替 ---
  replaceBtn.addEventListener('click', function () {
    replaceFile.click();
  });

  replaceFile.addEventListener('change', async function () {
    if (replaceFile.files.length) {
      var file = replaceFile.files[0];
      if (!ChoiTool.isImageFile(file)) {
        ChoiTool.showToast('画像ファイルを選択してください', 'error');
        return;
      }
      sourceFileName = file.name;
      try {
        var dataURL = await ChoiTool.readImageAsDataURL(file);
        initEditor(dataURL);
      } catch (e) {
        ChoiTool.showToast('画像の読み込みに失敗しました', 'error');
      }
    }
    replaceFile.value = '';
  });

  // --- ダウンロード ---
  downloadBtn.addEventListener('click', function () {
    if (!fc) return;

    var fmt = exportFormat.value;
    var zoom = fc.getZoom();
    var w = fc.getWidth();
    var h = fc.getHeight();

    // 実寸に戻す
    fc.setZoom(1);
    fc.setWidth(originalWidth);
    fc.setHeight(originalHeight);
    fc.discardActiveObject();
    fc.renderAll();

    var dataURL = fc.toDataURL({
      format: fmt,
      quality: fmt === 'jpeg' ? 0.92 : 1,
      multiplier: 1,
    });

    // ズームを復元
    fc.setZoom(zoom);
    fc.setWidth(w);
    fc.setHeight(h);
    fc.renderAll();

    var ext = fmt === 'jpeg' ? 'jpg' : 'png';
    ChoiTool.downloadDataURL(dataURL, ChoiTool.changeExt(sourceFileName, ext));
    ChoiTool.showToast('画像をダウンロードしました', 'success');
  });

  // --- キーボードショートカット ---
  document.addEventListener('keydown', function (e) {
    var panel = document.getElementById('tool-image-edit');
    if (!panel.classList.contains('active') || !fc) return;

    // テキスト編集中はスキップ
    var active = fc.getActiveObject();
    if (active && active.isEditing) return;

    if (e.key === 'Delete' || e.key === 'Backspace') {
      deleteSelected();
      e.preventDefault();
    }

    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z' && !e.shiftKey) { undo(); e.preventDefault(); }
      if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { redo(); e.preventDefault(); }
    }
  });

  // --- ウィンドウリサイズ時にズーム再適用 ---
  window.addEventListener('resize', ChoiTool.debounce(function () {
    if (fc && editorEl.style.display !== 'none') {
      applyZoom();
      fc.renderAll();
    }
  }, 200));
})();
