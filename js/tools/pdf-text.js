/* ============================================
   PDFテキスト抽出
   ============================================ */
(function () {
  'use strict';

  var dropZone = document.getElementById('pt-drop');
  var fileInput = document.getElementById('pt-file');
  var progressArea = document.getElementById('pt-progress');
  var progressFill = document.getElementById('pt-progress-fill');
  var progressText = document.getElementById('pt-progress-text');
  var resultArea = document.getElementById('pt-result');
  var tabsContainer = document.getElementById('pt-tabs');
  var textArea = document.getElementById('pt-text');
  var copyBtn = document.getElementById('pt-copy');
  var downloadBtn = document.getElementById('pt-download');
  var resetBtn = document.getElementById('pt-reset');

  /** ページごとの抽出テキスト */
  var pageTexts = [];
  /** 全ページ結合テキスト */
  var allText = '';
  /** 元ファイル名（拡張子なし） */
  var baseName = '';
  /** 現在選択中のタブ（-1 = 全ページ, 0〜 = ページインデックス） */
  var activeTab = -1;

  // --- ドロップゾーン初期化 ---
  ChoiTool.initDropZone('pt-drop', 'pt-file', {
    multiple: false,
    onFiles: handleFiles,
  });

  // --- ファイル処理 ---
  async function handleFiles(files) {
    var file = files[0];
    if (!file.type && !file.name.toLowerCase().endsWith('.pdf')) {
      ChoiTool.showToast('PDFファイルを選択してください', 'error');
      return;
    }

    pageTexts = [];
    allText = '';
    activeTab = -1;
    baseName = file.name.replace(/\.pdf$/i, '');

    // UI: プログレス表示
    dropZone.style.display = 'none';
    resultArea.style.display = 'none';
    progressArea.style.display = '';
    progressFill.style.width = '0%';
    progressText.textContent = '読み込み中...';

    try {
      var arrayBuffer = await ChoiTool.readFileAs(file, 'arrayBuffer');
      var pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      var totalPages = pdf.numPages;

      for (var i = 1; i <= totalPages; i++) {
        progressText.textContent = i + ' / ' + totalPages + ' ページ抽出中...';
        progressFill.style.width = ((i / totalPages) * 100) + '%';

        var page = await pdf.getPage(i);
        var content = await page.getTextContent();
        var text = extractLinesFromContent(content);
        pageTexts.push(text);
      }

      // 全ページ結合
      allText = pageTexts.join('\n\n');

      // UI: 結果表示
      progressArea.style.display = 'none';
      buildTabs(totalPages);
      showTab(-1);
      resultArea.style.display = '';
      ChoiTool.showToast(totalPages + ' ページのテキストを抽出しました', 'success');
    } catch (e) {
      progressArea.style.display = 'none';
      dropZone.style.display = '';
      ChoiTool.showToast('PDFテキスト抽出に失敗しました: ' + e.message, 'error');
    }
  }

  // --- テキストコンテンツから行を組み立てる ---
  function extractLinesFromContent(content) {
    var items = content.items;
    if (items.length === 0) return '';

    // Y座標でグループ化（transform[5]がY座標）
    var lineMap = {};
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (!item.str) continue;
      // Y座標を丸めて同一行として扱う（小数点以下の差を吸収）
      var y = Math.round(item.transform[5] * 10) / 10;
      if (!lineMap[y]) {
        lineMap[y] = [];
      }
      lineMap[y].push({
        x: item.transform[4],
        text: item.str,
      });
    }

    // Y座標を降順でソート（上から下へ）
    var yKeys = Object.keys(lineMap).map(Number);
    yKeys.sort(function (a, b) { return b - a; });

    var lines = [];
    for (var k = 0; k < yKeys.length; k++) {
      var lineItems = lineMap[yKeys[k]];
      // X座標順にソート（左から右へ）
      lineItems.sort(function (a, b) { return a.x - b.x; });
      var lineText = lineItems.map(function (li) { return li.text; }).join('');
      lines.push(lineText);
    }

    return lines.join('\n');
  }

  // --- タブを構築 ---
  function buildTabs(totalPages) {
    tabsContainer.innerHTML = '';

    // 「全ページ」タブ
    var allTab = document.createElement('button');
    allTab.className = 'btn btn-sm btn-secondary pt-tab active';
    allTab.textContent = '全ページ';
    allTab.dataset.page = '-1';
    allTab.addEventListener('click', function () { showTab(-1); });
    tabsContainer.appendChild(allTab);

    // 個別ページタブ
    for (var i = 0; i < totalPages; i++) {
      var tab = document.createElement('button');
      tab.className = 'btn btn-sm btn-secondary pt-tab';
      tab.textContent = String(i + 1);
      tab.dataset.page = String(i);
      (function (pageIndex) {
        tab.addEventListener('click', function () { showTab(pageIndex); });
      })(i);
      tabsContainer.appendChild(tab);
    }
  }

  // --- タブ切り替え ---
  function showTab(pageIndex) {
    activeTab = pageIndex;

    // タブのアクティブ状態を更新
    var tabs = tabsContainer.querySelectorAll('.pt-tab');
    for (var i = 0; i < tabs.length; i++) {
      var tabPage = parseInt(tabs[i].dataset.page);
      if (tabPage === pageIndex) {
        tabs[i].classList.add('active');
      } else {
        tabs[i].classList.remove('active');
      }
    }

    // テキストエリアの内容を更新
    if (pageIndex === -1) {
      textArea.value = allText;
    } else {
      textArea.value = pageTexts[pageIndex] || '';
    }
  }

  // --- 現在表示中のテキストを取得 ---
  function getCurrentText() {
    if (activeTab === -1) {
      return allText;
    }
    return pageTexts[activeTab] || '';
  }

  // --- コピー ---
  copyBtn.addEventListener('click', function () {
    var text = getCurrentText();
    if (!text) {
      ChoiTool.showToast('コピーするテキストがありません', 'error');
      return;
    }
    navigator.clipboard.writeText(text).then(function () {
      ChoiTool.showToast('コピーしました', 'success');
    }).catch(function () {
      // フォールバック: textareaを使ったコピー
      textArea.select();
      document.execCommand('copy');
      ChoiTool.showToast('コピーしました', 'success');
    });
  });

  // --- ダウンロード ---
  downloadBtn.addEventListener('click', function () {
    var text = getCurrentText();
    if (!text) {
      ChoiTool.showToast('ダウンロードするテキストがありません', 'error');
      return;
    }
    var suffix = activeTab === -1 ? '' : '_p' + (activeTab + 1);
    var filename = baseName + suffix + '.txt';
    var blob = new Blob([text], { type: 'text/plain' });
    ChoiTool.downloadBlob(blob, filename);
  });

  // --- リセット ---
  resetBtn.addEventListener('click', function () {
    pageTexts = [];
    allText = '';
    baseName = '';
    activeTab = -1;
    tabsContainer.innerHTML = '';
    textArea.value = '';
    resultArea.style.display = 'none';
    progressArea.style.display = 'none';
    dropZone.style.display = '';
    fileInput.value = '';
  });
})();
