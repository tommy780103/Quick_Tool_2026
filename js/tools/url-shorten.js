/* ============================================
   URL短縮 (is.gd API)
   ============================================ */
(function () {
  var urlInput = document.getElementById('us-url');
  var executeBtn = document.getElementById('us-execute');
  var resultArea = document.getElementById('us-result');
  var shortUrlInput = document.getElementById('us-short-url');
  var copyBtn = document.getElementById('us-copy');
  var historyArea = document.getElementById('us-history');
  var historyList = document.getElementById('us-history-list');

  var history = [];

  // --- Enterキーで実行 ---
  urlInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      shorten();
    }
  });

  executeBtn.addEventListener('click', shorten);

  async function shorten() {
    var url = urlInput.value.trim();
    if (!url) {
      ChoiTool.showToast('URLを入力してください', 'error');
      return;
    }

    // URL検証
    try {
      var parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('invalid protocol');
      }
    } catch (_) {
      ChoiTool.showToast('有効なURL（http:// または https://）を入力してください', 'error');
      return;
    }

    executeBtn.disabled = true;
    executeBtn.textContent = '処理中...';

    try {
      var shortUrl = await callShortenApi(url);
      shortUrlInput.value = shortUrl;
      resultArea.style.display = '';

      // 履歴に追加
      history.unshift({ original: url, short: shortUrl });
      renderHistory();

      ChoiTool.showToast('短縮URLを生成しました', 'success');
    } catch (e) {
      ChoiTool.showToast('短縮に失敗しました: ' + e.message, 'error');
    } finally {
      executeBtn.disabled = false;
      executeBtn.textContent = '短縮';
    }
  }

  // --- API呼び出し（is.gd → TinyURL フォールバック） ---
  async function callShortenApi(url) {
    // is.gd
    try {
      var res = await fetch(
        'https://is.gd/create.php?format=json&url=' + encodeURIComponent(url)
      );
      if (res.ok) {
        var data = await res.json();
        if (data.shorturl) return data.shorturl;
      }
    } catch (_) { /* フォールバック */ }

    // TinyURL フォールバック
    try {
      var res2 = await fetch(
        'https://tinyurl.com/api-create.php?url=' + encodeURIComponent(url)
      );
      if (res2.ok) {
        var text = await res2.text();
        if (text && text.startsWith('http')) return text.trim();
      }
    } catch (_) { /* エラー */ }

    throw new Error('短縮サービスに接続できません。インターネット接続を確認してください');
  }

  // --- コピー ---
  copyBtn.addEventListener('click', function () {
    var text = shortUrlInput.value;
    if (!text) return;
    navigator.clipboard.writeText(text).then(function () {
      ChoiTool.showToast('コピーしました', 'success');
    }).catch(function () {
      // フォールバック
      shortUrlInput.select();
      document.execCommand('copy');
      ChoiTool.showToast('コピーしました', 'success');
    });
  });

  // --- 履歴描画 ---
  function renderHistory() {
    if (history.length === 0) {
      historyArea.style.display = 'none';
      return;
    }
    historyArea.style.display = '';
    historyList.innerHTML = '';

    history.forEach(function (item) {
      var row = document.createElement('div');
      row.className = 'us-history-item';
      row.innerHTML =
        '<span class="us-history-original">' + escapeHTML(item.original) + '</span>' +
        '<a class="us-history-short" href="' + escapeAttr(item.short) + '" target="_blank" rel="noopener">' +
          escapeHTML(item.short) + '</a>' +
        '<button class="us-history-copy">コピー</button>';
      historyList.appendChild(row);

      row.querySelector('.us-history-copy').addEventListener('click', function () {
        navigator.clipboard.writeText(item.short).then(function () {
          ChoiTool.showToast('コピーしました', 'success');
        }).catch(function () {
          ChoiTool.showToast('コピーに失敗しました', 'error');
        });
      });
    });
  }

  var escapeHTML = ChoiTool.escapeHTML;
  var escapeAttr = ChoiTool.escapeAttr;
})();
