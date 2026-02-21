/* ============================================
   画像→PDF変換
   ============================================ */
(function () {
  const settingsPanel = document.getElementById('i2p-settings');
  const sizeSelect = document.getElementById('i2p-size');
  const marginCheck = document.getElementById('i2p-margin');
  const fileList = document.getElementById('i2p-list');
  const executeBtn = document.getElementById('i2p-execute');
  const resultArea = document.getElementById('i2p-result');
  const resultInfo = document.getElementById('i2p-info');
  const downloadBtn = document.getElementById('i2p-download');

  /** 画像ファイル配列 */
  let imageFiles = [];
  let resultBlob = null;

  // --- ドロップゾーン初期化 ---
  ChoiTool.initDropZone('i2p-drop', 'i2p-file', {
    multiple: true,
    onFiles: handleFiles,
  });

  // --- ファイル追加 ---
  function handleFiles(files) {
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (images.length === 0) {
      ChoiTool.showToast('画像ファイルを選択してください', 'error');
      return;
    }
    images.forEach((f) => imageFiles.push(f));
    renderFileList();
    settingsPanel.style.display = '';
    resultArea.style.display = 'none';
  }

  // --- ファイルリスト描画 ---
  function renderFileList() {
    fileList.innerHTML = '';
    imageFiles.forEach((file, i) => {
      const item = document.createElement('div');
      item.className = 'file-list-item';
      item.draggable = true;
      item.dataset.index = i;
      item.innerHTML =
        '<span class="file-list-item-grip">\u283F</span>' +
        '<span class="file-list-item-name">' + escapeHTML(file.name) + '</span>' +
        '<span class="file-list-item-size">' + ChoiTool.formatFileSize(file.size) + '</span>' +
        '<button class="file-list-item-remove" data-idx="' + i + '">\u00D7</button>';
      fileList.appendChild(item);
    });

    // 削除ボタン
    fileList.querySelectorAll('.file-list-item-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        imageFiles.splice(parseInt(btn.dataset.idx), 1);
        renderFileList();
        if (imageFiles.length === 0) {
          settingsPanel.style.display = 'none';
        }
      });
    });
  }

  // --- 並べ替え初期化 ---
  ChoiTool.initSortable('i2p-list', (newOrder) => {
    const reordered = newOrder.map((i) => imageFiles[i]);
    imageFiles = reordered;
    renderFileList();
  });

  // --- 画像をPNG Uint8Arrayに変換（JPG以外） ---
  async function toPngBytes(file) {
    const dataURL = await ChoiTool.readFileAs(file, 'dataURL');
    const img = await ChoiTool.loadImage(dataURL);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const blob = await ChoiTool.canvasToBlob(canvas, 'image/png');
    const buf = await blob.arrayBuffer();
    return { bytes: new Uint8Array(buf), width: img.naturalWidth, height: img.naturalHeight };
  }

  // --- PDF変換実行 ---
  executeBtn.addEventListener('click', async () => {
    if (imageFiles.length === 0) {
      ChoiTool.showToast('画像ファイルを追加してください', 'error');
      return;
    }

    executeBtn.disabled = true;
    executeBtn.textContent = '変換中...';

    try {
      const pdfDoc = await PDFLib.PDFDocument.create();
      const pageSize = sizeSelect.value;
      const useMargin = marginCheck.checked;
      const margin = useMargin ? 40 : 0;

      // ページサイズ定数
      const PAGE_SIZES = {
        a4: { width: 595.28, height: 841.89 },
        letter: { width: 612, height: 792 },
      };

      for (const file of imageFiles) {
        let embeddedImage;
        let imgWidth;
        let imgHeight;

        if (file.type === 'image/jpeg') {
          const buf = await ChoiTool.readFileAs(file, 'arrayBuffer');
          embeddedImage = await pdfDoc.embedJpg(new Uint8Array(buf));
          imgWidth = embeddedImage.width;
          imgHeight = embeddedImage.height;
        } else {
          const { bytes, width, height } = await toPngBytes(file);
          embeddedImage = await pdfDoc.embedPng(bytes);
          imgWidth = width;
          imgHeight = height;
        }

        // ページサイズ決定
        let pageWidth, pageHeight;
        if (pageSize === 'fit') {
          pageWidth = imgWidth + margin * 2;
          pageHeight = imgHeight + margin * 2;
        } else {
          const ps = PAGE_SIZES[pageSize];
          pageWidth = ps.width;
          pageHeight = ps.height;
        }

        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        // 描画領域
        const drawWidth = pageWidth - margin * 2;
        const drawHeight = pageHeight - margin * 2;

        // アスペクト比を維持してフィット
        const scaleX = drawWidth / imgWidth;
        const scaleY = drawHeight / imgHeight;
        const scale = Math.min(scaleX, scaleY, 1);
        const finalW = imgWidth * scale;
        const finalH = imgHeight * scale;

        // 中央配置
        const x = margin + (drawWidth - finalW) / 2;
        const y = margin + (drawHeight - finalH) / 2;

        page.drawImage(embeddedImage, {
          x: x,
          y: y,
          width: finalW,
          height: finalH,
        });
      }

      const pdfBytes = await pdfDoc.save();
      resultBlob = new Blob([pdfBytes], { type: 'application/pdf' });

      resultInfo.textContent = pdfDoc.getPageCount() + ' ページ / ' + ChoiTool.formatFileSize(resultBlob.size);
      resultArea.style.display = '';
      ChoiTool.renderPdfPreview(resultBlob, 'i2p-preview');
      ChoiTool.showToast('画像をPDFに変換しました', 'success');
    } catch (e) {
      ChoiTool.showToast('画像→PDF変換に失敗しました: ' + e.message, 'error');
    } finally {
      executeBtn.disabled = false;
      executeBtn.textContent = 'PDFを作成';
    }
  });

  // --- ダウンロード ---
  downloadBtn.addEventListener('click', () => {
    if (resultBlob) {
      ChoiTool.downloadBlob(resultBlob, 'images.pdf');
    }
  });

  // --- HTMLエスケープ ---
  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
  // --- リセット ---
  document.getElementById('i2p-reset').addEventListener('click', () => {
    imageFiles = [];
    resultBlob = null;
    fileList.innerHTML = '';
    settingsPanel.style.display = 'none';
    resultArea.style.display = 'none';
    document.getElementById('i2p-preview').innerHTML = '';
    document.getElementById('i2p-preview').style.display = 'none';
    resultInfo.textContent = '';
    document.getElementById('i2p-file').value = '';
  });
})();
