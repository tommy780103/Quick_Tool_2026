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

  // クリア（透明）状態
  let fillIsClear = false;
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

      // コンテナに収まるようズーム
      applyZoom();

      fc.setBackgroundImage(imageDataURL, function () {
        fc.renderAll();
        saveState();
      }, { originX: 'left', originY: 'top', scaleX: 1, scaleY: 1 });

      setupCanvasEvents();
      setTool('select');
      ChoiTool.showToast('画像を読み込みました', 'success');
    };
    img.src = imageDataURL;
  }

  function applyZoom() {
    if (!fc) return;
    const maxW = containerEl.clientWidth - 32;
    const maxH = containerEl.clientHeight - 32;
    const scale = Math.min(1, maxW / originalWidth, maxH / originalHeight);
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
    fc.on('mouse:dblclick', onDblClick);
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
    if (currentTool === 'comment') {
      addComment(p.x, p.y);
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
    finalizeTempShape();
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
    }
    fc.renderAll();
  }

  function finalizeTempShape() {
    if (!tempShape) return;

    if (currentTool === 'arrow') {
      var x1 = tempShape.x1, y1 = tempShape.y1;
      var x2 = tempShape.x2, y2 = tempShape.y2;
      var angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
      var sw = tempShape.strokeWidth || 2;
      var headSize = Math.max(10, sw * 3);

      var arrowHead = new fabric.Triangle({
        left: x2, top: y2,
        width: headSize, height: headSize,
        fill: tempShape.stroke,
        angle: angle + 90,
        originX: 'center', originY: 'center',
        selectable: false,
      });

      fc.remove(tempShape);
      var group = new fabric.Group([tempShape, arrowHead], { selectable: true });
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
    var text = new fabric.IText('テキスト', {
      left: x, top: y,
      fontSize: parseInt(fontSizeInput.value, 10) || 24,
      fill: getFillColor(),
      fontFamily: 'Meiryo, Yu Gothic, sans-serif',
      editable: true,
    });
    fc.add(text);
    fc.setActiveObject(text);
    text.enterEditing();
    text.selectAll();
    saveState();
  }

  // --- コメント追加 ---
  function addComment(x, y) {
    var textColor = getFillColor() === 'transparent' ? '#ff0000' : getFillColor();
    var textObj = new fabric.IText('コメント', {
      fontSize: 14,
      fill: textColor,
      fontFamily: 'Meiryo, Yu Gothic, sans-serif',
      originX: 'center',
      originY: 'center',
    });

    var pad = 12;
    var borderColor = getStrokeColor() === 'transparent' ? '#ff0000' : getStrokeColor();
    var bg = new fabric.Rect({
      width: textObj.width + pad * 2,
      height: textObj.height + pad * 2,
      fill: '#fffde7',
      stroke: borderColor,
      strokeWidth: 2,
      rx: 6, ry: 6,
      originX: 'center', originY: 'center',
    });

    var group = new fabric.Group([bg, textObj], {
      left: x, top: y,
    });
    group._isComment = true;

    fc.add(group);
    fc.setActiveObject(group);
    saveState();
  }

  // --- ダブルクリック → コメント編集 ---
  function onDblClick(opt) {
    var target = opt.target;
    if (!target || target.type !== 'group') return;

    var items = target.getObjects();
    var textItem = items.find(function (o) { return o.type === 'i-text'; });
    if (!textItem) return;

    var left = target.left;
    var top = target.top;
    var isComment = target._isComment;

    // グループ解除
    fc.remove(target);
    items.forEach(function (item) {
      item.set({
        left: left + (item.left || 0),
        top: top + (item.top || 0),
      });
      item.setCoords();
      fc.add(item);
    });

    fc.setActiveObject(textItem);
    textItem.enterEditing();
    textItem.selectAll();
    fc.renderAll();

    textItem.on('editing:exited', function regroup() {
      textItem.off('editing:exited', regroup);

      // 背景のサイズをテキストに合わせて更新
      var rectItem = items.find(function (o) { return o.type === 'rect'; });
      if (rectItem) {
        rectItem.set({
          width: textItem.width + 24,
          height: textItem.height + 24,
        });
      }

      // 位置を取得してから全アイテム削除
      var newLeft = textItem.left - (textItem.width / 2);
      var newTop = textItem.top - (textItem.height / 2);
      if (rectItem) {
        newLeft = Math.min(newLeft, rectItem.left);
        newTop = Math.min(newTop, rectItem.top);
      }

      items.forEach(function (item) { fc.remove(item); });

      // origin をリセットして再グループ化
      items.forEach(function (item) {
        item.set({ left: 0, top: 0 });
      });
      textItem.set({ originX: 'center', originY: 'center', left: 0, top: 0 });
      if (rectItem) rectItem.set({ originX: 'center', originY: 'center', left: 0, top: 0 });

      var newGroup = new fabric.Group(items, { left: left, top: top });
      newGroup._isComment = isComment;
      fc.add(newGroup);
      fc.setActiveObject(newGroup);
      fc.renderAll();
      saveState();
    });
  }

  // --- プロパティパネル ---
  function hideAllProps() {
    propEmpty.style.display = '';
    propCommon.style.display = 'none';
    propText.style.display = 'none';
    propPen.style.display = 'none';
  }

  function showPenProps() {
    propEmpty.style.display = 'none';
    propCommon.style.display = 'none';
    propText.style.display = 'none';
    propPen.style.display = '';
  }

  function onSelectionChange() {
    updatePropsFromSelection();
  }

  function onSelectionCleared() {
    if (currentTool === 'pen') {
      showPenProps();
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

  // --- 全クリア ---
  clearBtn.addEventListener('click', function () {
    if (!fc) return;
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
