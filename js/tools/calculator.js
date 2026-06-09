/* ============================================
   電卓（calculator）
   ============================================ */
(function () {
  'use strict';

  var panel = document.getElementById('tool-calculator');
  if (!panel) return;

  // --- DOM要素 ---
  var elExpr    = document.getElementById('calc-expr');
  var elResult  = document.getElementById('calc-result');
  var keypad    = document.getElementById('calc-keypad');
  var historyEl = document.getElementById('calc-history');
  var clearHistBtn = document.getElementById('calc-clear-history');

  // --- 状態 ---
  var current = '0';          // 現在入力中の数値（文字列）
  var previous = null;        // 直前のオペランド（数値）
  var operator = null;        // 保留中の演算子
  var waitingForOperand = false; // 次の数字で新しい数を始めるか
  var justEvaluated = false;  // 直前に「=」を押したか
  var errored = false;        // エラー状態か
  var history = [];           // 計算履歴

  var OP_SYMBOL = { add: '+', sub: '−', mul: '×', div: '÷' };

  // --- ユーティリティ ---

  /** 数値文字列を3桁区切りで整形（小数・末尾ドット・符号を保持） */
  function groupDisplay(str) {
    if (str === 'エラー') return str;
    var neg = str.charAt(0) === '-';
    if (neg) str = str.slice(1);
    var dot = str.indexOf('.');
    var intPart = dot === -1 ? str : str.slice(0, dot);
    var decPart = dot === -1 ? '' : str.slice(dot); // '.' を含む
    intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-' : '') + intPart + decPart;
  }

  /** 計算結果の数値を表示用文字列に（浮動小数の誤差を丸める） */
  function formatResult(n) {
    if (!isFinite(n)) return 'エラー';
    if (n === 0) return '0';
    var abs = Math.abs(n);
    // 桁が極端な場合は指数表記
    if (abs >= 1e15 || abs < 1e-10) {
      return n.toExponential(8).replace(/\.?0+e/, 'e');
    }
    // 有効桁12で丸めて余分な0を除去
    var s = parseFloat(n.toPrecision(12)).toString();
    return s;
  }

  /** 表示を更新 */
  function render() {
    elResult.textContent = groupDisplay(current);
    if (operator !== null && previous !== null && !justEvaluated) {
      elExpr.textContent = groupDisplay(formatResult(previous)) + ' ' + OP_SYMBOL[operator];
    }
  }

  // --- 入力処理 ---

  function inputDigit(d) {
    if (errored) allClear();
    if (justEvaluated) { current = '0'; justEvaluated = false; elExpr.textContent = ''; }
    if (waitingForOperand) {
      current = d;
      waitingForOperand = false;
    } else {
      // 桁数制限（区切り前で15桁まで）
      var digits = current.replace(/[-.]/g, '').length;
      if (digits >= 15) return;
      current = current === '0' ? d : current + d;
    }
    render();
  }

  function inputDecimal() {
    if (errored) allClear();
    if (justEvaluated) { current = '0'; justEvaluated = false; elExpr.textContent = ''; }
    if (waitingForOperand) {
      current = '0.';
      waitingForOperand = false;
    } else if (current.indexOf('.') === -1) {
      current += '.';
    }
    render();
  }

  function compute(a, b, op) {
    switch (op) {
      case 'add': return a + b;
      case 'sub': return a - b;
      case 'mul': return a * b;
      case 'div': return b === 0 ? NaN : a / b;
    }
    return b;
  }

  function setOperator(op) {
    if (errored) return;
    var value = parseFloat(current);
    if (operator !== null && !waitingForOperand) {
      // 連続演算：途中結果を出す
      var result = compute(previous, value, operator);
      if (!isFinite(result)) { showError(); return; }
      previous = result;
      current = formatResult(result);
    } else {
      previous = value;
    }
    operator = op;
    waitingForOperand = true;
    justEvaluated = false;
    elExpr.textContent = groupDisplay(formatResult(previous)) + ' ' + OP_SYMBOL[op];
    elResult.textContent = groupDisplay(current);
  }

  function equals() {
    if (errored || operator === null) return;
    var value = parseFloat(current);
    var result = compute(previous, value, operator);
    var exprText = groupDisplay(formatResult(previous)) + ' ' + OP_SYMBOL[operator] + ' ' +
                   groupDisplay(formatResult(value)) + ' =';
    if (!isFinite(result)) { showError(exprText); return; }
    var resultText = formatResult(result);
    addHistory(exprText, resultText);
    elExpr.textContent = exprText;
    current = resultText;
    operator = null;
    previous = null;
    waitingForOperand = true;
    justEvaluated = true;
    elResult.textContent = groupDisplay(current);
  }

  function percent() {
    if (errored) return;
    var value = parseFloat(current);
    var result;
    if (operator !== null && previous !== null) {
      // 200 + 10% = 200 + 20
      result = previous * value / 100;
    } else {
      result = value / 100;
    }
    current = formatResult(result);
    waitingForOperand = false;
    justEvaluated = false;
    render();
  }

  function toggleSign() {
    if (errored || current === '0') return;
    current = current.charAt(0) === '-' ? current.slice(1) : '-' + current;
    render();
  }

  function backspace() {
    if (errored) { allClear(); return; }
    if (justEvaluated || waitingForOperand) return;
    if (current.length <= 1 || (current.length === 2 && current.charAt(0) === '-')) {
      current = '0';
    } else {
      current = current.slice(0, -1);
    }
    render();
  }

  /** C：入力中の数値のみクリア */
  function clearEntry() {
    if (errored) { allClear(); return; }
    current = '0';
    justEvaluated = false;
    render();
  }

  /** AC：すべてクリア */
  function allClear() {
    current = '0';
    previous = null;
    operator = null;
    waitingForOperand = false;
    justEvaluated = false;
    errored = false;
    elExpr.textContent = '';
    elResult.textContent = '0';
  }

  function showError(exprText) {
    errored = true;
    current = 'エラー';
    operator = null;
    previous = null;
    waitingForOperand = false;
    elExpr.textContent = exprText || '';
    elResult.textContent = 'エラー';
  }

  // --- 履歴 ---

  function addHistory(expr, result) {
    history.unshift({ expr: expr, result: result });
    if (history.length > 20) history.pop();
    renderHistory();
  }

  function renderHistory() {
    if (!historyEl) return;
    if (history.length === 0) {
      historyEl.innerHTML = '<li class="calc-history-empty">計算履歴はここに表示されます</li>';
      return;
    }
    var html = '';
    for (var i = 0; i < history.length; i++) {
      var h = history[i];
      html += '<li class="calc-history-item" data-result="' + h.result + '">' +
        '<span class="calc-history-expr">' + h.expr + '</span>' +
        '<span class="calc-history-result">' + groupDisplay(h.result) + '</span>' +
        '</li>';
    }
    historyEl.innerHTML = html;
  }

  // --- イベント：キーパッド ---

  keypad.addEventListener('click', function (e) {
    var btn = e.target.closest('.calc-key');
    if (!btn) return;
    handleKey(btn.dataset);
    btn.blur();
  });

  function handleKey(ds) {
    if (ds.num !== undefined) { inputDigit(ds.num); return; }
    switch (ds.action) {
      case 'decimal':  inputDecimal(); break;
      case 'operator': setOperator(ds.op); break;
      case 'equals':   equals(); break;
      case 'percent':  percent(); break;
      case 'sign':     toggleSign(); break;
      case 'back':     backspace(); break;
      case 'clear':    clearEntry(); break;
      case 'allclear': allClear(); break;
    }
  }

  // --- イベント：履歴クリック（結果を現在値に） ---

  if (historyEl) {
    historyEl.addEventListener('click', function (e) {
      var item = e.target.closest('.calc-history-item');
      if (!item) return;
      allClear();
      current = item.dataset.result;
      justEvaluated = true;
      elResult.textContent = groupDisplay(current);
    });
  }

  if (clearHistBtn) {
    clearHistBtn.addEventListener('click', function () {
      history = [];
      renderHistory();
    });
  }

  // --- イベント：結果クリックでクリップボードにコピー ---

  function copyText(text) {
    var ok = function () {
      if (window.ChoiTool) ChoiTool.showToast('コピーしました', 'success');
      elResult.classList.add('calc-copied');
      setTimeout(function () { elResult.classList.remove('calc-copied'); }, 600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, function () { fallbackCopy(text, ok); });
    } else {
      fallbackCopy(text, ok);
    }
  }

  function fallbackCopy(text, ok) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      ok();
    } catch (e) {
      if (window.ChoiTool) ChoiTool.showToast('コピーに失敗しました', 'error');
    }
  }

  function copyResult() {
    if (errored || current === 'エラー') return;
    copyText(current); // 3桁区切りを除いた生の数値をコピー
  }

  elResult.addEventListener('click', copyResult);
  elResult.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation(); // documentの「=」処理に伝播させない
      copyResult();
    }
  });

  // --- イベント：キーボード操作 ---

  document.addEventListener('keydown', function (e) {
    // 電卓パネルが表示されている時のみ
    if (!panel.classList.contains('active')) return;
    // 入力欄にフォーカスがある場合は無視
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

    var k = e.key;
    if (k >= '0' && k <= '9') { inputDigit(k); e.preventDefault(); }
    else if (k === '.') { inputDecimal(); e.preventDefault(); }
    else if (k === '+') { setOperator('add'); e.preventDefault(); }
    else if (k === '-') { setOperator('sub'); e.preventDefault(); }
    else if (k === '*') { setOperator('mul'); e.preventDefault(); }
    else if (k === '/') { setOperator('div'); e.preventDefault(); }
    else if (k === '%') { percent(); e.preventDefault(); }
    else if (k === 'Enter' || k === '=') { equals(); e.preventDefault(); }
    else if (k === 'Backspace') { backspace(); e.preventDefault(); }
    else if (k === 'Escape') { allClear(); e.preventDefault(); }
  });

  // --- 初期化 ---
  renderHistory();
})();
