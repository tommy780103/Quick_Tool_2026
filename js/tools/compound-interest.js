/* ============================================
   複利計算
   ============================================ */
(function () {
  'use strict';

  // --- DOM要素 ---
  var elPrincipal    = document.getElementById('ci-principal');
  var elContribution = document.getElementById('ci-contribution');
  var elRate         = document.getElementById('ci-rate');
  var elYears        = document.getElementById('ci-years');
  var elFrequency    = document.getElementById('ci-frequency');
  var timingRadios   = document.querySelectorAll('input[name="ci-timing"]');

  var elTotal     = document.getElementById('ci-total');
  var elInvested  = document.getElementById('ci-invested');
  var elInterest  = document.getElementById('ci-interest');
  var barPrincipal = document.getElementById('ci-bar-principal');
  var barInterest  = document.getElementById('ci-bar-interest');
  var tableEl     = document.getElementById('ci-table');

  if (!elPrincipal || !elTotal || !tableEl) return;

  // --- ユーティリティ ---

  /** 数値を「¥1,234,567」形式に（四捨五入） */
  function yen(n) {
    if (!isFinite(n)) return '--';
    return '¥' + Math.round(n).toLocaleString('en-US');
  }

  /** 入力値を数値で取得（空・不正は fallback） */
  function num(el, fallback) {
    var v = parseFloat(el.value);
    return isNaN(v) ? fallback : v;
  }

  function getTiming() {
    for (var i = 0; i < timingRadios.length; i++) {
      if (timingRadios[i].checked) return timingRadios[i].value;
    }
    return 'end';
  }

  /**
   * k期後の残高を返す
   * @param {number} P 元本
   * @param {number} PMT 1期あたり積立額
   * @param {number} i 1期あたり利率（小数）
   * @param {number} k 経過期数
   * @param {boolean} begin 期初積立なら true
   */
  function balanceAt(P, PMT, i, k, begin) {
    var fvP, fvA;
    if (i === 0) {
      fvP = P;
      fvA = PMT * k;
    } else {
      var growth = Math.pow(1 + i, k);
      fvP = P * growth;
      fvA = PMT * (growth - 1) / i;
      if (begin) fvA *= (1 + i);
    }
    return fvP + fvA;
  }

  // --- 計算と描画 ---

  function calculate() {
    var P    = Math.max(0, num(elPrincipal, 0));
    var PMT  = Math.max(0, num(elContribution, 0));
    var rate = Math.max(0, num(elRate, 0));
    var years = Math.max(1, Math.floor(num(elYears, 1)));
    var n    = parseInt(elFrequency.value, 10) || 1;
    var begin = getTiming() === 'begin';

    var i = (rate / 100) / n;       // 1期あたり利率
    var totalPeriods = n * years;   // 総期数

    var total    = balanceAt(P, PMT, i, totalPeriods, begin);
    var invested = P + PMT * totalPeriods;
    var interest = total - invested;

    // サマリー
    elTotal.textContent    = yen(total);
    elInvested.textContent = yen(invested);
    elInterest.textContent = yen(interest);

    // 内訳バー
    if (total > 0) {
      var pPct = (invested / total) * 100;
      barPrincipal.style.width = pPct + '%';
      barInterest.style.width = (100 - pPct) + '%';
    } else {
      barPrincipal.style.width = '0%';
      barInterest.style.width = '0%';
    }

    // 年次推移テーブル
    renderTable(P, PMT, i, n, years, begin);
  }

  function renderTable(P, PMT, i, n, years, begin) {
    var html = '<thead><tr>' +
      '<th>経過年</th><th>投資元本累計</th><th>残高</th><th>運用益</th>' +
      '</tr></thead><tbody>';

    for (var y = 1; y <= years; y++) {
      var k = n * y;
      var bal = balanceAt(P, PMT, i, k, begin);
      var inv = P + PMT * k;
      var gain = bal - inv;
      html += '<tr>' +
        '<td class="ci-td-year">' + y + '年</td>' +
        '<td>' + yen(inv) + '</td>' +
        '<td class="ci-td-balance">' + yen(bal) + '</td>' +
        '<td class="ci-td-gain">' + yen(gain) + '</td>' +
        '</tr>';
    }
    html += '</tbody>';
    tableEl.innerHTML = html;
  }

  // --- イベントバインド ---

  [elPrincipal, elContribution, elRate, elYears].forEach(function (el) {
    if (el) el.addEventListener('input', calculate);
  });
  if (elFrequency) elFrequency.addEventListener('change', calculate);
  timingRadios.forEach(function (r) { r.addEventListener('change', calculate); });

  // --- 初期計算 ---
  calculate();
})();
