/* ============================================
   SNS画像作成（コラージュ分割 + テキスト）
   Fabric.js ベース
   ============================================ */
(function () {
  'use strict';

  // --- DOM要素 ---
  var presetEl    = document.getElementById('si-preset');
  var customWrap  = document.getElementById('si-custom');
  var customW     = document.getElementById('si-custom-w');
  var customH     = document.getElementById('si-custom-h');
  var framesEl    = document.getElementById('si-frames');
  var framesVal   = document.getElementById('si-frames-val');
  var layoutEl    = document.getElementById('si-layout');
  var gapEl       = document.getElementById('si-gap');
  var gapVal      = document.getElementById('si-gap-val');
  var bgEl        = document.getElementById('si-bg');
  var addTextBtn  = document.getElementById('si-add-text');
  var fontEl      = document.getElementById('si-font');
  var fontSizeEl  = document.getElementById('si-font-size');
  var textColorEl = document.getElementById('si-text-color');
  var boldBtn     = document.getElementById('si-text-bold');
  var outlineBtn  = document.getElementById('si-text-outline');
  var deleteBtn   = document.getElementById('si-delete');
  var workspace   = document.getElementById('si-workspace');
  var frameFileEl = document.getElementById('si-frame-file');
  var formatEl    = document.getElementById('si-format');
  var resetBtn    = document.getElementById('si-reset');
  var downloadBtn = document.getElementById('si-download');
  var canvasEl    = document.getElementById('si-canvas');

  if (!canvasEl || typeof fabric === 'undefined') return;

  // --- プリセット ---
  var PRESETS = [
    { id: 'yt',          label: 'YouTube サムネイル（1280×720）',     w: 1280, h: 720 },
    { id: 'tiktok',      label: 'TikTok / リール / ショート（1080×1920）', w: 1080, h: 1920 },
    { id: 'ig-square',   label: 'Instagram 正方形（1080×1080）',       w: 1080, h: 1080 },
    { id: 'ig-portrait', label: 'Instagram 縦長（1080×1350）',         w: 1080, h: 1350 },
    { id: 'ig-story',    label: 'Instagram ストーリー（1080×1920）',    w: 1080, h: 1920 },
    { id: 'x',           label: 'X（Twitter）横長（1600×900）',         w: 1600, h: 900 },
    { id: 'custom',      label: 'カスタム', w: 1080, h: 1080 }
  ];

  // --- 状態 ---
  var state = { w: 1280, h: 720, frames: 1, layout: 'grid', gap: 8, bg: '#ffffff' };

  var fc = null;          // fabric.Canvas
  var cells = [];         // [{x,y,w,h}]
  var frameImages = [];   // dataURL（index = フレーム番号、未設定は undefined）
  var frameImgObjs = [];  // fabric.Image
  var cellRects = [];     // fabric.Rect（空フレーム枠）
  var activeFrameIndex = -1;
  var boldOn = false;
  var outlineOn = false;

  // --- レイアウト計算 ---
  function computeCells(W, H, n, layout, gap) {
    var cols, rows;
    if (layout === 'horizontal') { cols = n; rows = 1; }
    else if (layout === 'vertical') { cols = 1; rows = n; }
    else { cols = Math.ceil(Math.sqrt(n)); rows = Math.ceil(n / cols); }

    var cellW = Math.max(1, (W - gap * (cols + 1)) / cols);
    var cellH = Math.max(1, (H - gap * (rows + 1)) / rows);

    var list = [];
    for (var i = 0; i < n; i++) {
      var r = Math.floor(i / cols);
      var c = i % cols;
      list.push({
        x: gap + c * (cellW + gap),
        y: gap + r * (cellH + gap),
        w: cellW,
        h: cellH
      });
    }
    return list;
  }

  // --- レイヤー順を整える（枠→画像→テキスト） ---
  function reorderLayers() {
    if (!fc) return;
    var rects = [], imgs = [], others = [];
    fc.getObjects().forEach(function (o) {
      var type = o.data && o.data.type;
      if (type === 'cellRect') rects.push(o);
      else if (type === 'frameImage') imgs.push(o);
      else others.push(o);
    });
    var ordered = rects.concat(imgs, others);
    ordered.forEach(function (o, idx) { fc.moveTo(o, idx); });
    fc.renderAll();
  }

  // --- 空フレームの枠を追加 ---
  function addCellRect(i) {
    var cell = cells[i];
    var rect = new fabric.Rect({
      left: cell.x, top: cell.y, width: cell.w, height: cell.h,
      fill: '#eceef1',
      stroke: '#b9bfc7', strokeWidth: 1, strokeDashArray: [7, 5],
      selectable: false, evented: true, hoverCursor: 'pointer'
    });
    rect.data = { type: 'cellRect', frameIndex: i };
    fc.add(rect);
    cellRects[i] = rect;
  }

  // --- フレームに画像を配置（cover + クリップ） ---
  function placeImageInCell(i, dataURL) {
    var cell = cells[i];
    fabric.Image.fromURL(dataURL, function (img) {
      if (!fc || !cells[i]) return;
      var c = cells[i];
      var scale = Math.max(c.w / img.width, c.h / img.height);
      img.set({
        left: c.x + c.w / 2,
        top: c.y + c.h / 2,
        originX: 'center', originY: 'center',
        scaleX: scale, scaleY: scale,
        clipPath: new fabric.Rect({
          left: c.x, top: c.y, width: c.w, height: c.h, absolutePositioned: true
        }),
        lockRotation: true,
        hasRotatingPoint: false,
        cornerColor: '#0078d4',
        borderColor: '#0078d4'
      });
      img.data = { type: 'frameImage', frameIndex: i };
      if (frameImgObjs[i]) { fc.remove(frameImgObjs[i]); }
      frameImgObjs[i] = img;
      fc.add(img);
      reorderLayers();
    });
  }

  // --- フレームを再構築（テキストは保持） ---
  function rebuildFrames() {
    if (!fc) return;
    cellRects.forEach(function (r) { if (r) fc.remove(r); });
    frameImgObjs.forEach(function (im) { if (im) fc.remove(im); });
    cellRects = [];
    frameImgObjs = [];

    cells = computeCells(state.w, state.h, state.frames, state.layout, state.gap);
    frameImages.length = state.frames;

    for (var i = 0; i < cells.length; i++) {
      addCellRect(i);
      if (frameImages[i]) placeImageInCell(i, frameImages[i]);
    }
    reorderLayers();
    fc.renderAll();
  }

  // --- 表示スケール（ワークスペースに収める） ---
  function applyZoom() {
    if (!fc) return;
    var availW = (workspace.clientWidth || 600) - 24;
    if (availW < 100) availW = 600;
    var availH = Math.max(window.innerHeight - 360, 300);
    var scale = Math.min(availW / state.w, availH / state.h, 1);
    if (!isFinite(scale) || scale <= 0) scale = 1;
    fc.setZoom(scale);
    fc.setWidth(state.w * scale);
    fc.setHeight(state.h * scale);
    fc.renderAll();
  }

  // --- テキスト ---
  function activeText() {
    var o = fc && fc.getActiveObject();
    return (o && o.type === 'i-text') ? o : null;
  }

  function addText() {
    if (!fc) return;
    var t = new fabric.IText('テキスト', {
      left: state.w / 2,
      top: state.h / 2,
      originX: 'center', originY: 'center',
      fontFamily: fontEl.value,
      fontSize: parseInt(fontSizeEl.value, 10) || 64,
      fill: textColorEl.value,
      fontWeight: boldOn ? 'bold' : 'normal',
      textAlign: 'center',
      editable: true
    });
    if (outlineOn) applyOutline(t, true);
    t.data = { type: 'text' };
    fc.add(t);
    fc.setActiveObject(t);
    reorderLayers();
    fc.renderAll();
  }

  function applyOutline(t, on) {
    if (on) {
      t.set({
        stroke: '#000000',
        strokeWidth: Math.max(2, Math.round(t.fontSize * 0.08)),
        paintFirst: 'stroke',
        strokeLineJoin: 'round'
      });
    } else {
      t.set({ stroke: null, strokeWidth: 0 });
    }
  }

  function syncTextControls() {
    var t = activeText();
    if (!t) return;
    fontSizeEl.value = Math.round(t.fontSize);
    if (typeof t.fill === 'string' && /^#[0-9a-f]{6}$/i.test(t.fill)) {
      textColorEl.value = t.fill;
    }
    boldOn = (t.fontWeight === 'bold' || t.fontWeight === 700);
    outlineOn = !!(t.stroke && t.strokeWidth > 0);
    boldBtn.classList.toggle('active', boldOn);
    outlineBtn.classList.toggle('active', outlineOn);
    if (t.fontFamily) fontEl.value = t.fontFamily;
  }

  // --- フレーム用ファイル選択 ---
  function openFilePickerForFrame(i) {
    activeFrameIndex = i;
    frameFileEl.click();
  }

  // --- 書き出し ---
  function exportImage() {
    if (!fc) return;
    var zoom = fc.getZoom();
    var w = fc.getWidth();
    var h = fc.getHeight();

    fc.setZoom(1);
    fc.setWidth(state.w);
    fc.setHeight(state.h);
    fc.discardActiveObject();
    fc.renderAll();

    var fmt = formatEl.value;
    var dataURL = fc.toDataURL({
      format: fmt,
      quality: fmt === 'jpeg' ? 0.92 : 1,
      multiplier: 1
    });

    fc.setZoom(zoom);
    fc.setWidth(w);
    fc.setHeight(h);
    fc.renderAll();

    var ext = fmt === 'jpeg' ? 'jpg' : 'png';
    ChoiTool.downloadDataURL(dataURL, 'sns-image-' + state.w + 'x' + state.h + '.' + ext);
    ChoiTool.showToast('画像をダウンロードしました', 'success');
  }

  // --- 初期化 ---
  function initPresetSelect() {
    var html = '';
    for (var i = 0; i < PRESETS.length; i++) {
      html += '<option value="' + i + '">' + PRESETS[i].label + '</option>';
    }
    presetEl.innerHTML = html;
  }

  function initCanvas() {
    fc = new fabric.Canvas('si-canvas', {
      width: state.w,
      height: state.h,
      backgroundColor: state.bg,
      preserveObjectStacking: true
    });

    fc.on('mouse:down', function (opt) {
      var t = opt.target;
      if (t && t.data && t.data.type === 'cellRect') {
        openFilePickerForFrame(t.data.frameIndex);
      }
    });
    fc.on('mouse:dblclick', function (opt) {
      var t = opt.target;
      if (t && t.data && t.data.type === 'frameImage') {
        openFilePickerForFrame(t.data.frameIndex);
      }
    });
    fc.on('selection:created', syncTextControls);
    fc.on('selection:updated', syncTextControls);

    rebuildFrames();
    requestAnimationFrame(applyZoom);
  }

  function ensureInit() {
    if (fc) { applyZoom(); return; }
    initCanvas();
  }

  // パネルが表示されたら初期化
  window.addEventListener('hashchange', function () {
    if (window.location.hash === '#sns-image') requestAnimationFrame(ensureInit);
  });
  if (window.location.hash === '#sns-image') requestAnimationFrame(ensureInit);

  // --- イベントバインド ---

  presetEl.addEventListener('change', function () {
    var p = PRESETS[parseInt(presetEl.value, 10)] || PRESETS[0];
    if (p.id === 'custom') {
      customWrap.style.display = '';
      state.w = parseInt(customW.value, 10) || 1080;
      state.h = parseInt(customH.value, 10) || 1080;
    } else {
      customWrap.style.display = 'none';
      state.w = p.w;
      state.h = p.h;
    }
    rebuildFrames();
    applyZoom();
  });

  function onCustomChange() {
    state.w = Math.min(4000, Math.max(100, parseInt(customW.value, 10) || 1080));
    state.h = Math.min(4000, Math.max(100, parseInt(customH.value, 10) || 1080));
    rebuildFrames();
    applyZoom();
  }
  customW.addEventListener('change', onCustomChange);
  customH.addEventListener('change', onCustomChange);

  framesEl.addEventListener('input', function () {
    state.frames = parseInt(framesEl.value, 10) || 1;
    framesVal.textContent = state.frames;
    rebuildFrames();
  });

  layoutEl.addEventListener('change', function () {
    state.layout = layoutEl.value;
    rebuildFrames();
  });

  gapEl.addEventListener('input', function () {
    state.gap = parseInt(gapEl.value, 10) || 0;
    gapVal.textContent = state.gap;
    rebuildFrames();
  });

  bgEl.addEventListener('input', function () {
    state.bg = bgEl.value;
    if (fc) { fc.backgroundColor = state.bg; fc.renderAll(); }
  });

  frameFileEl.addEventListener('change', function () {
    if (!frameFileEl.files.length || activeFrameIndex < 0) { frameFileEl.value = ''; return; }
    var file = frameFileEl.files[0];
    ChoiTool.readImageAsDataURL(file).then(function (dataURL) {
      frameImages[activeFrameIndex] = dataURL;
      placeImageInCell(activeFrameIndex, dataURL);
      ChoiTool.showToast('写真を配置しました', 'success');
    }).catch(function () {
      ChoiTool.showToast('画像の読み込みに失敗しました', 'error');
    });
    frameFileEl.value = '';
  });

  // テキスト操作
  addTextBtn.addEventListener('click', addText);

  fontEl.addEventListener('change', function () {
    var t = activeText();
    if (t) { t.set('fontFamily', fontEl.value); fc.renderAll(); }
  });

  fontSizeEl.addEventListener('input', function () {
    var t = activeText();
    if (t) {
      t.set('fontSize', parseInt(fontSizeEl.value, 10) || 64);
      if (outlineOn) applyOutline(t, true);
      fc.renderAll();
    }
  });

  textColorEl.addEventListener('input', function () {
    var t = activeText();
    if (t) { t.set('fill', textColorEl.value); fc.renderAll(); }
  });

  boldBtn.addEventListener('click', function () {
    boldOn = !boldOn;
    boldBtn.classList.toggle('active', boldOn);
    var t = activeText();
    if (t) { t.set('fontWeight', boldOn ? 'bold' : 'normal'); fc.renderAll(); }
  });

  outlineBtn.addEventListener('click', function () {
    outlineOn = !outlineOn;
    outlineBtn.classList.toggle('active', outlineOn);
    var t = activeText();
    if (t) { applyOutline(t, outlineOn); fc.renderAll(); }
  });

  deleteBtn.addEventListener('click', function () {
    if (!fc) return;
    var o = fc.getActiveObject();
    if (!o) { ChoiTool.showToast('削除する対象を選択してください', 'info'); return; }
    if (o.data && o.data.type === 'frameImage') {
      frameImages[o.data.frameIndex] = undefined;
      frameImgObjs[o.data.frameIndex] = null;
    }
    fc.remove(o);
    fc.discardActiveObject();
    fc.renderAll();
  });

  resetBtn.addEventListener('click', function () {
    if (!fc) return;
    frameImages = [];
    fc.getObjects().slice().forEach(function (o) {
      if (o.data && o.data.type === 'text') fc.remove(o);
    });
    state.frames = 1;
    framesEl.value = 1;
    framesVal.textContent = '1';
    rebuildFrames();
    ChoiTool.showToast('リセットしました', 'info');
  });

  downloadBtn.addEventListener('click', exportImage);

  // Deleteキーで選択中を削除（テキスト編集中は除く）
  document.addEventListener('keydown', function (e) {
    var panel = document.getElementById('tool-sns-image');
    if (!panel || !panel.classList.contains('active') || !fc) return;
    var act = fc.getActiveObject();
    if (act && act.isEditing) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (act) { deleteBtn.click(); e.preventDefault(); }
    }
  });

  // リサイズ追従
  window.addEventListener('resize', ChoiTool.debounce(function () {
    var panel = document.getElementById('tool-sns-image');
    if (fc && panel && panel.classList.contains('active')) applyZoom();
  }, 200));

  // --- 起動時セットアップ ---
  initPresetSelect();
})();
