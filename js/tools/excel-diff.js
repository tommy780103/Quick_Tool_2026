/* ============================================
   Excel 差分比較（セル単位の差分表示）
   ============================================ */
(function () {
  'use strict';

  // --- DOM ---
  var dropBefore = document.getElementById('ed-drop-before');
  var fileBefore = document.getElementById('ed-file-before');
  var dropAfter = document.getElementById('ed-drop-after');
  var fileAfter = document.getElementById('ed-file-after');
  var beforeNameEl = document.getElementById('ed-before-name');
  var afterNameEl = document.getElementById('ed-after-name');
  var sheetTabsEl = document.getElementById('ed-sheet-tabs');
  var legendEl = document.getElementById('ed-legend');
  var statsEl = document.getElementById('ed-stats');
  var tableWrapEl = document.getElementById('ed-table-wrap');
  var resetBtn = document.getElementById('ed-reset');

  // --- State ---
  var wbBefore = null;
  var wbAfter = null;
  var activeSheet = null;
  var sheetNames = [];

  var escapeHTML = ChoiTool.escapeHTML;

  /** 列番号をExcel式のアルファベット列名に変換（0→A, 25→Z, 26→AA ...） */
  function colLetter(col) {
    var letter = '';
    var c = col;
    while (c >= 0) {
      letter = String.fromCharCode(65 + (c % 26)) + letter;
      c = Math.floor(c / 26) - 1;
    }
    return letter;
  }

  // --- ドロップゾーン初期化 ---
  ChoiTool.initDropZone('ed-drop-before', 'ed-file-before', {
    multiple: false,
    onFiles: function (files) {
      var file = files[0];
      if (!ChoiTool.isExcel(file)) {
        ChoiTool.showToast('Excelファイル（.xlsx, .xls）を選択してください', 'error');
        return;
      }
      loadFile(file, 'before');
    }
  });

  ChoiTool.initDropZone('ed-drop-after', 'ed-file-after', {
    multiple: false,
    onFiles: function (files) {
      var file = files[0];
      if (!ChoiTool.isExcel(file)) {
        ChoiTool.showToast('Excelファイル（.xlsx, .xls）を選択してください', 'error');
        return;
      }
      loadFile(file, 'after');
    }
  });

  // --- ファイル読み込み ---
  async function loadFile(file, side) {
    try {
      var buf = await ChoiTool.readFileAs(file, 'arrayBuffer');
      var wb = XLSX.read(buf, { type: 'array' });

      if (side === 'before') {
        wbBefore = wb;
        beforeNameEl.textContent = file.name;
        dropBefore.classList.add('ed-loaded');
        ChoiTool.showToast('変更前: ' + file.name + ' を読み込みました', 'success');
      } else {
        wbAfter = wb;
        afterNameEl.textContent = file.name;
        dropAfter.classList.add('ed-loaded');
        ChoiTool.showToast('変更後: ' + file.name + ' を読み込みました', 'success');
      }

      // 両方読み込まれたら自動比較
      if (wbBefore && wbAfter) {
        runCompare();
      }
    } catch (e) {
      ChoiTool.showToast('読み込みに失敗しました: ' + e.message, 'error');
    }
  }

  // --- 比較実行 ---
  function runCompare() {
    // シート名のユニオンを取得（順番は変更前を優先し、変更後にのみ存在するものを末尾に追加）
    var beforeNames = wbBefore.SheetNames;
    var afterNames = wbAfter.SheetNames;
    var nameSet = {};
    sheetNames = [];

    for (var i = 0; i < beforeNames.length; i++) {
      if (!nameSet[beforeNames[i]]) {
        nameSet[beforeNames[i]] = true;
        sheetNames.push(beforeNames[i]);
      }
    }
    for (var j = 0; j < afterNames.length; j++) {
      if (!nameSet[afterNames[j]]) {
        nameSet[afterNames[j]] = true;
        sheetNames.push(afterNames[j]);
      }
    }

    activeSheet = sheetNames[0] || null;
    var resultArea = document.getElementById('ed-result-area');
    if (resultArea) resultArea.style.display = '';
    renderSheetTabs();
    renderLegend();
    renderActiveSheet();
  }

  // --- シートタブ描画 ---
  function renderSheetTabs() {
    sheetTabsEl.innerHTML = '';
    for (var i = 0; i < sheetNames.length; i++) {
      var name = sheetNames[i];
      var btn = document.createElement('button');
      btn.className = 'ed-sheet-tab' + (name === activeSheet ? ' active' : '');
      btn.textContent = name;

      // 片方にしか存在しないシートにはマーカーを付ける
      var inBefore = wbBefore.SheetNames.indexOf(name) !== -1;
      var inAfter = wbAfter.SheetNames.indexOf(name) !== -1;
      if (!inBefore) {
        btn.classList.add('ed-tab-added');
        btn.title = '変更後にのみ存在';
      } else if (!inAfter) {
        btn.classList.add('ed-tab-deleted');
        btn.title = '変更前にのみ存在';
      }

      (function (sheetName) {
        btn.addEventListener('click', function () {
          activeSheet = sheetName;
          renderSheetTabs();
          renderActiveSheet();
        });
      })(name);

      sheetTabsEl.appendChild(btn);
    }
  }

  // --- 凡例描画 ---
  function renderLegend() {
    legendEl.innerHTML =
      '<span class="ed-legend-item"><span class="ed-legend-color" style="background:#dff6dd;"></span> 追加行</span>' +
      '<span class="ed-legend-item"><span class="ed-legend-color" style="background:#fde7e9;"></span> 削除行</span>' +
      '<span class="ed-legend-item"><span class="ed-legend-color" style="background:#fff8e1;"></span> 変更セル</span>';
  }

  // --- シートデータ取得 ---
  function getSheetData(wb, sheetName) {
    var idx = wb.SheetNames.indexOf(sheetName);
    if (idx === -1) return [];
    var sheet = wb.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  }

  // --- アクティブシートの比較結果を描画 ---
  function renderActiveSheet() {
    if (!activeSheet) return;

    var beforeData = getSheetData(wbBefore, activeSheet);
    var afterData = getSheetData(wbAfter, activeSheet);

    var inBefore = wbBefore.SheetNames.indexOf(activeSheet) !== -1;
    var inAfter = wbAfter.SheetNames.indexOf(activeSheet) !== -1;

    var maxRows = Math.max(beforeData.length, afterData.length);

    // 各行の最大列数を求める
    var maxCols = 0;
    var r, c;
    for (r = 0; r < beforeData.length; r++) {
      if (beforeData[r].length > maxCols) maxCols = beforeData[r].length;
    }
    for (r = 0; r < afterData.length; r++) {
      if (afterData[r].length > maxCols) maxCols = afterData[r].length;
    }

    // データがない場合
    if (maxRows === 0 || maxCols === 0) {
      statsEl.innerHTML = '<span class="ed-stat-item">データなし</span>';
      tableWrapEl.innerHTML = '<div class="ed-no-data">比較対象のデータがありません</div>';
      return;
    }

    // --- セル単位の比較 ---
    var addedRows = 0;
    var deletedRows = 0;
    var changedCells = 0;

    // cellInfo[r][c] = { type: 'added'|'deleted'|'changed'|'same', oldVal, newVal }
    var cellInfo = [];
    for (r = 0; r < maxRows; r++) {
      cellInfo[r] = [];
      var bRow = r < beforeData.length ? beforeData[r] : null;
      var aRow = r < afterData.length ? afterData[r] : null;

      if (!inBefore || bRow === null) {
        // シートが変更前に存在しない、または行が変更前にない → 追加行
        addedRows++;
        for (c = 0; c < maxCols; c++) {
          var aVal = (aRow && c < aRow.length) ? String(aRow[c]) : '';
          cellInfo[r][c] = { type: 'added', oldVal: '', newVal: aVal };
        }
      } else if (!inAfter || aRow === null) {
        // シートが変更後に存在しない、または行が変更後にない → 削除行
        deletedRows++;
        for (c = 0; c < maxCols; c++) {
          var bVal = (bRow && c < bRow.length) ? String(bRow[c]) : '';
          cellInfo[r][c] = { type: 'deleted', oldVal: bVal, newVal: '' };
        }
      } else {
        // 両方に存在する行 → セル単位で比較
        var rowHasChange = false;
        for (c = 0; c < maxCols; c++) {
          var bCellVal = (c < bRow.length) ? String(bRow[c]) : '';
          var aCellVal = (c < aRow.length) ? String(aRow[c]) : '';
          if (bCellVal !== aCellVal) {
            cellInfo[r][c] = { type: 'changed', oldVal: bCellVal, newVal: aCellVal };
            changedCells++;
            rowHasChange = true;
          } else {
            cellInfo[r][c] = { type: 'same', oldVal: bCellVal, newVal: aCellVal };
          }
        }
      }
    }

    // --- 統計表示 ---
    statsEl.innerHTML =
      '<span class="ed-stat-item ed-stat-added">追加 ' + addedRows + ' 行</span>' +
      '<span class="ed-stat-item ed-stat-deleted">削除 ' + deletedRows + ' 行</span>' +
      '<span class="ed-stat-item ed-stat-changed">変更 ' + changedCells + ' セル</span>';

    // --- テーブル生成 ---
    var html = '<table class="ed-table">';

    // ヘッダー行（列レター）
    html += '<thead><tr><th class="ed-row-num"></th>';
    for (c = 0; c < maxCols; c++) {
      html += '<th class="ed-col-header">' + colLetter(c) + '</th>';
    }
    html += '</tr></thead>';

    // データ行
    html += '<tbody>';
    for (r = 0; r < maxRows; r++) {
      var rowType = cellInfo[r][0] ? cellInfo[r][0].type : 'same';
      var isAddedRow = (rowType === 'added');
      var isDeletedRow = (rowType === 'deleted');
      var rowClass = '';
      if (isAddedRow) rowClass = ' class="ed-added"';
      else if (isDeletedRow) rowClass = ' class="ed-deleted"';

      html += '<tr' + rowClass + '>';
      html += '<td class="ed-row-num">' + (r + 1) + '</td>';

      for (c = 0; c < maxCols; c++) {
        var info = cellInfo[r][c];
        if (!info) {
          html += '<td></td>';
          continue;
        }

        var cellClass = '';
        var tooltip = '';
        var displayVal = '';

        if (info.type === 'added') {
          cellClass = ' class="ed-added"';
          displayVal = escapeHTML(info.newVal);
        } else if (info.type === 'deleted') {
          cellClass = ' class="ed-deleted"';
          displayVal = escapeHTML(info.oldVal);
        } else if (info.type === 'changed') {
          cellClass = ' class="ed-changed"';
          tooltip = ' title="旧: ' + ChoiTool.escapeAttr(info.oldVal) + ' → 新: ' + ChoiTool.escapeAttr(info.newVal) + '"';
          displayVal = escapeHTML(info.newVal);
        } else {
          displayVal = escapeHTML(info.newVal);
        }

        html += '<td' + cellClass + tooltip + '>' + displayVal + '</td>';
      }

      html += '</tr>';
    }
    html += '</tbody></table>';

    tableWrapEl.innerHTML = html;
  }

  // --- リセット ---
  resetBtn.addEventListener('click', function () {
    wbBefore = null;
    wbAfter = null;
    activeSheet = null;
    sheetNames = [];

    beforeNameEl.textContent = '';
    afterNameEl.textContent = '';
    dropBefore.classList.remove('ed-loaded');
    dropAfter.classList.remove('ed-loaded');
    sheetTabsEl.innerHTML = '';
    legendEl.innerHTML = '';
    statsEl.innerHTML = '';
    tableWrapEl.innerHTML = '';
    var resultArea = document.getElementById('ed-result-area');
    if (resultArea) resultArea.style.display = 'none';
  });
})();
