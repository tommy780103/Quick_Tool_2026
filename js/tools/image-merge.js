/* ============================================
   画像結合
   ============================================ */
(function () {
  'use strict';

  const settingsPanel = document.getElementById('imgm-settings');
  const fileList = document.getElementById('imgm-list');
  const directionSelect = document.getElementById('imgm-direction');
  const columnsInput = document.getElementById('imgm-columns');
  const columnsRow = document.getElementById('imgm-columns-row');
  const gapRange = document.getElementById('imgm-gap');
  const gapVal = document.getElementById('imgm-gap-val');
  const bgColorInput = document.getElementById('imgm-bg-color');
  const sizingSelect = document.getElementById('imgm-sizing');
  const formatSelect = document.getElementById('imgm-format');
  const previewContainer = document.getElementById('imgm-preview');
  const executeBtn = document.getElementById('imgm-execute');
  const downloadBtn = document.getElementById('imgm-download');
  const resetBtn = document.getElementById('imgm-reset');

  /** アップロードされたファイルと読み込み済み画像を保持 */
  let sourceFiles = [];    // { file, dataURL, img }[]
  let resultCanvas = null;

  // --- ドロップゾーン初期化 ---
  ChoiTool.initDropZone('imgm-drop', 'imgm-file', {
    multiple: true,
    onFiles: handleFiles,
  });

  // --- ファイル追加 ---
  async function handleFiles(files) {
    const imageFiles = files.filter(function (f) {
      return ChoiTool.isImageFile(f);
    });
    if (imageFiles.length === 0) {
      ChoiTool.showToast('画像ファイルを選択してください', 'error');
      return;
    }

    for (var i = 0; i < imageFiles.length; i++) {
      try {
        var dataURL = await ChoiTool.readImageAsDataURL(imageFiles[i]);
        var img = await ChoiTool.loadImage(dataURL);
        sourceFiles.push({
          file: imageFiles[i],
          dataURL: dataURL,
          img: img,
        });
      } catch (e) {
        ChoiTool.showToast(imageFiles[i].name + ' の読み込みに失敗しました', 'error');
      }
    }

    if (sourceFiles.length > 0) {
      renderFileList();
      settingsPanel.style.display = '';
      downloadBtn.style.display = 'none';
      previewContainer.innerHTML = '';
      resultCanvas = null;
    }
  }

  // --- ファイルリスト描画 ---
  function renderFileList() {
    fileList.innerHTML = '';
    sourceFiles.forEach(function (item, i) {
      var el = document.createElement('div');
      el.className = 'file-list-item';
      el.draggable = true;
      el.dataset.index = i;

      el.innerHTML =
        '<span class="file-list-grip">\u283F</span>' +
        '<span class="file-list-name">' + escapeHTML(item.file.name) + '</span>' +
        '<span class="file-list-size">' + ChoiTool.formatFileSize(item.file.size) + '</span>' +
        '<button class="file-list-remove" data-index="' + i + '">\u00D7</button>';

      fileList.appendChild(el);
    });

    // 削除ボタン
    fileList.querySelectorAll('.file-list-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.dataset.index);
        sourceFiles.splice(idx, 1);
        renderFileList();
        if (sourceFiles.length === 0) {
          settingsPanel.style.display = 'none';
          previewContainer.innerHTML = '';
          downloadBtn.style.display = 'none';
          resultCanvas = null;
        }
      });
    });
  }

  // --- 並べ替え初期化 ---
  ChoiTool.initSortable('imgm-list', function (newOrder) {
    var reordered = newOrder.map(function (i) {
      return sourceFiles[i];
    });
    sourceFiles = reordered;
    renderFileList();
  });

  // --- グリッド列数表示の切り替え ---
  directionSelect.addEventListener('change', function () {
    columnsRow.style.display = directionSelect.value === 'grid' ? '' : 'none';
  });

  // --- gap値表示 ---
  gapRange.addEventListener('input', function () {
    gapVal.textContent = gapRange.value;
  });

  // --- 結合処理 ---
  executeBtn.addEventListener('click', function () {
    executeMerge();
  });

  async function executeMerge() {
    if (sourceFiles.length === 0) {
      ChoiTool.showToast('画像を追加してください', 'error');
      return;
    }

    executeBtn.disabled = true;
    executeBtn.textContent = '結合中...';

    try {
      var direction = directionSelect.value;
      var gap = parseInt(gapRange.value, 10) || 0;
      var bgColor = bgColorInput.value;
      var sizing = sizingSelect.value;

      var images = sourceFiles.map(function (item) {
        return item.img;
      });

      // サイズ計算
      var sizes = computeSizes(images, direction, sizing);

      // キャンバスサイズと各画像の配置位置を計算
      var layout = computeLayout(sizes, direction, gap, parseInt(columnsInput.value, 10) || 2);

      // キャンバス生成
      var canvas = document.createElement('canvas');
      canvas.width = layout.width;
      canvas.height = layout.height;
      var ctx = canvas.getContext('2d');

      // 背景色を塗る
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 各画像を描画
      for (var i = 0; i < images.length; i++) {
        ctx.drawImage(
          images[i],
          layout.positions[i].x,
          layout.positions[i].y,
          sizes[i].w,
          sizes[i].h
        );
      }

      resultCanvas = canvas;
      var resultArea = document.getElementById('imgm-result');
      if (resultArea) resultArea.style.display = '';

      // プレビュー表示
      previewContainer.innerHTML = '';
      var previewCanvas = document.createElement('canvas');
      var maxPreviewWidth = previewContainer.clientWidth || 600;
      var scale = Math.min(1, maxPreviewWidth / canvas.width);
      previewCanvas.width = Math.round(canvas.width * scale);
      previewCanvas.height = Math.round(canvas.height * scale);
      previewCanvas.style.maxWidth = '100%';
      previewCanvas.style.cursor = 'pointer';
      previewCanvas.getContext('2d').drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);
      previewCanvas.addEventListener('click', function () {
        var url = resultCanvas.toDataURL('image/png');
        ChoiTool.showImagePreview(url);
      });
      previewContainer.appendChild(previewCanvas);

      // サイズ情報
      var infoEl = document.createElement('div');
      infoEl.style.marginTop = '8px';
      infoEl.style.fontSize = '0.9em';
      infoEl.style.color = '#666';
      infoEl.textContent = canvas.width + ' x ' + canvas.height + ' px';
      previewContainer.appendChild(infoEl);

      downloadBtn.style.display = '';
      ChoiTool.showToast('画像を結合しました', 'success');
    } catch (e) {
      ChoiTool.showToast('結合に失敗しました: ' + e.message, 'error');
    } finally {
      executeBtn.disabled = false;
      executeBtn.textContent = '結合実行';
    }
  }

  /**
   * サイズ正規化後の各画像サイズを計算
   * @param {HTMLImageElement[]} images
   * @param {string} direction - horizontal / vertical / grid
   * @param {string} sizing - largest / smallest / first / none
   * @returns {{ w: number, h: number }[]}
   */
  function computeSizes(images, direction, sizing) {
    var originals = images.map(function (img) {
      return { w: img.naturalWidth, h: img.naturalHeight };
    });

    if (sizing === 'none') {
      return originals;
    }

    var targetDim;

    if (direction === 'horizontal') {
      // 横並び: 高さを揃える
      var heights = originals.map(function (s) { return s.h; });
      if (sizing === 'largest') {
        targetDim = Math.max.apply(null, heights);
      } else if (sizing === 'smallest') {
        targetDim = Math.min.apply(null, heights);
      } else if (sizing === 'first') {
        targetDim = heights[0];
      }
      return originals.map(function (s) {
        var scale = targetDim / s.h;
        return { w: Math.round(s.w * scale), h: targetDim };
      });
    } else if (direction === 'vertical') {
      // 縦並び: 幅を揃える
      var widths = originals.map(function (s) { return s.w; });
      if (sizing === 'largest') {
        targetDim = Math.max.apply(null, widths);
      } else if (sizing === 'smallest') {
        targetDim = Math.min.apply(null, widths);
      } else if (sizing === 'first') {
        targetDim = widths[0];
      }
      return originals.map(function (s) {
        var scale = targetDim / s.w;
        return { w: targetDim, h: Math.round(s.h * scale) };
      });
    } else {
      // グリッド: 幅を揃える（各セルの幅を統一）
      var gWidths = originals.map(function (s) { return s.w; });
      if (sizing === 'largest') {
        targetDim = Math.max.apply(null, gWidths);
      } else if (sizing === 'smallest') {
        targetDim = Math.min.apply(null, gWidths);
      } else if (sizing === 'first') {
        targetDim = gWidths[0];
      }
      return originals.map(function (s) {
        var scale = targetDim / s.w;
        return { w: targetDim, h: Math.round(s.h * scale) };
      });
    }
  }

  /**
   * キャンバスサイズと各画像の配置位置を計算
   * @param {{ w: number, h: number }[]} sizes
   * @param {string} direction
   * @param {number} gap
   * @param {number} columns
   * @returns {{ width: number, height: number, positions: { x: number, y: number }[] }}
   */
  function computeLayout(sizes, direction, gap, columns) {
    var positions = [];
    var canvasW = 0;
    var canvasH = 0;

    if (direction === 'horizontal') {
      // 横並び
      var maxH = 0;
      var x = 0;
      for (var i = 0; i < sizes.length; i++) {
        positions.push({ x: x, y: 0 });
        x += sizes[i].w;
        if (i < sizes.length - 1) x += gap;
        if (sizes[i].h > maxH) maxH = sizes[i].h;
      }
      canvasW = x;
      canvasH = maxH;
      // 垂直方向の中央揃え
      for (var j = 0; j < sizes.length; j++) {
        positions[j].y = Math.round((maxH - sizes[j].h) / 2);
      }
    } else if (direction === 'vertical') {
      // 縦並び
      var maxW = 0;
      var y = 0;
      for (var i = 0; i < sizes.length; i++) {
        positions.push({ x: 0, y: y });
        y += sizes[i].h;
        if (i < sizes.length - 1) y += gap;
        if (sizes[i].w > maxW) maxW = sizes[i].w;
      }
      canvasW = maxW;
      canvasH = y;
      // 水平方向の中央揃え
      for (var j = 0; j < sizes.length; j++) {
        positions[j].x = Math.round((maxW - sizes[j].w) / 2);
      }
    } else {
      // グリッド
      var cols = Math.max(1, Math.min(columns, sizes.length));
      var rows = Math.ceil(sizes.length / cols);

      // 各列の最大幅を計算
      var colWidths = [];
      for (var c = 0; c < cols; c++) {
        var maxColW = 0;
        for (var r = 0; r < rows; r++) {
          var idx = r * cols + c;
          if (idx < sizes.length && sizes[idx].w > maxColW) {
            maxColW = sizes[idx].w;
          }
        }
        colWidths.push(maxColW);
      }

      // 各行の最大高さを計算
      var rowHeights = [];
      for (var r = 0; r < rows; r++) {
        var maxRowH = 0;
        for (var c = 0; c < cols; c++) {
          var idx = r * cols + c;
          if (idx < sizes.length && sizes[idx].h > maxRowH) {
            maxRowH = sizes[idx].h;
          }
        }
        rowHeights.push(maxRowH);
      }

      // キャンバスサイズ
      canvasW = colWidths.reduce(function (a, b) { return a + b; }, 0) + gap * (cols - 1);
      canvasH = rowHeights.reduce(function (a, b) { return a + b; }, 0) + gap * (rows - 1);

      // 各画像の位置を計算（セル内中央揃え）
      for (var i = 0; i < sizes.length; i++) {
        var col = i % cols;
        var row = Math.floor(i / cols);

        var xOffset = 0;
        for (var cc = 0; cc < col; cc++) {
          xOffset += colWidths[cc] + gap;
        }
        var yOffset = 0;
        for (var rr = 0; rr < row; rr++) {
          yOffset += rowHeights[rr] + gap;
        }

        // セル内で中央揃え
        var cellW = colWidths[col];
        var cellH = rowHeights[row];
        var px = xOffset + Math.round((cellW - sizes[i].w) / 2);
        var py = yOffset + Math.round((cellH - sizes[i].h) / 2);
        positions.push({ x: px, y: py });
      }
    }

    return { width: canvasW, height: canvasH, positions: positions };
  }

  // --- ダウンロード ---
  downloadBtn.addEventListener('click', async function () {
    if (!resultCanvas) return;

    var format = formatSelect.value;
    var mime, ext, quality;
    if (format === 'PNG') {
      mime = 'image/png';
      ext = 'png';
      quality = 1;
    } else if (format === 'JPEG') {
      mime = 'image/jpeg';
      ext = 'jpg';
      quality = 0.92;
    } else {
      mime = 'image/webp';
      ext = 'webp';
      quality = 0.92;
    }

    try {
      var blob = await ChoiTool.canvasToBlob(resultCanvas, mime, quality);
      var timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      ChoiTool.downloadBlob(blob, 'merged_' + timestamp + '.' + ext);
    } catch (e) {
      ChoiTool.showToast('ダウンロードに失敗しました', 'error');
    }
  });

  // --- リセット ---
  resetBtn.addEventListener('click', function () {
    sourceFiles = [];
    resultCanvas = null;
    fileList.innerHTML = '';
    settingsPanel.style.display = 'none';
    previewContainer.innerHTML = '';
    downloadBtn.style.display = 'none';
    document.getElementById('imgm-file').value = '';
    gapRange.value = 0;
    gapVal.textContent = '0';
    directionSelect.value = 'horizontal';
    columnsRow.style.display = 'none';
    columnsInput.value = 2;
    bgColorInput.value = '#ffffff';
    sizingSelect.value = 'largest';
    formatSelect.value = 'PNG';
  });

  var escapeHTML = ChoiTool.escapeHTML;
})();
