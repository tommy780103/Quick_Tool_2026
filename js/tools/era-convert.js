/* ============================================
   西暦和暦変換
   ============================================ */
(function () {
  'use strict';

  // --- DOM要素 ---
  var gYear   = document.getElementById('ec-g-year');
  var gMonth  = document.getElementById('ec-g-month');
  var gDay    = document.getElementById('ec-g-day');
  var gToday  = document.getElementById('ec-g-today');
  var gResult = document.getElementById('ec-g-result');
  var gCopy   = document.getElementById('ec-g-copy');

  var wEra    = document.getElementById('ec-w-era');
  var wYear   = document.getElementById('ec-w-year');
  var wMonth  = document.getElementById('ec-w-month');
  var wDay    = document.getElementById('ec-w-day');
  var wResult = document.getElementById('ec-w-result');
  var wCopy   = document.getElementById('ec-w-copy');

  var tableEl = document.getElementById('ec-table');

  if (!gResult || !wResult || !wEra) return;

  // --- 元号データ（新しい順） ---
  // start: 改元日（グレゴリオ暦）。明治は元年=1868年を全期間とする慣例に従う。
  var ERAS = [
    { name: '令和', romaji: 'Reiwa',  startYear: 2019, startMonth: 5,  startDay: 1,  endYear: null },
    { name: '平成', romaji: 'Heisei', startYear: 1989, startMonth: 1,  startDay: 8,  endYear: 2019 },
    { name: '昭和', romaji: 'Showa',  startYear: 1926, startMonth: 12, startDay: 25, endYear: 1989 },
    { name: '大正', romaji: 'Taisho', startYear: 1912, startMonth: 7,  startDay: 30, endYear: 1926 },
    { name: '明治', romaji: 'Meiji',  startYear: 1868, startMonth: 1,  startDay: 1,  endYear: 1912 }
  ];

  /** 年月日を比較用の数値キーに変換 */
  function key(y, m, d) {
    return y * 10000 + m * 100 + d;
  }

  /** 元号の開始キー */
  function startKey(era) {
    return key(era.startYear, era.startMonth, era.startDay);
  }

  /** 元号の終了キー（次の元号の改元前日の実日付）。ongoingなら null */
  function endKey(era, idx) {
    if (era.endYear === null) return null;
    // 直後（=配列上で1つ新しい）の元号の改元日の「前日」を実日付で求める
    var newer = ERAS[idx - 1];
    if (!newer) return null;
    var dt = new Date(newer.startYear, newer.startMonth - 1, newer.startDay);
    dt.setDate(dt.getDate() - 1);
    return key(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
  }

  /** 元号の最終和暦年（閉じた元号のみ。令和は null） */
  function maxWaYear(era) {
    if (era.endYear === null) return null;
    return era.endYear - era.startYear + 1;
  }

  /** 和暦年の表示（1年は「元年」） */
  function waYearLabel(n) {
    return n === 1 ? '元年' : n + '年';
  }

  // --- 西暦 → 和暦 ---

  /** 完全な日付から元号を特定。範囲外は null */
  function findEraByDate(y, m, d) {
    var k = key(y, m, d);
    for (var i = 0; i < ERAS.length; i++) {
      if (k >= startKey(ERAS[i])) return ERAS[i];
    }
    return null; // 明治改元より前
  }

  /** 指定西暦年に重なる元号を、その年内の期間情報付きで返す */
  function findErasByYear(y) {
    var out = [];
    for (var i = 0; i < ERAS.length; i++) {
      var era = ERAS[i];
      var ek = endKey(era, i); // null = ongoing
      var overlapStart = era.startYear <= y;
      var overlapEnd = (ek === null) || (Math.floor(ek / 10000) >= y);
      if (overlapStart && overlapEnd) {
        var waYear = y - era.startYear + 1;
        // この年内での適用開始（その年に改元があれば改元日、なければ年初）
        var from = (era.startYear === y)
          ? era.startMonth + '月' + era.startDay + '日〜'
          : '通年';
        // この年内での適用終了（その年が最終年なら改元前日まで）
        var to = '';
        if (ek !== null && Math.floor(ek / 10000) === y) {
          var em = Math.floor(ek / 100) % 100;
          var ed = ek % 100;
          to = '〜' + em + '月' + ed + '日';
        }
        out.push({ era: era, waYear: waYear, from: from, to: to });
      }
    }
    return out.reverse(); // 古い元号→新しい元号の順で表示
  }

  function convertGregorian() {
    var y = parseInt(gYear.value, 10);
    var m = gMonth.value === '' ? null : parseInt(gMonth.value, 10);
    var d = gDay.value === '' ? null : parseInt(gDay.value, 10);

    if (isNaN(y)) {
      setResult(gResult, gCopy, null, '西暦の年を入力してください');
      return;
    }
    if (y < 1868) {
      setResult(gResult, gCopy, null, '明治より前（1868年以降に対応）');
      return;
    }

    // 月日が両方そろっていれば日付で厳密に特定
    if (m !== null && d !== null) {
      if (m < 1 || m > 12 || d < 1 || d > 31) {
        setResult(gResult, gCopy, null, '月日が正しくありません');
        return;
      }
      var era = findEraByDate(y, m, d);
      if (!era) {
        setResult(gResult, gCopy, null, '明治より前（1868年以降に対応）');
        return;
      }
      var wy = y - era.startYear + 1;
      var main = era.name + waYearLabel(wy) + ' ' + m + '月' + d + '日';
      var sub = era.romaji + ' ' + wy + ' (' + era.name + ')';
      renderResult(gResult, main, sub);
      enableCopy(gCopy, era.name + waYearLabel(wy) + m + '月' + d + '日');
      return;
    }

    // 年のみ（または月のみ）→ 年で重なる元号を表示
    var list = findErasByYear(y);
    if (list.length === 0) {
      setResult(gResult, gCopy, null, '対応範囲外です');
      return;
    }

    if (list.length === 1) {
      var e = list[0].era;
      var n = list[0].waYear;
      renderResult(gResult, e.name + waYearLabel(n), e.romaji + ' ' + n + ' (' + e.name + ')');
      enableCopy(gCopy, e.name + waYearLabel(n));
    } else {
      // 改元年：複数表示
      var html = '<div class="ec-result-multi">';
      var copyParts = [];
      for (var i = 0; i < list.length; i++) {
        var it = list[i];
        var range = [it.from === '通年' ? '' : it.from, it.to].filter(Boolean).join(' ');
        html += '<div class="ec-result-multi-item">' +
          '<span class="ec-result-main">' + it.era.name + waYearLabel(it.waYear) + '</span>' +
          (range ? '<span class="ec-result-range">' + ChoiTool.escapeHTML(range) + '</span>' : '') +
          '</div>';
        copyParts.push(it.era.name + waYearLabel(it.waYear));
      }
      html += '<div class="ec-result-note">' + y + '年は改元の年です</div></div>';
      gResult.innerHTML = html;
      enableCopy(gCopy, copyParts.join(' / '));
    }
  }

  // --- 和暦 → 西暦 ---

  function convertWareki() {
    var idx = parseInt(wEra.value, 10);
    var era = ERAS[idx];
    var wy = parseInt(wYear.value, 10);
    var m = wMonth.value === '' ? null : parseInt(wMonth.value, 10);
    var d = wDay.value === '' ? null : parseInt(wDay.value, 10);

    if (!era || isNaN(wy) || wy < 1) {
      setResult(wResult, wCopy, null, '元号と年を入力してください');
      return;
    }

    var gy = era.startYear + wy - 1;
    var mainText = gy + '年';
    var dateSuffix = '';
    if (m !== null && !isNaN(m) && m >= 1 && m <= 12) {
      dateSuffix += m + '月';
      if (d !== null && !isNaN(d) && d >= 1 && d <= 31) {
        dateSuffix += d + '日';
      }
    }

    var sub = era.name + waYearLabel(wy) + (dateSuffix ? ' ' + dateSuffix : '');
    renderResult(wResult, mainText + (dateSuffix ? ' ' + dateSuffix : ''), sub);
    enableCopy(wCopy, gy + '年' + dateSuffix);

    // 範囲チェック（注記）
    var max = maxWaYear(era);
    if (max !== null && wy > max) {
      var note = document.createElement('div');
      note.className = 'ec-result-note ec-result-warn';
      note.textContent = era.name + 'は' + waYearLabel(max) + '（' + era.endYear + '年）までです';
      wResult.appendChild(note);
    }
  }

  // --- 結果描画ヘルパー ---

  function renderResult(container, main, sub) {
    container.innerHTML = '';
    var mainEl = document.createElement('div');
    mainEl.className = 'ec-result-main';
    mainEl.textContent = main;
    container.appendChild(mainEl);
    if (sub) {
      var subEl = document.createElement('div');
      subEl.className = 'ec-result-sub';
      subEl.textContent = sub;
      container.appendChild(subEl);
    }
  }

  function setResult(container, copyBtn, value, placeholder) {
    container.innerHTML = '<span class="ec-result-placeholder">' +
      ChoiTool.escapeHTML(placeholder) + '</span>';
    if (copyBtn) {
      copyBtn.style.display = 'none';
      copyBtn.dataset.copy = '';
    }
  }

  function enableCopy(copyBtn, text) {
    if (!copyBtn) return;
    copyBtn.style.display = '';
    copyBtn.dataset.copy = text;
  }

  function copyText(text) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(function () {
      ChoiTool.showToast('コピーしました', 'success');
    }).catch(function () {
      ChoiTool.showToast('コピーに失敗しました', 'error');
    });
  }

  // --- 早見表描画 ---

  function renderTable() {
    if (!tableEl) return;
    var html = '<thead><tr>' +
      '<th>元号</th><th>ローマ字</th><th>期間（西暦）</th><th>元年</th><th>最終年</th>' +
      '</tr></thead><tbody>';
    for (var i = 0; i < ERAS.length; i++) {
      var e = ERAS[i];
      var startStr = e.startYear + '.' + e.startMonth + '.' + e.startDay;
      var endStr, lastWa;
      if (e.endYear === null) {
        endStr = '現在';
        lastWa = '—';
      } else {
        endStr = e.endYear + '年';
        lastWa = e.name + maxWaYear(e) + '年';
      }
      html += '<tr>' +
        '<td class="ec-td-era">' + e.name + '</td>' +
        '<td>' + e.romaji + '</td>' +
        '<td>' + startStr + ' 〜 ' + endStr + '</td>' +
        '<td>' + e.name + '元年 = ' + e.startYear + '年</td>' +
        '<td>' + lastWa + '</td>' +
        '</tr>';
    }
    html += '</tbody>';
    tableEl.innerHTML = html;
  }

  // --- 元号セレクト初期化 ---

  function initEraSelect() {
    var html = '';
    for (var i = 0; i < ERAS.length; i++) {
      html += '<option value="' + i + '">' + ERAS[i].name + '（' + ERAS[i].romaji + '）</option>';
    }
    wEra.innerHTML = html;
  }

  // --- 今日の日付をセット ---

  function setToday() {
    var now = new Date();
    gYear.value = now.getFullYear();
    gMonth.value = now.getMonth() + 1;
    gDay.value = now.getDate();
    convertGregorian();
  }

  // --- イベントバインド ---

  [gYear, gMonth, gDay].forEach(function (el) {
    if (el) el.addEventListener('input', convertGregorian);
  });
  [wYear, wMonth, wDay].forEach(function (el) {
    if (el) el.addEventListener('input', convertWareki);
  });
  if (wEra) wEra.addEventListener('change', convertWareki);

  if (gToday) gToday.addEventListener('click', setToday);
  if (gCopy) gCopy.addEventListener('click', function () { copyText(gCopy.dataset.copy); });
  if (wCopy) wCopy.addEventListener('click', function () { copyText(wCopy.dataset.copy); });

  // --- 初期化 ---
  initEraSelect();
  renderTable();
})();
