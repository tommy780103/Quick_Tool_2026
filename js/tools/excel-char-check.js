/* ============================================
   Excel 文字チェック（全角/半角 可視化 & 一括変換）
   ============================================ */
(function () {
  // --- DOM ---
  var settings = document.getElementById('ecc-settings');
  var dropZone = document.getElementById('ecc-drop');
  var sheetTabsEl = document.getElementById('ecc-sheet-tabs');
  var summaryEl = document.getElementById('ecc-summary');
  var tableWrap = document.getElementById('ecc-table-wrap');
  var convertBtn = document.getElementById('ecc-convert');
  var downloadBtn = document.getElementById('ecc-download');
  var resetBtn = document.getElementById('ecc-reset');

  var optAlpha = document.getElementById('ecc-opt-alpha');
  var optKana = document.getElementById('ecc-opt-kana');
  var optSpace = document.getElementById('ecc-opt-space');
  var optSymbol = document.getElementById('ecc-opt-symbol');

  // --- State ---
  var workbook = null;
  var fileName = '';
  var activeSheet = 0;

  // --- 半角カタカナ→全角変換テーブル ---
  var HANKAKU_KANA_MAP = {
    '\uFF66': '\u30F2', '\uFF67': '\u30A1', '\uFF68': '\u30A3', '\uFF69': '\u30A5',
    '\uFF6A': '\u30A7', '\uFF6B': '\u30A9', '\uFF6C': '\u30E3', '\uFF6D': '\u30E5',
    '\uFF6E': '\u30E7', '\uFF6F': '\u30C3', '\uFF70': '\u30FC', '\uFF71': '\u30A2',
    '\uFF72': '\u30A4', '\uFF73': '\u30A6', '\uFF74': '\u30A8', '\uFF75': '\u30AA',
    '\uFF76': '\u30AB', '\uFF77': '\u30AD', '\uFF78': '\u30AF', '\uFF79': '\u30B1',
    '\uFF7A': '\u30B3', '\uFF7B': '\u30B5', '\uFF7C': '\u30B7', '\uFF7D': '\u30B9',
    '\uFF7E': '\u30BB', '\uFF7F': '\u30BD', '\uFF80': '\u30BF', '\uFF81': '\u30C1',
    '\uFF82': '\u30C4', '\uFF83': '\u30C6', '\uFF84': '\u30C8', '\uFF85': '\u30CA',
    '\uFF86': '\u30CB', '\uFF87': '\u30CC', '\uFF88': '\u30CD', '\uFF89': '\u30CE',
    '\uFF8A': '\u30CF', '\uFF8B': '\u30D2', '\uFF8C': '\u30D5', '\uFF8D': '\u30D8',
    '\uFF8E': '\u30DB', '\uFF8F': '\u30DE', '\uFF90': '\u30DF', '\uFF91': '\u30E0',
    '\uFF92': '\u30E1', '\uFF93': '\u30E2', '\uFF94': '\u30E4', '\uFF95': '\u30E6',
    '\uFF96': '\u30E8', '\uFF97': '\u30E9', '\uFF98': '\u30EA', '\uFF99': '\u30EB',
    '\uFF9A': '\u30EC', '\uFF9B': '\u30ED', '\uFF9C': '\u30EF', '\uFF9D': '\u30F3',
    '\uFF9E': '\u309B', '\uFF9F': '\u309C'
  };

  // 濁点結合対象
  var DAKUTEN_MAP = {
    '\u30AB': '\u30AC', '\u30AD': '\u30AE', '\u30AF': '\u30B0', '\u30B1': '\u30B2',
    '\u30B3': '\u30B4', '\u30B5': '\u30B6', '\u30B7': '\u30B8', '\u30B9': '\u30BA',
    '\u30BB': '\u30BC', '\u30BD': '\u30BE', '\u30BF': '\u30C0', '\u30C1': '\u30C2',
    '\u30C4': '\u30C5', '\u30C6': '\u30C7', '\u30C8': '\u30C9', '\u30CF': '\u30D0',
    '\u30D2': '\u30D3', '\u30D5': '\u30D6', '\u30D8': '\u30D9', '\u30DB': '\u30DC',
    '\u30A6': '\u30F4'
  };

  // 半濁点結合対象
  var HANDAKUTEN_MAP = {
    '\u30CF': '\u30D1', '\u30D2': '\u30D4', '\u30D5': '\u30D7',
    '\u30D8': '\u30DA', '\u30DB': '\u30DD'
  };

  // --- 文字判定 ---
  function isFullwidthAlphaNum(code) {
    return (code >= 0xFF21 && code <= 0xFF3A) || // Ａ-Ｚ
           (code >= 0xFF41 && code <= 0xFF5A) || // ａ-ｚ
           (code >= 0xFF10 && code <= 0xFF19);   // ０-９
  }

  function isHalfwidthKatakana(code) {
    return code >= 0xFF65 && code <= 0xFF9F;
  }

  function isFullwidthSpace(code) {
    return code === 0x3000;
  }

  function isFullwidthSymbol(code) {
    // U+FF01-FF0F, U+FF1A-FF20, U+FF3B-FF40, U+FF5B-FF5E
    return (code >= 0xFF01 && code <= 0xFF0F) ||
           (code >= 0xFF1A && code <= 0xFF20) ||
           (code >= 0xFF3B && code <= 0xFF40) ||
           (code >= 0xFF5B && code <= 0xFF5E);
  }

  // --- セル分析 ---
  function analyzeCell(value) {
    if (typeof value !== 'string' || value.length === 0) return null;
    var issues = [];
    for (var i = 0; i < value.length; i++) {
      var code = value.charCodeAt(i);
      if (isFullwidthAlphaNum(code)) {
        issues.push({ index: i, type: 'fw', char: value[i] });
      } else if (isHalfwidthKatakana(code)) {
        issues.push({ index: i, type: 'hk', char: value[i] });
      } else if (isFullwidthSpace(code)) {
        issues.push({ index: i, type: 'fw', char: value[i] });
      } else if (isFullwidthSymbol(code)) {
        issues.push({ index: i, type: 'fw', char: value[i] });
      }
    }
    return issues.length > 0 ? issues : null;
  }

  // --- セル番地変換 ---
  function cellAddress(row, col) {
    var letter = '';
    var c = col;
    while (c >= 0) {
      letter = String.fromCharCode(65 + (c % 26)) + letter;
      c = Math.floor(c / 26) - 1;
    }
    return letter + (row + 1);
  }

  // --- ハイライトHTML生成 ---
  function highlightText(value, issues) {
    if (!issues) return escapeHTML(value);
    var parts = [];
    var issueMap = {};
    for (var k = 0; k < issues.length; k++) {
      issueMap[issues[k].index] = issues[k].type;
    }
    for (var i = 0; i < value.length; i++) {
      var ch = escapeHTML(value[i]);
      if (issueMap[i] === 'fw') {
        parts.push('<span class="ecc-fw">' + ch + '</span>');
      } else if (issueMap[i] === 'hk') {
        parts.push('<span class="ecc-hk">' + ch + '</span>');
      } else {
        parts.push('<span class="ecc-ok">' + ch + '</span>');
      }
    }
    return parts.join('');
  }

  var escapeHTML = ChoiTool.escapeHTML;

  // --- ファイル読み込み ---
  ChoiTool.initDropZone('ecc-drop', 'ecc-file', {
    multiple: false,
    onFiles: function (files) {
      var file = files[0];
      if (!ChoiTool.isExcel(file)) {
        ChoiTool.showToast('Excelファイル（.xlsx, .xls）を選択してください', 'error');
        return;
      }
      fileName = file.name;
      loadExcel(file);
    }
  });

  async function loadExcel(file) {
    try {
      var buf = await ChoiTool.readFileAs(file, 'arrayBuffer');
      workbook = XLSX.read(buf, { type: 'array' });
      activeSheet = 0;
      dropZone.style.display = 'none';
      settings.style.display = '';
      downloadBtn.style.display = 'none';
      renderSheetTabs();
      renderSheet();
      ChoiTool.showToast(fileName + ' を読み込みました（' + workbook.SheetNames.length + 'シート）', 'success');
    } catch (e) {
      ChoiTool.showToast('読み込みに失敗しました: ' + e.message, 'error');
    }
  }

  // --- シートタブ ---
  function renderSheetTabs() {
    sheetTabsEl.innerHTML = '';
    workbook.SheetNames.forEach(function (name, i) {
      var btn = document.createElement('button');
      btn.className = 'ecc-sheet-tab' + (i === activeSheet ? ' active' : '');
      btn.textContent = name;
      btn.addEventListener('click', function () {
        activeSheet = i;
        renderSheetTabs();
        renderSheet();
      });
      sheetTabsEl.appendChild(btn);
    });
  }

  // --- シート描画 ---
  function renderSheet() {
    var sheetName = workbook.SheetNames[activeSheet];
    var sheet = workbook.Sheets[sheetName];
    var data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });

    var fwCount = 0;
    var hkCount = 0;
    var issueRows = [];

    for (var r = 0; r < data.length; r++) {
      for (var c = 0; c < data[r].length; c++) {
        var val = String(data[r][c]);
        if (val === '') continue;
        var issues = analyzeCell(val);
        if (issues) {
          var fwInCell = 0;
          var hkInCell = 0;
          for (var k = 0; k < issues.length; k++) {
            if (issues[k].type === 'fw') fwInCell++;
            else if (issues[k].type === 'hk') hkInCell++;
          }
          fwCount += fwInCell;
          hkCount += hkInCell;
          issueRows.push({
            addr: cellAddress(r, c),
            value: val,
            issues: issues,
            fwCount: fwInCell,
            hkCount: hkInCell
          });
        }
      }
    }

    // サマリー
    summaryEl.innerHTML = '';
    var totalItem = document.createElement('span');
    totalItem.className = 'ecc-summary-item';
    totalItem.textContent = '問題セル: ' + issueRows.length + '件';
    summaryEl.appendChild(totalItem);

    if (fwCount > 0) {
      var fwItem = document.createElement('span');
      fwItem.className = 'ecc-summary-item ecc-summary-full';
      fwItem.textContent = '全角英数字・記号: ' + fwCount + '文字';
      summaryEl.appendChild(fwItem);
    }
    if (hkCount > 0) {
      var hkItem = document.createElement('span');
      hkItem.className = 'ecc-summary-item ecc-summary-half-kana';
      hkItem.textContent = '半角カタカナ: ' + hkCount + '文字';
      summaryEl.appendChild(hkItem);
    }

    // テーブル
    tableWrap.innerHTML = '';
    if (issueRows.length === 0) {
      tableWrap.innerHTML = '<div class="ecc-no-issues"><div class="ecc-no-issues-icon">&#10003;</div>問題のあるセルはありません</div>';
      return;
    }

    var table = document.createElement('table');
    table.className = 'ecc-table';
    var thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>セル</th><th>内容（ハイライト表示）</th><th>全角</th><th>半角ｶﾅ</th></tr>';
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    issueRows.forEach(function (row) {
      var tr = document.createElement('tr');
      var tdAddr = document.createElement('td');
      tdAddr.className = 'ecc-cell-addr';
      tdAddr.textContent = row.addr;

      var tdContent = document.createElement('td');
      tdContent.innerHTML = highlightText(row.value, row.issues);

      var tdFw = document.createElement('td');
      tdFw.className = 'ecc-cell-addr';
      tdFw.textContent = row.fwCount || '-';
      if (row.fwCount > 0) tdFw.style.color = '#e65100';

      var tdHk = document.createElement('td');
      tdHk.className = 'ecc-cell-addr';
      tdHk.textContent = row.hkCount || '-';
      if (row.hkCount > 0) tdHk.style.color = '#1565c0';

      tr.appendChild(tdAddr);
      tr.appendChild(tdContent);
      tr.appendChild(tdFw);
      tr.appendChild(tdHk);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    tableWrap.appendChild(table);
  }

  // --- 変換関数 ---
  function convertFullwidthAlphaNum(str) {
    return str.replace(/[\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
    });
  }

  function convertHalfwidthKatakana(str) {
    var result = '';
    for (var i = 0; i < str.length; i++) {
      var code = str.charCodeAt(i);
      if (code >= 0xFF65 && code <= 0xFF9F) {
        var zen = HANKAKU_KANA_MAP[str[i]];
        if (zen) {
          // 次の文字が濁点か半濁点かチェック
          if (i + 1 < str.length) {
            var nextCode = str.charCodeAt(i + 1);
            if (nextCode === 0xFF9E && DAKUTEN_MAP[zen]) {
              result += DAKUTEN_MAP[zen];
              i++;
              continue;
            }
            if (nextCode === 0xFF9F && HANDAKUTEN_MAP[zen]) {
              result += HANDAKUTEN_MAP[zen];
              i++;
              continue;
            }
          }
          result += zen;
        } else {
          result += str[i];
        }
      } else {
        result += str[i];
      }
    }
    return result;
  }

  function convertFullwidthSpace(str) {
    return str.replace(/\u3000/g, ' ');
  }

  function convertFullwidthSymbol(str) {
    return str.replace(/[\uFF01-\uFF0F\uFF1A-\uFF20\uFF3B-\uFF40\uFF5B-\uFF5E]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
    });
  }

  function convertValue(val) {
    if (typeof val !== 'string') return val;
    var result = val;
    if (optAlpha.checked) result = convertFullwidthAlphaNum(result);
    if (optKana.checked) result = convertHalfwidthKatakana(result);
    if (optSpace.checked) result = convertFullwidthSpace(result);
    if (optSymbol.checked) result = convertFullwidthSymbol(result);
    return result;
  }

  // --- 変換実行 ---
  convertBtn.addEventListener('click', function () {
    if (!workbook) return;

    var anyChecked = optAlpha.checked || optKana.checked || optSpace.checked || optSymbol.checked;
    if (!anyChecked) {
      ChoiTool.showToast('変換オプションを1つ以上選択してください', 'error');
      return;
    }

    var totalConverted = 0;

    workbook.SheetNames.forEach(function (sheetName) {
      var sheet = workbook.Sheets[sheetName];
      var range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

      for (var r = range.s.r; r <= range.e.r; r++) {
        for (var c = range.s.c; c <= range.e.c; c++) {
          var addr = XLSX.utils.encode_cell({ r: r, c: c });
          var cell = sheet[addr];
          if (!cell || cell.t !== 's') continue;

          var original = cell.v;
          var converted = convertValue(original);
          if (converted !== original) {
            cell.v = converted;
            if (cell.w) cell.w = converted;
            if (cell.h) cell.h = converted;
            totalConverted++;
          }
        }
      }
    });

    renderSheet();
    downloadBtn.style.display = '';

    if (totalConverted > 0) {
      ChoiTool.showToast(totalConverted + '個のセルを変換しました', 'success');
    } else {
      ChoiTool.showToast('変換対象のセルはありませんでした', 'info');
    }
  });

  // --- ダウンロード ---
  downloadBtn.addEventListener('click', function () {
    if (!workbook) return;
    var wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    var blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    var outName = fileName.replace(/\.[^.]+$/, '') + '_converted.xlsx';
    ChoiTool.downloadBlob(blob, outName);
    ChoiTool.showToast('ダウンロードしました', 'success');
  });

  // --- リセット ---
  resetBtn.addEventListener('click', function () {
    workbook = null;
    fileName = '';
    activeSheet = 0;
    settings.style.display = 'none';
    dropZone.style.display = '';
    sheetTabsEl.innerHTML = '';
    summaryEl.innerHTML = '';
    tableWrap.innerHTML = '';
    downloadBtn.style.display = 'none';
  });
})();
