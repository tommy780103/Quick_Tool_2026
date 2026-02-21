/* ============================================
   PDFパスワード保護
   pdf-lib-plus-encrypt を使用
   ============================================ */
(function () {
  'use strict';

  // --- DOM要素 ---
  var settingsPanel = document.getElementById('pp-settings');
  var filenameDisplay = document.getElementById('pp-filename');
  var filesizeDisplay = document.getElementById('pp-filesize');
  var userPassInput = document.getElementById('pp-user-pass');
  var userToggleBtn = document.getElementById('pp-user-toggle');
  var ownerPassInput = document.getElementById('pp-owner-pass');
  var ownerToggleBtn = document.getElementById('pp-owner-toggle');
  var permPrint = document.getElementById('pp-perm-print');
  var permCopy = document.getElementById('pp-perm-copy');
  var permEdit = document.getElementById('pp-perm-edit');
  var executeBtn = document.getElementById('pp-execute');
  var resultArea = document.getElementById('pp-result');
  var downloadBtn = document.getElementById('pp-download');
  var resetBtn = document.getElementById('pp-reset');

  // --- 状態 ---
  var srcFile = null;
  var srcBytes = null;
  var resultBlob = null;
  var resultFileName = '';

  // --- ドロップゾーン初期化 ---
  ChoiTool.initDropZone('pp-drop', 'pp-file', {
    multiple: false,
    onFiles: handleFiles,
  });

  // --- パスワード表示/非表示トグル ---
  if (userToggleBtn) {
    userToggleBtn.addEventListener('click', function () {
      var isPassword = userPassInput.type === 'password';
      userPassInput.type = isPassword ? 'text' : 'password';
      userToggleBtn.textContent = isPassword ? '\u25CE' : '\u25C9';
      userToggleBtn.title = isPassword ? 'パスワードを非表示' : 'パスワードを表示';
    });
  }
  if (ownerToggleBtn) {
    ownerToggleBtn.addEventListener('click', function () {
      var isPassword = ownerPassInput.type === 'password';
      ownerPassInput.type = isPassword ? 'text' : 'password';
      ownerToggleBtn.textContent = isPassword ? '\u25CE' : '\u25C9';
      ownerToggleBtn.title = isPassword ? 'パスワードを非表示' : 'パスワードを表示';
    });
  }

  // --- ファイル読み込み ---
  async function handleFiles(files) {
    var file = files[0];
    if (!file) return;

    var ext = file.name.toLowerCase().match(/\.[^.]+$/);
    if (!ext || ext[0] !== '.pdf') {
      ChoiTool.showToast('PDFファイルを選択してください', 'error');
      return;
    }

    try {
      srcFile = file;
      srcBytes = new Uint8Array(await ChoiTool.readFileAs(file, 'arrayBuffer'));

      // pdf-libで読み込み検証
      var pdfDoc = await PDFLib.PDFDocument.load(srcBytes, { ignoreEncryption: true });
      var pageCount = pdfDoc.getPageCount();

      filenameDisplay.textContent = file.name;
      filesizeDisplay.textContent = ChoiTool.formatFileSize(file.size) + ' / ' + pageCount + ' ページ';
      settingsPanel.style.display = '';
      resultArea.style.display = 'none';
      resultBlob = null;

      ChoiTool.showToast('PDFを読み込みました（' + pageCount + ' ページ）', 'info');
    } catch (e) {
      ChoiTool.showToast('PDFの読み込みに失敗しました: ' + e.message, 'error');
    }
  }

  // ===========================================================================
  //  実行ボタン
  // ===========================================================================
  if (executeBtn) {
    executeBtn.addEventListener('click', async function () {
      if (!srcBytes) {
        ChoiTool.showToast('PDFファイルを読み込んでください', 'error');
        return;
      }

      var userPass = userPassInput.value.trim();
      if (!userPass) {
        ChoiTool.showToast('ユーザーパスワードを入力してください', 'error');
        userPassInput.focus();
        return;
      }

      var ownerPass = ownerPassInput.value.trim() || userPass;
      var allowPrint = permPrint.checked;
      var allowCopy = permCopy.checked;
      var allowEdit = permEdit.checked;

      executeBtn.disabled = true;
      executeBtn.textContent = '暗号化中...';

      try {
        // pdf-lib-plus-encrypt で読み込み
        var pdfDoc = await PDFLib.PDFDocument.load(srcBytes, { ignoreEncryption: true });

        // 暗号化設定
        await pdfDoc.encrypt({
          userPassword: userPass,
          ownerPassword: ownerPass,
          permissions: {
            printing: allowPrint ? 'highResolution' : false,
            modifying: allowEdit,
            copying: allowCopy,
            annotating: allowEdit,
            fillingForms: allowEdit,
            contentAccessibility: true,
            documentAssembly: false,
          },
        });

        // 保存
        var encryptedBytes = await pdfDoc.save();

        resultBlob = new Blob([encryptedBytes], { type: 'application/pdf' });
        resultFileName = srcFile.name.replace(/\.pdf$/i, '_protected.pdf');

        resultArea.style.display = '';
        ChoiTool.showToast('PDFにパスワード保護を適用しました', 'success');
      } catch (e) {
        console.error('PDF暗号化エラー:', e);
        ChoiTool.showToast('暗号化に失敗しました: ' + e.message, 'error');
      } finally {
        executeBtn.disabled = false;
        executeBtn.textContent = 'パスワード保護を実行';
      }
    });
  }

  // --- ダウンロード ---
  if (downloadBtn) {
    downloadBtn.addEventListener('click', function () {
      if (resultBlob) {
        ChoiTool.downloadBlob(resultBlob, resultFileName);
      }
    });
  }

  // --- リセット ---
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      srcFile = null;
      srcBytes = null;
      resultBlob = null;
      resultFileName = '';
      settingsPanel.style.display = 'none';
      resultArea.style.display = 'none';
      filenameDisplay.textContent = '';
      filesizeDisplay.textContent = '';
      userPassInput.value = '';
      ownerPassInput.value = '';
      permPrint.checked = true;
      permCopy.checked = false;
      permEdit.checked = false;
      document.getElementById('pp-file').value = '';
    });
  }
})();
