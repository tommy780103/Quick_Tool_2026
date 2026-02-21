/* ============================================
   パスワード生成
   ============================================ */
(function () {
  'use strict';

  // --- DOM要素 ---
  var outputEl = document.getElementById('pg-output');
  var copyBtn = document.getElementById('pg-copy');
  var generateBtn = document.getElementById('pg-generate');
  var strengthBar = document.getElementById('pg-strength-bar');
  var strengthLabel = document.getElementById('pg-strength-label');
  var lengthEl = document.getElementById('pg-length');
  var lengthValEl = document.getElementById('pg-length-val');
  var uppercaseEl = document.getElementById('pg-uppercase');
  var lowercaseEl = document.getElementById('pg-lowercase');
  var numbersEl = document.getElementById('pg-numbers');
  var symbolsEl = document.getElementById('pg-symbols');
  var excludeEl = document.getElementById('pg-exclude');
  var countEl = document.getElementById('pg-count');
  var historyWrap = document.getElementById('pg-history');
  var historyEl = document.getElementById('pg-history-list');

  // --- 文字セット定義 ---
  var CHARSETS = {
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
    symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?/~`'
  };

  // --- 履歴 ---
  var history = [];

  // --- 文字セット構築 ---
  function buildCharset() {
    var charset = '';
    if (uppercaseEl.checked) charset += CHARSETS.uppercase;
    if (lowercaseEl.checked) charset += CHARSETS.lowercase;
    if (numbersEl.checked) charset += CHARSETS.numbers;
    if (symbolsEl.checked) charset += CHARSETS.symbols;

    // 除外文字を除去
    var excluded = excludeEl.value;
    if (excluded) {
      for (var i = 0; i < excluded.length; i++) {
        charset = charset.split(excluded[i]).join('');
      }
    }

    return charset;
  }

  // --- セキュアな乱数でパスワード生成 ---
  function generatePassword(length, charset) {
    if (!charset || charset.length === 0) return '';
    var randomValues = new Uint32Array(length);
    crypto.getRandomValues(randomValues);
    var password = '';
    for (var i = 0; i < length; i++) {
      password += charset[randomValues[i] % charset.length];
    }
    return password;
  }

  // --- エントロピー計算と強度判定 ---
  function calcStrength(length, charsetLength) {
    if (charsetLength <= 0) return { bits: 0, level: 0, label: '—', color: '#ccc' };
    var bits = length * Math.log2(charsetLength);

    var level, label, color;
    if (bits < 40) {
      level = 0;
      label = '弱い';
      color = '#e53935'; // red
    } else if (bits < 60) {
      level = 1;
      label = 'やや弱い';
      color = '#fb8c00'; // orange
    } else if (bits < 80) {
      level = 2;
      label = '普通';
      color = '#fdd835'; // yellow
    } else if (bits < 120) {
      level = 3;
      label = '強い';
      color = '#43a047'; // green
    } else {
      level = 4;
      label = '非常に強い';
      color = '#1b5e20'; // dark green
    }

    return { bits: bits, level: level, label: label, color: color };
  }

  // --- 強度バー更新 ---
  function updateStrengthBar(strength) {
    var percent = Math.min((strength.bits / 150) * 100, 100);
    strengthBar.style.width = percent + '%';
    strengthBar.style.backgroundColor = strength.color;
    strengthLabel.textContent = strength.label + '（' + Math.floor(strength.bits) + ' bits）';
  }

  // --- HTMLエスケープ ---
  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // --- メイン生成処理 ---
  function generate() {
    var charset = buildCharset();
    if (!charset) {
      ChoiTool.showToast('少なくとも1つの文字種を選択してください', 'error');
      return;
    }

    var length = parseInt(lengthEl.value, 10);
    var count = parseInt(countEl.value, 10) || 1;
    count = Math.max(1, Math.min(count, 50));

    var passwords = [];
    for (var i = 0; i < count; i++) {
      passwords.push(generatePassword(length, charset));
    }

    // 強度計算（最初のパスワード基準）
    var strength = calcStrength(length, charset.length);
    updateStrengthBar(strength);

    // 出力表示
    if (count === 1) {
      outputEl.innerHTML = '<span class="pg-password-text">' + escapeHtml(passwords[0]) + '</span>';
    } else {
      var html = '';
      for (var j = 0; j < passwords.length; j++) {
        html += '<div class="pg-password-row" style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">';
        html += '<span class="pg-password-text" style="flex:1;word-break:break-all;">' + escapeHtml(passwords[j]) + '</span>';
        html += '<button type="button" class="btn btn-sm btn-outline pg-copy-single" data-password="' + escapeHtml(passwords[j]) + '" title="コピー">';
        html += 'コピー';
        html += '</button>';
        html += '</div>';
      }
      outputEl.innerHTML = html;

      // 個別コピーボタンのイベント
      var singleBtns = outputEl.querySelectorAll('.pg-copy-single');
      for (var k = 0; k < singleBtns.length; k++) {
        singleBtns[k].addEventListener('click', function () {
          var pw = this.getAttribute('data-password');
          copyToClipboard(pw);
        });
      }
    }

    // 履歴に追加
    for (var h = 0; h < passwords.length; h++) {
      history.unshift({
        password: passwords[h],
        length: length,
        strength: strength.label,
        time: new Date()
      });
    }

    // 履歴は最大100件
    if (history.length > 100) {
      history.length = 100;
    }

    renderHistory();
  }

  // --- クリップボードにコピー ---
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(function () {
      ChoiTool.showToast('コピーしました', 'success');
    }).catch(function () {
      ChoiTool.showToast('コピーに失敗しました', 'error');
    });
  }

  // --- 出力エリアのパスワードをすべてコピー ---
  function copyOutput() {
    var passwords = [];
    var spans = outputEl.querySelectorAll('.pg-password-text');
    for (var i = 0; i < spans.length; i++) {
      passwords.push(spans[i].textContent);
    }
    if (passwords.length === 0) return;
    copyToClipboard(passwords.join('\n'));
  }

  // --- 履歴描画 ---
  function renderHistory() {
    if (history.length === 0) {
      historyWrap.style.display = 'none';
      return;
    }
    historyWrap.style.display = '';

    var html = '';
    for (var i = 0; i < history.length; i++) {
      var item = history[i];
      var timeStr = item.time.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      html += '<div class="pg-history-item">';
      html += '<span style="font-family:monospace;font-size:13px;flex:1;word-break:break-all;">' + escapeHtml(item.password) + '</span>';
      html += '<span style="font-size:11px;color:var(--color-text-secondary);white-space:nowrap;">' + escapeHtml(item.strength) + '</span>';
      html += '<span style="font-size:11px;color:var(--color-text-secondary);white-space:nowrap;">' + escapeHtml(timeStr) + '</span>';
      html += '<button type="button" class="btn btn-sm btn-outline pg-history-copy" data-password="' + escapeHtml(item.password) + '" title="コピー">';
      html += 'コピー';
      html += '</button>';
      html += '</div>';
    }
    historyEl.innerHTML = html;

    // 履歴のコピーボタンイベント
    var btns = historyEl.querySelectorAll('.pg-history-copy');
    for (var j = 0; j < btns.length; j++) {
      btns[j].addEventListener('click', function () {
        var pw = this.getAttribute('data-password');
        copyToClipboard(pw);
      });
    }
  }

  // --- イベントリスナー ---

  // 生成ボタン
  generateBtn.addEventListener('click', generate);

  // コピーボタン
  copyBtn.addEventListener('click', copyOutput);

  // 長さスライダー
  lengthEl.addEventListener('input', function () {
    lengthValEl.textContent = lengthEl.value;
    generate();
  });

  // チェックボックス変更で自動再生成
  uppercaseEl.addEventListener('change', generate);
  lowercaseEl.addEventListener('change', generate);
  numbersEl.addEventListener('change', generate);
  symbolsEl.addEventListener('change', generate);

  // 除外文字変更で自動再生成（デバウンス）
  var debouncedGenerate = ChoiTool.debounce(generate, 300);
  excludeEl.addEventListener('input', debouncedGenerate);

  // 生成数変更で自動再生成
  countEl.addEventListener('change', generate);

  // --- 初期生成 ---
  lengthValEl.textContent = lengthEl.value;
  generate();
})();
