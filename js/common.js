/* ============================================
   ちょいツール — 共通ユーティリティ
   ============================================ */

const ChoiTool = {
  /**
   * HTMLエスケープ
   * @param {string} str
   * @returns {string}
   */
  escapeHTML(str) {
    if (typeof str !== 'string') str = String(str);
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * HTML属性値エスケープ
   * @param {string} str
   * @returns {string}
   */
  escapeAttr(str) {
    if (typeof str !== 'string') str = String(str);
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;');
  },

  /**
   * ドロップゾーンを初期化
   * @param {string} dropId - ドロップゾーン要素のID
   * @param {string} inputId - file input要素のID
   * @param {object} options - { multiple, onFiles }
   */
  initDropZone(dropId, inputId, options = {}) {
    const drop = document.getElementById(dropId);
    const input = document.getElementById(inputId);
    if (!drop || !input) return;

    const handleFiles = (files) => {
      const list = Array.from(files);
      if (!options.multiple && list.length > 1) {
        this.showToast('ファイルは1つだけ選択してください', 'error');
        return;
      }
      if (options.onFiles) options.onFiles(list);
    };

    drop.addEventListener('dragover', (e) => {
      e.preventDefault();
      drop.classList.add('drag-over');
    });

    drop.addEventListener('dragleave', () => {
      drop.classList.remove('drag-over');
    });

    drop.addEventListener('drop', (e) => {
      e.preventDefault();
      drop.classList.remove('drag-over');
      handleFiles(e.dataTransfer.files);
    });

    input.addEventListener('change', () => {
      if (input.files.length) handleFiles(input.files);
      input.value = '';
    });
  },

  /**
   * ファイルを読み込む
   * @param {File} file
   * @param {'arrayBuffer'|'dataURL'|'text'} type
   * @returns {Promise}
   */
  readFileAs(file, type = 'arrayBuffer') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      if (type === 'arrayBuffer') reader.readAsArrayBuffer(file);
      else if (type === 'dataURL') reader.readAsDataURL(file);
      else if (type === 'text') reader.readAsText(file);
    });
  },

  /**
   * トースト通知を表示
   * @param {string} msg
   * @param {'success'|'error'|'info'} type
   */
  showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'status');
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  },

  /**
   * Blobをダウンロード
   * @param {Blob} blob
   * @param {string} filename
   */
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  /**
   * DataURLをダウンロード
   * @param {string} dataUrl
   * @param {string} filename
   */
  downloadDataURL(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
  },

  /**
   * ファイルサイズをフォーマット
   * @param {number} bytes
   * @returns {string}
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  },

  /**
   * debounce
   * @param {Function} fn
   * @param {number} delay
   * @returns {Function}
   */
  debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  /**
   * ファイル名の拡張子を変更
   * @param {string} filename
   * @param {string} newExt - 新しい拡張子（ドットなし）
   * @returns {string}
   */
  changeExt(filename, newExt) {
    const base = filename.replace(/\.[^.]+$/, '');
    return `${base}.${newExt}`;
  },

  /**
   * MIMEタイプから拡張子を取得
   * @param {string} mime
   * @returns {string}
   */
  mimeToExt(mime) {
    const map = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/webp': 'webp',
      'image/bmp': 'bmp',
      'image/gif': 'gif',
      'application/pdf': 'pdf',
    };
    return map[mime] || 'bin';
  },

  /**
   * canvasをBlobに変換
   * @param {HTMLCanvasElement} canvas
   * @param {string} mimeType
   * @param {number} quality - 0〜1
   * @returns {Promise<Blob>}
   */
  canvasToBlob(canvas, mimeType = 'image/png', quality = 0.92) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), mimeType, quality);
    });
  },

  /**
   * 画像をロード
   * @param {string} src - dataURL or URL
   * @returns {Promise<HTMLImageElement>}
   */
  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
      img.src = src;
    });
  },

  /**
   * ファイルがHEIC/HEIFかどうか判定
   * @param {File} file
   * @returns {boolean}
   */
  isHeic(file) {
    const name = file.name.toLowerCase();
    return (
      name.endsWith('.heic') ||
      name.endsWith('.heif') ||
      file.type === 'image/heic' ||
      file.type === 'image/heif'
    );
  },

  /**
   * ファイルが画像（HEIC含む）かどうか判定
   * @param {File} file
   * @returns {boolean}
   */
  isImageFile(file) {
    return file.type.startsWith('image/') || this.isHeic(file);
  },

  /**
   * HEICファイルをPNG Blobに変換（heic2anyライブラリ使用）
   * HEIC以外のファイルはそのまま返す
   * @param {File} file
   * @returns {Promise<Blob>} PNG Blob
   */
  async convertHeicIfNeeded(file) {
    if (!this.isHeic(file)) return file;
    const blob = await heic2any({
      blob: file,
      toType: 'image/png',
      quality: 1,
    });
    return Array.isArray(blob) ? blob[0] : blob;
  },

  /**
   * 画像ファイルをdataURLとして読み込む（HEIC自動変換付き）
   * @param {File} file
   * @returns {Promise<string>} dataURL
   */
  async readImageAsDataURL(file) {
    const converted = await this.convertHeicIfNeeded(file);
    return this.readFileAs(converted, 'dataURL');
  },

  /**
   * PDFをプレビュー描画（PDF.js使用）
   * @param {Blob} blob - PDFデータ
   * @param {HTMLElement|string} container - 描画先要素またはそのID
   * @param {number} maxPages - 最大描画ページ数
   * @returns {Promise<void>}
   */
  async renderPdfPreview(blob, container, maxPages) {
    if (typeof container === 'string') container = document.getElementById(container);
    if (!container) return;
    maxPages = maxPages || 20;
    container.innerHTML = '';
    container.style.display = '';

    var arrayBuffer = await this.readFileAs(blob, 'arrayBuffer');
    var pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    var pagesToRender = Math.min(pdf.numPages, maxPages);

    for (var i = 1; i <= pagesToRender; i++) {
      var page = await pdf.getPage(i);
      var vp = page.getViewport({ scale: 1 });

      // コンテナ幅に合わせてスケール（padding分を考慮）
      var containerWidth = container.clientWidth - 32 || 600;
      var scale = Math.min(containerWidth / vp.width, 1.5);
      var scaledVp = page.getViewport({ scale: scale });

      var wrapper = document.createElement('div');
      wrapper.className = 'pdf-preview-page';

      var canvas = document.createElement('canvas');
      canvas.width = scaledVp.width;
      canvas.height = scaledVp.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: scaledVp }).promise;

      var label = document.createElement('div');
      label.className = 'pdf-preview-label';
      label.textContent = i + ' / ' + pdf.numPages;

      wrapper.appendChild(canvas);
      wrapper.appendChild(label);
      container.appendChild(wrapper);
    }

    if (pdf.numPages > maxPages) {
      var more = document.createElement('div');
      more.className = 'pdf-preview-more';
      more.textContent = '... 他 ' + (pdf.numPages - maxPages) + ' ページ';
      container.appendChild(more);
    }
  },

  /**
   * 高品質ステップダウンリサイズ
   * @param {HTMLImageElement} img
   * @param {number} targetW
   * @param {number} targetH
   * @returns {HTMLCanvasElement}
   */
  stepDownResize(img, targetW, targetH) {
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
      const fin = document.createElement('canvas');
      fin.width = targetW;
      fin.height = targetH;
      fin.getContext('2d').drawImage(src, 0, 0, targetW, targetH);
      return fin;
    }
    return src;
  },

  /**
   * 画像プレビューモーダルを表示
   * @param {string} src - 画像URL（blob: or data:）
   */
  showImagePreview(src) {
    const existing = document.getElementById('choi-img-preview');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'choi-img-preview';
    overlay.className = 'img-preview-overlay';

    const backdrop = document.createElement('div');
    backdrop.className = 'img-preview-backdrop';

    const body = document.createElement('div');
    body.className = 'img-preview-body';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'img-preview-close';
    closeBtn.textContent = '\u00d7';

    const img = document.createElement('img');
    img.className = 'img-preview-img';
    img.src = src;

    body.appendChild(closeBtn);
    body.appendChild(img);
    overlay.appendChild(backdrop);
    overlay.appendChild(body);
    document.body.appendChild(overlay);

    function close() { overlay.remove(); }
    backdrop.addEventListener('click', close);
    closeBtn.addEventListener('click', close);
    const handler = function (e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', handler); }
    };
    document.addEventListener('keydown', handler);
  },

  /**
   * ファイルがExcelかどうか判定
   * @param {File} file
   * @returns {boolean}
   */
  isExcel(file) {
    var name = file.name.toLowerCase();
    return name.endsWith('.xlsx') || name.endsWith('.xls');
  },

  /**
   * Excel → PDFバイト列変換（SheetJS + Canvas + pdf-lib）
   * @param {File} file
   * @returns {Promise<Uint8Array>}
   */
  async excelToPdfBytes(file) {
    var arrayBuffer = await this.readFileAs(file, 'arrayBuffer');
    var workbook = XLSX.read(arrayBuffer, { type: 'array' });
    var pdfDoc = await PDFLib.PDFDocument.create();

    var PAGE_W = 841.89;
    var PAGE_H = 595.28;
    var MARGIN = 40;

    for (var si = 0; si < workbook.SheetNames.length; si++) {
      var sheetName = workbook.SheetNames[si];
      var sheet = workbook.Sheets[sheetName];
      var data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      if (data.length === 0) continue;

      var canvases = this._renderSheetPages(
        data, PAGE_W - MARGIN * 2, PAGE_H - MARGIN * 2
      );

      for (var ci = 0; ci < canvases.length; ci++) {
        var blob = await this.canvasToBlob(canvases[ci], 'image/png', 1);
        var pngBytes = new Uint8Array(await this.readFileAs(blob, 'arrayBuffer'));
        var img = await pdfDoc.embedPng(pngBytes);

        var page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        var scaleW = (PAGE_W - MARGIN * 2) / canvases[ci].width;
        var scaleH = (PAGE_H - MARGIN * 2) / canvases[ci].height;
        var s = Math.min(scaleW, scaleH, 1);

        page.drawImage(img, {
          x: MARGIN,
          y: PAGE_H - MARGIN - canvases[ci].height * s,
          width: canvases[ci].width * s,
          height: canvases[ci].height * s,
        });
      }
    }

    return new Uint8Array(await pdfDoc.save());
  },

  /**
   * Excelシートをページ分割してCanvas描画（内部用）
   */
  _renderSheetPages(data, contentW, contentH) {
    var SCALE = 2;
    var FONT = '"Meiryo", "Yu Gothic", "Hiragino Sans", sans-serif';
    var FONT_SIZE = 9 * SCALE;
    var BOLD_FONT = 'bold ' + FONT_SIZE + 'px ' + FONT;
    var NORMAL_FONT = FONT_SIZE + 'px ' + FONT;
    var PAD = 5 * SCALE;
    var ROW_H = FONT_SIZE + PAD * 2;
    var HDR_H = FONT_SIZE + PAD * 2 + 2 * SCALE;
    var TITLE_H = 0;
    var W = contentW * SCALE;
    var H = contentH * SCALE;

    var headers = data[0].map(String);
    var rows = data.slice(1).map(function (r) { return r.map(String); });

    var mc = document.createElement('canvas').getContext('2d');
    mc.font = NORMAL_FONT;
    var colWidths = headers.map(function (h, i) {
      mc.font = BOLD_FONT;
      var maxW = mc.measureText(h).width;
      mc.font = NORMAL_FONT;
      for (var ri = 0; ri < rows.length; ri++) {
        var w = mc.measureText(rows[ri][i] || '').width;
        if (w > maxW) maxW = w;
      }
      return maxW + PAD * 2;
    });

    var totalColW = colWidths.reduce(function (a, b) { return a + b; }, 0);
    var ratio = W / totalColW;
    for (var i = 0; i < colWidths.length; i++) {
      colWidths[i] = Math.floor(colWidths[i] * ratio);
    }
    var tableW = colWidths.reduce(function (a, b) { return a + b; }, 0);

    var rowsPerPage = Math.max(1, Math.floor((H - TITLE_H - HDR_H) / ROW_H));
    var totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
    var pages = [];

    for (var p = 0; p < totalPages; p++) {
      var pageRows = rows.slice(p * rowsPerPage, (p + 1) * rowsPerPage);
      var canvasH = TITLE_H + HDR_H + pageRows.length * ROW_H + SCALE;

      var canvas = document.createElement('canvas');
      canvas.width = tableW;
      canvas.height = canvasH;
      var ctx = canvas.getContext('2d');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, tableW, canvasH);

      var y = TITLE_H;

      ctx.fillStyle = '#0078d4';
      ctx.fillRect(0, y, tableW, HDR_H);
      ctx.fillStyle = '#ffffff';
      ctx.font = BOLD_FONT;
      var x = 0;
      for (var hi = 0; hi < headers.length; hi++) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, colWidths[hi], HDR_H);
        ctx.clip();
        ctx.fillText(headers[hi], x + PAD, y + HDR_H / 2);
        ctx.restore();
        x += colWidths[hi];
      }
      y += HDR_H;

      ctx.font = NORMAL_FONT;
      for (var ri = 0; ri < pageRows.length; ri++) {
        if (ri % 2 === 1) {
          ctx.fillStyle = '#f5f5f5';
          ctx.fillRect(0, y, tableW, ROW_H);
        }
        ctx.fillStyle = '#323130';
        x = 0;
        for (var ci = 0; ci < pageRows[ri].length; ci++) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(x, y, colWidths[ci] || 0, ROW_H);
          ctx.clip();
          ctx.fillText(pageRows[ri][ci], x + PAD, y + ROW_H / 2);
          ctx.restore();
          x += colWidths[ci] || 0;
        }
        y += ROW_H;
      }

      ctx.strokeStyle = '#e1dfdd';
      ctx.lineWidth = SCALE * 0.5;
      ctx.beginPath();
      y = TITLE_H;
      for (var li = 0; li <= pageRows.length + 1; li++) {
        ctx.moveTo(0, y);
        ctx.lineTo(tableW, y);
        y += li === 0 ? HDR_H : ROW_H;
      }
      x = 0;
      var gridBottom = TITLE_H + HDR_H + pageRows.length * ROW_H;
      for (var vi = 0; vi <= colWidths.length; vi++) {
        ctx.moveTo(x, TITLE_H);
        ctx.lineTo(x, gridBottom);
        if (vi < colWidths.length) x += colWidths[vi];
      }
      ctx.stroke();

      pages.push(canvas);
    }

    return pages;
  },

  /**
   * ドラッグで並べ替え可能なリストを初期化
   * @param {string} containerId
   * @param {Function} onReorder - (newOrder: number[]) => void
   */
  initSortable(containerId, onReorder) {
    const container = document.getElementById(containerId);
    if (!container) return;
    let dragEl = null;

    container.addEventListener('dragstart', (e) => {
      dragEl = e.target.closest('.file-list-item');
      if (!dragEl) return;
      dragEl.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const target = e.target.closest('.file-list-item');
      if (!target || target === dragEl) return;
      const rect = target.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (e.clientY < mid) {
        container.insertBefore(dragEl, target);
      } else {
        container.insertBefore(dragEl, target.nextSibling);
      }
    });

    container.addEventListener('dragend', () => {
      if (dragEl) dragEl.classList.remove('dragging');
      dragEl = null;
      if (onReorder) {
        const items = container.querySelectorAll('.file-list-item');
        const order = Array.from(items).map((el) => parseInt(el.dataset.index));
        onReorder(order);
      }
    });
  },
};
