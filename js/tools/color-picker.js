/* ============================================
   カラーピッカー
   ============================================ */
(function () {
  'use strict';

  // --- DOM要素 ---
  var pickerEl   = document.getElementById('cp-picker');
  var previewEl  = document.getElementById('cp-preview');
  var hexEl      = document.getElementById('cp-hex');
  var hexCopyEl  = document.getElementById('cp-hex-copy');
  var rgbEl      = document.getElementById('cp-rgb');
  var rgbCopyEl  = document.getElementById('cp-rgb-copy');
  var hslEl      = document.getElementById('cp-hsl');
  var hslCopyEl  = document.getElementById('cp-hsl-copy');
  var rSlider    = document.getElementById('cp-r');
  var rVal       = document.getElementById('cp-r-val');
  var gSlider    = document.getElementById('cp-g');
  var gVal       = document.getElementById('cp-g-val');
  var bSlider    = document.getElementById('cp-b');
  var bVal       = document.getElementById('cp-b-val');
  var presetsEl  = document.getElementById('cp-presets');
  var savedEl    = document.getElementById('cp-saved');
  var saveBtnEl  = document.getElementById('cp-save-btn');
  var eyedropperBtn = document.getElementById('cp-eyedropper');
  var imgDropEl  = document.getElementById('cp-image-drop');
  var imgFileEl  = document.getElementById('cp-image-file');
  var imgCanvasWrap = document.getElementById('cp-image-canvas-wrap');
  var imgCanvas  = document.getElementById('cp-image-canvas');
  var imgInfo    = document.getElementById('cp-image-info');
  var imgClearBtn = document.getElementById('cp-image-clear');

  // --- 色変換関数 ---

  /**
   * HEX文字列をRGBオブジェクトに変換
   * @param {string} hex - "#RRGGBB" 形式
   * @returns {{ r: number, g: number, b: number }}
   */
  function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { r: 0, g: 0, b: 0 };
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    };
  }

  /**
   * RGB値をHEX文字列に変換
   * @param {number} r
   * @param {number} g
   * @param {number} b
   * @returns {string} "#RRGGBB" 形式
   */
  function rgbToHex(r, g, b) {
    return '#' +
      ((1 << 24) + (r << 16) + (g << 8) + b)
        .toString(16)
        .slice(1)
        .toUpperCase();
  }

  /**
   * RGB値をHSL値に変換
   * @param {number} r - 0-255
   * @param {number} g - 0-255
   * @param {number} b - 0-255
   * @returns {{ h: number, s: number, l: number }} h: 0-360, s: 0-100, l: 0-100
   */
  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var h, s;
    var l = (max + min) / 2;

    if (max === min) {
      h = 0;
      s = 0;
    } else {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  // --- 表示更新 ---

  /**
   * 全UIをRGB値で更新する
   * @param {number} r
   * @param {number} g
   * @param {number} b
   */
  function updateAll(r, g, b) {
    var hex = rgbToHex(r, g, b);
    var hsl = rgbToHsl(r, g, b);

    // カラーピッカー
    pickerEl.value = hex;

    // プレビュー
    previewEl.style.backgroundColor = hex;

    // テキスト表示
    hexEl.value = hex;
    rgbEl.value = 'rgb(' + r + ', ' + g + ', ' + b + ')';
    hslEl.value = 'hsl(' + hsl.h + ', ' + hsl.s + '%, ' + hsl.l + '%)';

    // スライダー
    rSlider.value = r;
    gSlider.value = g;
    bSlider.value = b;

    // スライダー値表示
    rVal.textContent = r;
    gVal.textContent = g;
    bVal.textContent = b;
  }

  // --- イベント: カラーピッカー ---

  pickerEl.addEventListener('input', function () {
    var rgb = hexToRgb(pickerEl.value);
    updateAll(rgb.r, rgb.g, rgb.b);
  });

  // --- イベント: RGBスライダー ---

  function onSliderChange() {
    var r = parseInt(rSlider.value, 10);
    var g = parseInt(gSlider.value, 10);
    var b = parseInt(bSlider.value, 10);
    updateAll(r, g, b);
  }

  rSlider.addEventListener('input', onSliderChange);
  gSlider.addEventListener('input', onSliderChange);
  bSlider.addEventListener('input', onSliderChange);

  // --- イベント: コピーボタン ---

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(function () {
      ChoiTool.showToast('コピーしました', 'success');
    }).catch(function () {
      ChoiTool.showToast('コピーに失敗しました', 'error');
    });
  }

  hexCopyEl.addEventListener('click', function () {
    copyToClipboard(hexEl.value);
  });

  rgbCopyEl.addEventListener('click', function () {
    copyToClipboard(rgbEl.value);
  });

  hslCopyEl.addEventListener('click', function () {
    copyToClipboard(hslEl.value);
  });

  // --- プリセットカラー ---

  var PRESET_COLORS = [
    // 赤系
    '#FF0000', '#DC143C', '#B22222', '#FF6347',
    // オレンジ・黄系
    '#FF8C00', '#FFA500', '#FFD700', '#FFFF00',
    // 緑系
    '#00FF00', '#32CD32', '#228B22', '#006400',
    // シアン・青系
    '#00FFFF', '#00CED1', '#1E90FF', '#0000FF',
    // 紫系
    '#8A2BE2', '#9400D3', '#800080', '#FF00FF',
    // ピンク・その他
    '#FF69B4', '#FF1493', '#808080', '#000000'
  ];

  function renderPresets() {
    presetsEl.innerHTML = '';
    for (var i = 0; i < PRESET_COLORS.length; i++) {
      var swatch = document.createElement('div');
      swatch.className = 'cp-swatch';
      swatch.style.backgroundColor = PRESET_COLORS[i];
      swatch.title = PRESET_COLORS[i];
      swatch.dataset.color = PRESET_COLORS[i];
      swatch.addEventListener('click', function () {
        var rgb = hexToRgb(this.dataset.color);
        updateAll(rgb.r, rgb.g, rgb.b);
      });
      presetsEl.appendChild(swatch);
    }
  }

  // --- 保存カラー (sessionStorage) ---

  var STORAGE_KEY = 'cp-saved-colors';

  function getSavedColors() {
    try {
      var data = sessionStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveSavedColors(colors) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
    } catch (e) {
      // storage full or unavailable
    }
  }

  function renderSavedColors() {
    var colors = getSavedColors();
    savedEl.innerHTML = '';

    if (colors.length === 0) {
      var placeholder = document.createElement('div');
      placeholder.className = 'cp-saved-placeholder';
      placeholder.textContent = '保存した色がありません';
      placeholder.style.color = 'var(--color-text-secondary, #999)';
      placeholder.style.fontSize = '13px';
      placeholder.style.padding = '8px 0';
      savedEl.appendChild(placeholder);
      return;
    }

    for (var i = 0; i < colors.length; i++) {
      var wrapper = document.createElement('div');
      wrapper.className = 'cp-saved-item';
      wrapper.style.display = 'inline-flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.position = 'relative';

      var swatch = document.createElement('div');
      swatch.className = 'cp-swatch';
      swatch.style.backgroundColor = colors[i];
      swatch.title = colors[i];
      swatch.dataset.color = colors[i];
      swatch.addEventListener('click', function () {
        var rgb = hexToRgb(this.dataset.color);
        updateAll(rgb.r, rgb.g, rgb.b);
      });

      var removeBtn = document.createElement('button');
      removeBtn.className = 'cp-swatch-remove';
      removeBtn.textContent = '\u00d7';
      removeBtn.title = '削除';
      removeBtn.style.cssText =
        'position:absolute;top:-4px;right:-4px;width:16px;height:16px;' +
        'border-radius:50%;border:none;background:var(--color-danger,#ef4444);' +
        'color:#fff;font-size:11px;line-height:1;cursor:pointer;padding:0;' +
        'display:flex;align-items:center;justify-content:center;';
      removeBtn.dataset.index = i;
      removeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var idx = parseInt(this.dataset.index, 10);
        var saved = getSavedColors();
        saved.splice(idx, 1);
        saveSavedColors(saved);
        renderSavedColors();
      });

      wrapper.appendChild(swatch);
      wrapper.appendChild(removeBtn);
      savedEl.appendChild(wrapper);
    }
  }

  saveBtnEl.addEventListener('click', function () {
    var currentHex = hexEl.value;
    var colors = getSavedColors();

    // 重複チェック
    if (colors.indexOf(currentHex) !== -1) {
      ChoiTool.showToast('この色は既に保存されています', 'info');
      return;
    }

    colors.push(currentHex);
    saveSavedColors(colors);
    renderSavedColors();
    ChoiTool.showToast('色を保存しました', 'success');
  });

  // --- スポイト（EyeDropper API） ---

  if ('EyeDropper' in window) {
    eyedropperBtn.addEventListener('click', function () {
      var dropper = new EyeDropper();
      dropper.open().then(function (result) {
        var rgb = hexToRgb(result.sRGBHex);
        updateAll(rgb.r, rgb.g, rgb.b);
        ChoiTool.showToast('色を取得しました', 'success');
      }).catch(function () {
        // ユーザーがキャンセル
      });
    });
  } else {
    eyedropperBtn.title = '画像を読み込んでクリックで色を取得できます';
    eyedropperBtn.addEventListener('click', function () {
      ChoiTool.showToast('このブラウザはスポイト機能に非対応です。下の画像読み込みから色を取得できます。', 'info');
    });
  }

  // --- 画像から色を取得 ---

  var imgCtx = imgCanvas.getContext('2d');

  imgDropEl.addEventListener('click', function () {
    imgFileEl.click();
  });

  imgDropEl.addEventListener('dragover', function (e) {
    e.preventDefault();
    imgDropEl.classList.add('dragover');
  });

  imgDropEl.addEventListener('dragleave', function () {
    imgDropEl.classList.remove('dragover');
  });

  imgDropEl.addEventListener('drop', function (e) {
    e.preventDefault();
    imgDropEl.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      loadImageForPick(e.dataTransfer.files[0]);
    }
  });

  imgFileEl.addEventListener('change', function () {
    if (imgFileEl.files.length > 0) {
      loadImageForPick(imgFileEl.files[0]);
    }
    imgFileEl.value = '';
  });

  function loadImageForPick(file) {
    if (!file.type.startsWith('image/')) {
      ChoiTool.showToast('画像ファイルを選択してください', 'error');
      return;
    }
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        // キャンバスサイズ調整（最大幅600px）
        var maxW = 600;
        var scale = Math.min(1, maxW / img.width);
        imgCanvas.width = Math.round(img.width * scale);
        imgCanvas.height = Math.round(img.height * scale);
        imgCtx.drawImage(img, 0, 0, imgCanvas.width, imgCanvas.height);

        imgDropEl.style.display = 'none';
        imgCanvasWrap.style.display = '';
        imgInfo.textContent = '画像をクリックして色を取得';
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  imgCanvas.addEventListener('click', function (e) {
    var rect = imgCanvas.getBoundingClientRect();
    var scaleX = imgCanvas.width / rect.width;
    var scaleY = imgCanvas.height / rect.height;
    var x = Math.round((e.clientX - rect.left) * scaleX);
    var y = Math.round((e.clientY - rect.top) * scaleY);

    var pixel = imgCtx.getImageData(x, y, 1, 1).data;
    updateAll(pixel[0], pixel[1], pixel[2]);
    imgInfo.textContent = '取得: rgb(' + pixel[0] + ', ' + pixel[1] + ', ' + pixel[2] + ') @ (' + x + ', ' + y + ')';
    ChoiTool.showToast('色を取得しました', 'success');
  });

  imgCanvas.addEventListener('mousemove', function (e) {
    var rect = imgCanvas.getBoundingClientRect();
    var scaleX = imgCanvas.width / rect.width;
    var scaleY = imgCanvas.height / rect.height;
    var x = Math.round((e.clientX - rect.left) * scaleX);
    var y = Math.round((e.clientY - rect.top) * scaleY);

    if (x >= 0 && x < imgCanvas.width && y >= 0 && y < imgCanvas.height) {
      var pixel = imgCtx.getImageData(x, y, 1, 1).data;
      var hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
      imgInfo.textContent = hex + ' @ (' + x + ', ' + y + ')';
    }
  });

  imgClearBtn.addEventListener('click', function () {
    imgCanvasWrap.style.display = 'none';
    imgDropEl.style.display = '';
    imgInfo.textContent = '';
  });

  // --- 初期化 ---

  var INITIAL_COLOR = '#6366F1';
  var initialRgb = hexToRgb(INITIAL_COLOR);

  renderPresets();
  renderSavedColors();
  updateAll(initialRgb.r, initialRgb.g, initialRgb.b);
})();
