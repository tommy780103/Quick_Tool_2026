/* ============================================
   背景除去（色ベース）
   ============================================ */
(function () {
  'use strict';

  // --- DOM要素 ---
  var canvas = document.getElementById('bgr-canvas');
  var ctx = canvas.getContext('2d');
  var settings = document.getElementById('bgr-settings');
  var toleranceSlider = document.getElementById('bgr-tolerance');
  var toleranceVal = document.getElementById('bgr-tolerance-val');
  var modeSelect = document.getElementById('bgr-mode');
  var smoothCheckbox = document.getElementById('bgr-smooth');
  var undoBtn = document.getElementById('bgr-undo');
  var downloadBtn = document.getElementById('bgr-download');
  var resetBtn = document.getElementById('bgr-reset');

  // --- 状態 ---
  var sourceImage = null;
  var sourceFileName = 'image';
  var undoStack = [];

  /** 色距離の最大値: sqrt(255^2 * 3) ≈ 441.67 */
  var MAX_COLOR_DISTANCE = Math.sqrt(255 * 255 * 3);

  // --- 許容値スライダー連動 ---
  toleranceSlider.addEventListener('input', function () {
    toleranceVal.textContent = toleranceSlider.value;
  });

  // --- ドロップゾーン初期化 ---
  ChoiTool.initDropZone('bgr-drop', 'bgr-file', {
    multiple: false,
    onFiles: handleFiles,
  });

  // --- ファイル処理 ---
  async function handleFiles(files) {
    var file = files[0];
    if (!file || !ChoiTool.isImageFile(file)) {
      ChoiTool.showToast('画像ファイルを選択してください', 'error');
      return;
    }

    sourceFileName = file.name;

    try {
      var dataURL = await ChoiTool.readImageAsDataURL(file);
      var img = await ChoiTool.loadImage(dataURL);
      sourceImage = img;
      undoStack = [];
      updateUndoBtn();
      drawImageToCanvas(img);
      settings.style.display = '';
      ChoiTool.showToast('画像を読み込みました。透明にしたい色の部分をクリックしてください', 'info');
    } catch (e) {
      ChoiTool.showToast('画像の読み込みに失敗しました', 'error');
    }
  }

  // --- 画像をキャンバスに描画 ---
  function drawImageToCanvas(img) {
    var w = img.naturalWidth;
    var h = img.naturalHeight;

    // キャンバスのCSS最大幅に合わせて表示サイズを調整（内部解像度は原寸）
    canvas.width = w;
    canvas.height = h;
    canvas.style.maxWidth = '100%';
    canvas.style.height = 'auto';

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0);
    canvas.style.display = '';
  }

  // --- キャンバスクリックイベント ---
  canvas.addEventListener('click', function (e) {
    if (!sourceImage) return;

    // クリック座標をキャンバス内部座標に変換
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    var x = Math.floor((e.clientX - rect.left) * scaleX);
    var y = Math.floor((e.clientY - rect.top) * scaleY);

    // 範囲チェック
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return;

    // 現在のImageDataを取得
    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // クリック位置のピクセル色を取得
    var idx = (y * canvas.width + x) * 4;
    var targetColor = {
      r: imageData.data[idx],
      g: imageData.data[idx + 1],
      b: imageData.data[idx + 2],
    };

    // 既に透明なピクセルをクリックした場合は無視
    if (imageData.data[idx + 3] === 0) {
      ChoiTool.showToast('そのピクセルは既に透明です', 'info');
      return;
    }

    // Undo用に現在の状態を保存
    pushUndo();

    var tolerance = parseInt(toleranceSlider.value, 10);
    var threshold = (tolerance / 100) * MAX_COLOR_DISTANCE;
    var mode = modeSelect.value;
    var smooth = smoothCheckbox.checked;

    if (mode === 'flood') {
      floodFillRemove(imageData, x, y, targetColor, threshold, smooth);
    } else {
      globalRemove(imageData, targetColor, threshold, smooth);
    }

    ctx.putImageData(imageData, 0, 0);
    ChoiTool.showToast('背景を除去しました', 'success');
  });

  // --- 色距離の計算 ---
  function colorDistance(data, idx, target) {
    var dr = data[idx] - target.r;
    var dg = data[idx + 1] - target.g;
    var db = data[idx + 2] - target.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  // --- フラッドフィル除去 ---
  function floodFillRemove(imageData, startX, startY, targetColor, threshold, smooth) {
    var width = imageData.width;
    var height = imageData.height;
    var data = imageData.data;
    var visited = new Uint8Array(width * height);
    var stack = [[startX, startY]];
    var smoothStart = threshold * 0.8;

    while (stack.length > 0) {
      var point = stack.pop();
      var px = point[0];
      var py = point[1];
      var key = py * width + px;

      if (visited[key]) continue;
      visited[key] = 1;

      var idx = key * 4;

      // 既に透明なピクセルはスキップ
      if (data[idx + 3] === 0) continue;

      var dist = colorDistance(data, idx, targetColor);
      if (dist > threshold) continue;

      // スムージング: 閾値の80%-100%の範囲で段階的にアルファを適用
      if (smooth && dist > smoothStart) {
        var alpha = Math.round(255 * (dist - smoothStart) / (threshold - smoothStart));
        data[idx + 3] = Math.min(data[idx + 3], alpha);
      } else {
        data[idx + 3] = 0;
      }

      // 隣接ピクセルをスタックに追加
      if (px > 0) stack.push([px - 1, py]);
      if (px < width - 1) stack.push([px + 1, py]);
      if (py > 0) stack.push([px, py - 1]);
      if (py < height - 1) stack.push([px, py + 1]);
    }
  }

  // --- グローバル除去 ---
  function globalRemove(imageData, targetColor, threshold, smooth) {
    var data = imageData.data;
    var len = data.length;
    var smoothStart = threshold * 0.8;

    for (var i = 0; i < len; i += 4) {
      // 既に透明なピクセルはスキップ
      if (data[i + 3] === 0) continue;

      var dist = colorDistance(data, i, targetColor);
      if (dist > threshold) continue;

      if (smooth && dist > smoothStart) {
        var alpha = Math.round(255 * (dist - smoothStart) / (threshold - smoothStart));
        data[i + 3] = Math.min(data[i + 3], alpha);
      } else {
        data[i + 3] = 0;
      }
    }
  }

  // --- Undo管理 ---
  function pushUndo() {
    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    undoStack.push(imageData);
    // メモリ節約: 最大20段階
    if (undoStack.length > 20) {
      undoStack.shift();
    }
    updateUndoBtn();
  }

  function popUndo() {
    if (undoStack.length === 0) return;
    var imageData = undoStack.pop();
    ctx.putImageData(imageData, 0, 0);
    updateUndoBtn();
    ChoiTool.showToast('元に戻しました', 'info');
  }

  function updateUndoBtn() {
    undoBtn.disabled = undoStack.length === 0;
  }

  // --- Undoボタン ---
  undoBtn.addEventListener('click', function () {
    popUndo();
  });

  // --- ダウンロードボタン ---
  downloadBtn.addEventListener('click', async function () {
    if (!sourceImage) return;

    try {
      var blob = await ChoiTool.canvasToBlob(canvas, 'image/png', 1);
      var filename = ChoiTool.changeExt(sourceFileName, 'png');
      ChoiTool.downloadBlob(blob, filename);
      ChoiTool.showToast('PNGをダウンロードしました', 'success');
    } catch (e) {
      ChoiTool.showToast('ダウンロードに失敗しました', 'error');
    }
  });

  // --- リセットボタン ---
  resetBtn.addEventListener('click', function () {
    sourceImage = null;
    sourceFileName = 'image';
    undoStack = [];
    updateUndoBtn();
    canvas.width = 0;
    canvas.height = 0;
    canvas.style.display = 'none';
    settings.style.display = 'none';
    document.getElementById('bgr-file').value = '';
    toleranceSlider.value = 30;
    toleranceVal.textContent = '30';
    modeSelect.value = 'flood';
    smoothCheckbox.checked = false;
  });

  // --- キーボードショートカット ---
  document.addEventListener('keydown', function (e) {
    // Ctrl+Z / Cmd+Z でUndo（bgr-canvasが表示中のみ）
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && sourceImage) {
      // 背景除去ツールのセクションがアクティブかチェック
      var section = canvas.closest('.tool-section, [data-tool]');
      if (section && !section.classList.contains('hidden') && section.offsetParent !== null) {
        e.preventDefault();
        popUndo();
      }
    }
  });

  // --- 初期状態 ---
  settings.style.display = 'none';
  canvas.style.display = 'none';
  updateUndoBtn();
})();
