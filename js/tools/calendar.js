/* ============================================
   祝日カレンダー
   ============================================ */
(function () {
  'use strict';

  // --- DOM要素 ---
  var prevYearBtn  = document.getElementById('cal-prev-year');
  var prevMonthBtn = document.getElementById('cal-prev-month');
  var titleEl      = document.getElementById('cal-title');
  var nextMonthBtn = document.getElementById('cal-next-month');
  var nextYearBtn  = document.getElementById('cal-next-year');
  var todayBtn     = document.getElementById('cal-today');
  var gridEl       = document.getElementById('cal-grid');
  var holidaysEl   = document.getElementById('cal-holidays');

  if (!gridEl || !titleEl) return;

  // --- 状態 ---
  var now   = new Date();
  var state = { year: now.getFullYear(), month: now.getMonth() + 1 };

  // --- 祝日計算 ---

  /** 春分の日 (2000-2099) */
  function springEquinoxDay(y) {
    return Math.floor(20.8431 + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4));
  }

  /** 秋分の日 (2000-2099) */
  function autumnEquinoxDay(y) {
    return Math.floor(23.2488 + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4));
  }

  /** 第N月曜日の日付を返す */
  function nthMonday(year, month, n) {
    var first = new Date(year, month - 1, 1);
    var dayOfWeek = first.getDay(); // 0=日
    // 最初の月曜日
    var firstMonday = dayOfWeek <= 1 ? (1 - dayOfWeek + 1) : (8 - dayOfWeek + 1);
    return firstMonday + (n - 1) * 7;
  }

  /**
   * 指定した年の祝日マップ { 'M/D': '祝日名' } を返す
   * 振替休日・国民の休日を含む
   */
  function getHolidaysForYear(year) {
    var holidays = {};

    // --- 固定祝日 ---
    holidays['1/1']   = '元日';
    holidays['2/11']  = '建国記念の日';
    holidays['2/23']  = '天皇誕生日';
    holidays['4/29']  = '昭和の日';
    holidays['5/3']   = '憲法記念日';
    holidays['5/4']   = 'みどりの日';
    holidays['5/5']   = 'こどもの日';
    holidays['8/11']  = '山の日';
    holidays['11/3']  = '文化の日';
    holidays['11/23'] = '勤労感謝の日';

    // --- ハッピーマンデー ---
    holidays['1/' + nthMonday(year, 1, 2)]  = '成人の日';
    holidays['7/' + nthMonday(year, 7, 3)]  = '海の日';
    holidays['9/' + nthMonday(year, 9, 3)]  = '敬老の日';
    holidays['10/' + nthMonday(year, 10, 2)] = 'スポーツの日';

    // --- 春分の日・秋分の日 ---
    if (year >= 2000 && year <= 2099) {
      holidays['3/' + springEquinoxDay(year)] = '春分の日';
      holidays['9/' + autumnEquinoxDay(year)] = '秋分の日';
    }

    // --- 振替休日 ---
    // 祝日が日曜日の場合、その後の最も近い平日（祝日でない日）が振替休日
    var keys = Object.keys(holidays);
    for (var i = 0; i < keys.length; i++) {
      var parts = keys[i].split('/');
      var m = parseInt(parts[0], 10);
      var d = parseInt(parts[1], 10);
      var dt = new Date(year, m - 1, d);
      if (dt.getDay() === 0) { // 日曜日
        var subDay = d + 1;
        while (holidays[m + '/' + subDay]) {
          subDay++;
        }
        holidays[m + '/' + subDay] = '振替休日';
      }
    }

    // --- 国民の休日 ---
    // 祝日に挟まれた平日（前日と翌日が両方祝日）
    for (var month = 1; month <= 12; month++) {
      var daysInMonth = new Date(year, month, 0).getDate();
      for (var day = 2; day < daysInMonth; day++) {
        var key = month + '/' + day;
        if (!holidays[key]) {
          var prevKey = month + '/' + (day - 1);
          var nextKey = month + '/' + (day + 1);
          if (holidays[prevKey] && holidays[nextKey]) {
            var check = new Date(year, month - 1, day);
            if (check.getDay() !== 0) { // 日曜でなければ
              holidays[key] = '国民の休日';
            }
          }
        }
      }
    }

    return holidays;
  }

  /**
   * 指定年月の祝日マップ { day: name } を返す
   */
  function getMonthHolidays(year, month) {
    var allHolidays = getHolidaysForYear(year);
    var result = {};
    var prefix = month + '/';
    var keys = Object.keys(allHolidays);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf(prefix) === 0) {
        var day = parseInt(keys[i].substring(prefix.length), 10);
        result[day] = allHolidays[keys[i]];
      }
    }
    return result;
  }

  // --- カレンダー描画 ---

  var WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

  function renderCalendar(year, month) {
    // タイトル更新
    titleEl.textContent = year + '年' + month + '月';

    // グリッドクリア
    gridEl.innerHTML = '';

    // 曜日ヘッダー
    for (var w = 0; w < 7; w++) {
      var headerCell = document.createElement('div');
      headerCell.className = 'cal-weekday-header';
      headerCell.textContent = WEEKDAY_LABELS[w];
      if (w === 0) headerCell.style.color = 'var(--cal-sunday, #dc3545)';
      if (w === 6) headerCell.style.color = 'var(--cal-saturday, #0d6efd)';
      gridEl.appendChild(headerCell);
    }

    // 月の情報
    var firstDate   = new Date(year, month - 1, 1);
    var startDow    = firstDate.getDay();         // 1日の曜日 (0=日)
    var daysInMonth = new Date(year, month, 0).getDate();
    var prevMonthDays = new Date(year, month - 1, 0).getDate();

    // 今日の判定用
    var todayYear  = now.getFullYear();
    var todayMonth = now.getMonth() + 1;
    var todayDate  = now.getDate();

    // 祝日取得
    var monthHolidays = getMonthHolidays(year, month);

    // 前月の穴埋め
    for (var p = startDow - 1; p >= 0; p--) {
      var prevDay = prevMonthDays - p;
      var grayCell = createDayCell(prevDay, -1, null, false);
      gridEl.appendChild(grayCell);
    }

    // 当月の日付
    for (var d = 1; d <= daysInMonth; d++) {
      var dt  = new Date(year, month - 1, d);
      var dow = dt.getDay();
      var isToday = (year === todayYear && month === todayMonth && d === todayDate);
      var holidayName = monthHolidays[d] || null;
      var cell = createDayCell(d, dow, holidayName, isToday);
      gridEl.appendChild(cell);
    }

    // 次月の穴埋め（6行 = 42マス に揃える）
    var totalCells = startDow + daysInMonth;
    var remainder = totalCells % 7;
    if (remainder > 0) {
      var fill = 7 - remainder;
      for (var n = 1; n <= fill; n++) {
        var nextCell = createDayCell(n, -1, null, false);
        gridEl.appendChild(nextCell);
      }
    }

    // 祝日一覧を描画
    renderHolidayList(year, month, monthHolidays);
  }

  /**
   * 日付セルを作成
   * @param {number} day - 日
   * @param {number} dow - 曜日 (0-6)。-1 なら月外（グレー表示）
   * @param {string|null} holidayName - 祝日名
   * @param {boolean} isToday - 今日か
   */
  function createDayCell(day, dow, holidayName, isToday) {
    var cell = document.createElement('div');
    cell.className = 'cal-day';

    if (dow === -1) {
      // 月外
      cell.classList.add('cal-outside');
    } else {
      if (isToday)        cell.classList.add('cal-today');
      if (dow === 0)      cell.classList.add('cal-sunday');
      if (dow === 6)      cell.classList.add('cal-saturday');
      if (holidayName)    cell.classList.add('cal-holiday');
    }

    // 日付番号
    var numEl = document.createElement('span');
    numEl.className = 'cal-day-num';
    numEl.textContent = day;
    cell.appendChild(numEl);

    // 祝日名（小さく表示）
    if (holidayName && dow !== -1) {
      var nameEl = document.createElement('span');
      nameEl.className = 'cal-holiday-name';
      nameEl.textContent = holidayName;
      cell.appendChild(nameEl);
      cell.title = holidayName;
    }

    return cell;
  }

  /**
   * 祝日一覧を描画
   */
  function renderHolidayList(year, month, monthHolidays) {
    if (!holidaysEl) return;
    holidaysEl.innerHTML = '';

    // 日付順にソート
    var days = Object.keys(monthHolidays).map(Number).sort(function (a, b) { return a - b; });

    if (days.length === 0) {
      var emptyEl = document.createElement('p');
      emptyEl.className = 'cal-no-holidays';
      emptyEl.textContent = 'この月に祝日はありません';
      holidaysEl.appendChild(emptyEl);
      return;
    }

    var ul = document.createElement('ul');
    ul.className = 'cal-holiday-list';

    for (var i = 0; i < days.length; i++) {
      var d = days[i];
      var dt = new Date(year, month - 1, d);
      var dowLabel = WEEKDAY_LABELS[dt.getDay()];
      var li = document.createElement('li');
      li.className = 'cal-holiday-item';

      var dateSpan = document.createElement('span');
      dateSpan.className = 'cal-holiday-date';
      dateSpan.textContent = month + '月' + d + '日（' + dowLabel + '）';

      var nameSpan = document.createElement('span');
      nameSpan.className = 'cal-holiday-label';
      nameSpan.textContent = monthHolidays[d];

      li.appendChild(dateSpan);
      li.appendChild(nameSpan);
      ul.appendChild(li);
    }

    holidaysEl.appendChild(ul);
  }

  // --- ナビゲーション ---

  function changeMonth(delta) {
    state.month += delta;
    if (state.month < 1)  { state.month = 12; state.year--; }
    if (state.month > 12) { state.month = 1;  state.year++; }
    renderCalendar(state.year, state.month);
  }

  function changeYear(delta) {
    state.year += delta;
    renderCalendar(state.year, state.month);
  }

  function goToday() {
    var today = new Date();
    state.year  = today.getFullYear();
    state.month = today.getMonth() + 1;
    renderCalendar(state.year, state.month);
  }

  // --- イベントバインド ---

  if (prevYearBtn)  prevYearBtn.addEventListener('click',  function () { changeYear(-1); });
  if (nextYearBtn)  nextYearBtn.addEventListener('click',  function () { changeYear(1); });
  if (prevMonthBtn) prevMonthBtn.addEventListener('click', function () { changeMonth(-1); });
  if (nextMonthBtn) nextMonthBtn.addEventListener('click', function () { changeMonth(1); });
  if (todayBtn)     todayBtn.addEventListener('click',     goToday);

  // キーボードショートカット（カレンダーパネルがアクティブな場合）
  document.addEventListener('keydown', function (e) {
    var panel = document.getElementById('tool-calendar');
    if (!panel || !panel.classList.contains('active')) return;

    if (e.key === 'ArrowLeft' && !e.shiftKey)  { e.preventDefault(); changeMonth(-1); }
    if (e.key === 'ArrowRight' && !e.shiftKey) { e.preventDefault(); changeMonth(1); }
    if (e.key === 'ArrowLeft' && e.shiftKey)   { e.preventDefault(); changeYear(-1); }
    if (e.key === 'ArrowRight' && e.shiftKey)  { e.preventDefault(); changeYear(1); }
    if (e.key === 't' || e.key === 'T')        { e.preventDefault(); goToday(); }
  });

  // --- 初期描画 ---
  renderCalendar(state.year, state.month);

})();
