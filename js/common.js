/* ============================================
   ちょいツール — 共通ユーティリティ
   ============================================ */

const ChoiTool = {
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
