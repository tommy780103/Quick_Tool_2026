/* ============================================
   タイマー（カウントダウン / ストップウォッチ / ポモドーロ / 発表）
   ============================================ */
(function () {
  'use strict';

  var panel = document.getElementById('tool-timer');
  if (!panel) return;

  // ---------- 共通ユーティリティ ----------
  function $(id) { return document.getElementById(id); }
  function now() { return Date.now(); }
  function pad(n, len) {
    n = String(Math.floor(n));
    while (n.length < len) n = '0' + n;
    return n;
  }

  /** ミリ秒 → "M:SS" / "H:MM:SS"（切り捨て） */
  function fmtClock(ms) {
    if (ms < 0) ms = 0;
    var t = Math.floor(ms / 1000);
    var h = Math.floor(t / 3600);
    var m = Math.floor((t % 3600) / 60);
    var s = t % 60;
    return h > 0 ? h + ':' + pad(m, 2) + ':' + pad(s, 2) : pad(m, 2) + ':' + pad(s, 2);
  }

  /** ミリ秒 → "M:SS"（切り上げ。カウントダウン表示用） */
  function fmtClockCeil(ms) {
    if (ms < 0) ms = 0;
    return fmtClock(Math.ceil(ms / 1000) * 1000);
  }

  /** ミリ秒 → "MM:SS.cc" / "H:MM:SS.cc"（ストップウォッチ用） */
  function fmtSW(ms) {
    if (ms < 0) ms = 0;
    var t = Math.floor(ms / 1000);
    var h = Math.floor(t / 3600);
    var m = Math.floor((t % 3600) / 60);
    var s = t % 60;
    var cs = Math.floor((ms % 1000) / 10);
    var head = h > 0 ? h + ':' + pad(m, 2) : pad(m, 2);
    return head + ':' + pad(s, 2) + '.' + pad(cs, 2);
  }

  // ---------- 音（Web Audio で生成。音声ファイル不要） ----------
  var audioCtx = null;
  function ensureAudio() {
    if (audioCtx) {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return;
    }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    } catch (e) { audioCtx = null; }
  }
  /**
   * ビープ音を count 回鳴らす
   * @param {number} count
   * @param {object} opts { freq, duration, gap }
   */
  function beep(count, opts) {
    if (!soundEl.checked || !audioCtx) return;
    opts = opts || {};
    var freq = opts.freq || 880;
    var duration = opts.duration || 0.18;
    var gap = opts.gap || 0.24;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    for (var i = 0; i < count; i++) {
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      var t = audioCtx.currentTime + i * gap;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.4, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.start(t);
      osc.stop(t + duration + 0.02);
    }
  }

  // ---------- ブラウザ通知 ----------
  function notify(title, body) {
    if (!notifyEl.checked) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try { new Notification(title, { body: body }); } catch (e) {}
  }

  // ---------- 画面スリープ防止（Wake Lock。対応ブラウザのみ） ----------
  var wakeLock = null;
  function requestWakeLock() {
    try {
      if ('wakeLock' in navigator && !wakeLock) {
        navigator.wakeLock.request('screen').then(function (wl) {
          wakeLock = wl;
          wakeLock.addEventListener('release', function () { wakeLock = null; });
        }).catch(function () {});
      }
    } catch (e) {}
  }
  function releaseWakeLock() {
    if (wakeLock) { try { wakeLock.release(); } catch (e) {} wakeLock = null; }
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && anyRunning()) requestWakeLock();
  });

  // ---------- リング（SVG円）制御 ----------
  function setRing(el, progress) {
    // progress: 0〜1（残量 or 進捗）
    var r = parseFloat(el.getAttribute('r'));
    var c = 2 * Math.PI * r;
    if (progress < 0) progress = 0;
    if (progress > 1) progress = 1;
    el.style.strokeDasharray = c;
    el.style.strokeDashoffset = c * (1 - progress);
  }

  // ---------- 共通オプション要素 ----------
  var soundEl = $('tm-sound');
  var notifyEl = $('tm-notify');

  notifyEl.addEventListener('change', function () {
    if (!notifyEl.checked) return;
    if (!('Notification' in window)) {
      ChoiTool.showToast('このブラウザは通知に対応していません', 'error');
      notifyEl.checked = false;
      return;
    }
    if (Notification.permission === 'granted') return;
    if (Notification.permission === 'denied') {
      ChoiTool.showToast('通知がブロックされています。ブラウザ設定で許可してください', 'error');
      notifyEl.checked = false;
      return;
    }
    Notification.requestPermission().then(function (p) {
      if (p !== 'granted') {
        notifyEl.checked = false;
        ChoiTool.showToast('通知が許可されませんでした', 'info');
      }
    });
  });

  // ---------- タブ切り替え ----------
  var tabs = panel.querySelectorAll('.tm-tab');
  var panes = panel.querySelectorAll('.tm-pane');
  var visible = 'countdown';
  for (var ti = 0; ti < tabs.length; ti++) {
    tabs[ti].addEventListener('click', function () {
      visible = this.getAttribute('data-tm-tab');
      for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.toggle('active', tabs[i] === this);
        tabs[i].setAttribute('aria-selected', tabs[i] === this ? 'true' : 'false');
      }
      for (var j = 0; j < panes.length; j++) {
        panes[j].classList.toggle('active', panes[j].getAttribute('data-tm-pane') === visible);
      }
      renderAll();
    });
  }

  // ============================================
  //  ループ管理（setInterval。バックグラウンドでも発火しアラームを検出）
  // ============================================
  var intervalId = null;
  function anyRunning() { return cd.running || sw.running || pm.running || pr.running; }
  function ensureLoop() {
    if (intervalId == null) intervalId = setInterval(tick, 50);
  }
  function stopLoopIfIdle() {
    if (!anyRunning() && intervalId != null) {
      clearInterval(intervalId);
      intervalId = null;
      releaseWakeLock();
    }
  }

  var baseTitle = document.title;
  function updateTitle() {
    var label = '';
    // 表示中タブが動作中なら優先、そうでなければ動作中の他タブ
    var order = [visible, 'countdown', 'stopwatch', 'pomodoro', 'presentation'];
    for (var i = 0; i < order.length && !label; i++) {
      switch (order[i]) {
        case 'countdown': if (cd.running) label = fmtClockCeil(cdRemaining()); break;
        case 'stopwatch': if (sw.running) label = fmtClock(swElapsed()); break;
        case 'pomodoro': if (pm.running) label = pm.phaseShort + ' ' + fmtClockCeil(pmRemaining()); break;
        case 'presentation': if (pr.running) label = '発表 ' + fmtClock(prElapsed()); break;
      }
    }
    document.title = label ? '⏱ ' + label + ' — ' + baseTitle : baseTitle;
  }

  function tick() {
    if (cd.running && cdRemaining() <= 0) finishCd();
    if (pm.running && pmRemaining() <= 0) pmPhaseComplete();
    if (pr.running) prCheckBells();
    renderVisible();
    updateTitle();
    stopLoopIfIdle();
  }

  function renderVisible() {
    if (visible === 'countdown') renderCd();
    else if (visible === 'stopwatch') renderSw();
    else if (visible === 'pomodoro') renderPm();
    else if (visible === 'presentation') renderPr();
  }
  function renderAll() {
    renderCd(); renderSw(); renderPm(); renderPr(); updateTitle();
  }

  // ============================================
  //  1. カウントダウン
  // ============================================
  var cd = { totalMs: 5 * 60000, remainingMs: 5 * 60000, endTs: 0, running: false };
  var cdDisplay = $('cd-display');
  var cdStatus = $('cd-status');
  var cdRing = $('cd-ring');
  var cdH = $('cd-h'), cdM = $('cd-m'), cdS = $('cd-s');
  var cdStartBtn = $('cd-start');
  var cdResetBtn = $('cd-reset');
  var cdWrap = $('cd-wrap');

  function cdRemaining() { return cd.running ? Math.max(0, cd.endTs - now()) : cd.remainingMs; }

  function setCdFromInputs() {
    var h = parseInt(cdH.value, 10) || 0;
    var m = parseInt(cdM.value, 10) || 0;
    var s = parseInt(cdS.value, 10) || 0;
    cd.totalMs = ((h * 3600) + (m * 60) + s) * 1000;
    cd.remainingMs = cd.totalMs;
  }

  function cdSetInputsDisabled(disabled) {
    cdH.disabled = cdM.disabled = cdS.disabled = disabled;
    var btns = $('cd-presets').querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) btns[i].disabled = disabled;
  }

  function renderCd() {
    var rem = cdRemaining();
    cdDisplay.textContent = fmtClockCeil(rem);
    setRing(cdRing, cd.totalMs > 0 ? rem / cd.totalMs : 0);
  }

  function startCd() {
    ensureAudio();
    if (cd.remainingMs <= 0) setCdFromInputs();
    if (cd.totalMs <= 0) { ChoiTool.showToast('時間を設定してください', 'error'); return; }
    if (cd.remainingMs <= 0) cd.remainingMs = cd.totalMs;
    cd.endTs = now() + cd.remainingMs;
    cd.running = true;
    cdStartBtn.textContent = '一時停止';
    cdStatus.textContent = '計測中';
    cdWrap.classList.remove('is-finished');
    cdSetInputsDisabled(true);
    ensureLoop(); requestWakeLock(); renderCd(); updateTitle();
  }
  function pauseCd() {
    cd.remainingMs = Math.max(0, cd.endTs - now());
    cd.running = false;
    cdStartBtn.textContent = '再開';
    cdStatus.textContent = '一時停止中';
    cdSetInputsDisabled(false);
    renderCd(); updateTitle(); stopLoopIfIdle();
  }
  function resetCd() {
    cd.running = false;
    setCdFromInputs();
    cdStartBtn.textContent = 'スタート';
    cdStatus.textContent = '準備完了';
    cdWrap.classList.remove('is-finished');
    cdSetInputsDisabled(false);
    renderCd(); updateTitle(); stopLoopIfIdle();
  }
  function finishCd() {
    cd.running = false;
    cd.remainingMs = 0;
    cdStartBtn.textContent = 'スタート';
    cdStatus.textContent = '終了！';
    cdWrap.classList.add('is-finished');
    cdSetInputsDisabled(false);
    beep(3, { freq: 880 });
    notify('カウントダウン終了', '設定した時間が経過しました');
    renderCd(); updateTitle();
  }

  cdStartBtn.addEventListener('click', function () { cd.running ? pauseCd() : startCd(); });
  cdResetBtn.addEventListener('click', resetCd);

  function onCdInput() {
    if (cd.running) return;
    setCdFromInputs();
    cdWrap.classList.remove('is-finished');
    cdStatus.textContent = '準備完了';
    cdStartBtn.textContent = 'スタート';
    renderCd();
  }
  cdH.addEventListener('input', onCdInput);
  cdM.addEventListener('input', onCdInput);
  cdS.addEventListener('input', onCdInput);

  var cdPresetBtns = $('cd-presets').querySelectorAll('button');
  for (var pi = 0; pi < cdPresetBtns.length; pi++) {
    cdPresetBtns[pi].addEventListener('click', function () {
      if (cd.running) return;
      var min = parseInt(this.getAttribute('data-min'), 10) || 0;
      cdH.value = Math.floor(min / 60);
      cdM.value = min % 60;
      cdS.value = 0;
      onCdInput();
    });
  }

  // ============================================
  //  2. ストップウォッチ
  // ============================================
  var sw = { elapsedMs: 0, startTs: 0, running: false, laps: [] };
  var swDisplay = $('sw-display');
  var swStartBtn = $('sw-start');
  var swLapBtn = $('sw-lap');
  var swResetBtn = $('sw-reset');
  var swLapsEl = $('sw-laps');

  function swElapsed() { return sw.elapsedMs + (sw.running ? now() - sw.startTs : 0); }

  function renderSw() { swDisplay.textContent = fmtSW(swElapsed()); }

  function startSw() {
    ensureAudio();
    sw.startTs = now();
    sw.running = true;
    swStartBtn.textContent = 'ストップ';
    swStartBtn.classList.remove('btn-primary');
    swStartBtn.classList.add('btn-danger');
    swLapBtn.disabled = false;
    ensureLoop(); requestWakeLock(); updateTitle();
  }
  function stopSw() {
    sw.elapsedMs = swElapsed();
    sw.running = false;
    swStartBtn.textContent = '再開';
    swStartBtn.classList.add('btn-primary');
    swStartBtn.classList.remove('btn-danger');
    renderSw(); updateTitle(); stopLoopIfIdle();
  }
  function resetSw() {
    sw.running = false;
    sw.elapsedMs = 0;
    sw.laps = [];
    swStartBtn.textContent = 'スタート';
    swStartBtn.classList.add('btn-primary');
    swStartBtn.classList.remove('btn-danger');
    swLapBtn.disabled = true;
    renderSw(); renderLaps(); updateTitle(); stopLoopIfIdle();
  }
  function lapSw() {
    if (!sw.running) return;
    var total = swElapsed();
    var prev = sw.laps.length ? sw.laps[sw.laps.length - 1].total : 0;
    sw.laps.push({ total: total, split: total - prev });
    renderLaps();
  }
  function renderLaps() {
    if (!sw.laps.length) { swLapsEl.innerHTML = ''; return; }
    var html = '';
    for (var i = sw.laps.length - 1; i >= 0; i--) {
      var lap = sw.laps[i];
      html += '<div class="tm-lap-item">' +
        '<span class="tm-lap-no">ラップ ' + (i + 1) + '</span>' +
        '<span class="tm-lap-split">+' + fmtSW(lap.split) + '</span>' +
        '<span class="tm-lap-total">' + fmtSW(lap.total) + '</span>' +
        '</div>';
    }
    swLapsEl.innerHTML = html;
  }

  swStartBtn.addEventListener('click', function () { sw.running ? stopSw() : startSw(); });
  swLapBtn.addEventListener('click', lapSw);
  swResetBtn.addEventListener('click', resetSw);

  // ============================================
  //  3. ポモドーロ
  // ============================================
  var pm = {
    phase: 'work', phaseShort: '作業', worksDone: 0, totalPomos: 0,
    remainingMs: 25 * 60000, endTs: 0, running: false
  };

  // 局面アイコン（SVG。絵文字は使わない）
  var IC_TOMATO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8c-3.3 0-6 2.4-6 6.2C6 18 8.7 21 12 21s6-3 6-6.8C18 10.4 15.3 8 12 8Z"/><path d="M12 8V5.5M12 8C11 6.4 8.8 6.2 8.8 6.2M12 8c1-1.6 3.2-1.8 3.2-1.8"/></svg>';
  var IC_COFFEE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8Z"/><path d="M16 9h2.2a2.3 2.3 0 0 1 0 4.6H16"/><path d="M8 2.5v2M11.5 2.5v2"/></svg>';
  var IC_LEAF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20c0-8 6-14 16-14 0 10-6 14-16 14Z"/><path d="M4.5 19.5C8 14 12 11.5 16 10.5"/></svg>';
  var pmPhaseEl = $('pm-phase');
  var pmDisplay = $('pm-display');
  var pmCount = $('pm-count');
  var pmRing = $('pm-ring');
  var pmWork = $('pm-work'), pmShort = $('pm-short'), pmLong = $('pm-long'), pmSessions = $('pm-sessions');
  var pmAuto = $('pm-auto');
  var pmStartBtn = $('pm-start');
  var pmSkipBtn = $('pm-skip');
  var pmResetBtn = $('pm-reset');
  var pmWrap = $('pm-wrap');

  var PM_META = {
    work: { label: '作業', icon: IC_TOMATO, cls: 'is-work' },
    short: { label: '休憩', icon: IC_COFFEE, cls: 'is-break' },
    long: { label: '長い休憩', icon: IC_LEAF, cls: 'is-long' }
  };

  function pmPhaseMs(phase) {
    var v;
    if (phase === 'work') v = parseFloat(pmWork.value);
    else if (phase === 'short') v = parseFloat(pmShort.value);
    else v = parseFloat(pmLong.value);
    if (!(v > 0)) v = 1;
    return Math.round(v * 60000);
  }
  function pmRemaining() { return pm.running ? Math.max(0, pm.endTs - now()) : pm.remainingMs; }

  function pmApplyPhase(phase) {
    pm.phase = phase;
    pm.phaseShort = PM_META[phase].label;
    pm.remainingMs = pmPhaseMs(phase);
    pmPhaseEl.innerHTML = PM_META[phase].icon + '<span>' + PM_META[phase].label + '</span>';
    pmPhaseEl.className = 'tm-phase ' + PM_META[phase].cls;
  }

  function renderPm() {
    var rem = pmRemaining();
    var total = pmPhaseMs(pm.phase);
    pmDisplay.textContent = fmtClockCeil(rem);
    setRing(pmRing, total > 0 ? rem / total : 0);
    pmCount.innerHTML = IC_TOMATO + '×' + pm.totalPomos;
    pmRing.classList.remove('is-work', 'is-break', 'is-long');
    pmRing.classList.add(PM_META[pm.phase].cls);
  }

  function startPm() {
    ensureAudio();
    if (pm.remainingMs <= 0) pm.remainingMs = pmPhaseMs(pm.phase);
    pm.endTs = now() + pm.remainingMs;
    pm.running = true;
    pmStartBtn.textContent = '一時停止';
    pmWrap.classList.remove('is-finished');
    ensureLoop(); requestWakeLock(); renderPm(); updateTitle();
  }
  function pausePm() {
    pm.remainingMs = Math.max(0, pm.endTs - now());
    pm.running = false;
    pmStartBtn.textContent = '再開';
    renderPm(); updateTitle(); stopLoopIfIdle();
  }
  function resetPm() {
    pm.running = false;
    pm.worksDone = 0;
    pm.totalPomos = 0;
    pmApplyPhase('work');
    pmStartBtn.textContent = 'スタート';
    pmWrap.classList.remove('is-finished');
    renderPm(); updateTitle(); stopLoopIfIdle();
  }

  /** 現在の局面を完了し、次の局面へ。natural=true なら自然完了（音・カウント） */
  function pmAdvance(natural) {
    var sessions = parseInt(pmSessions.value, 10) || 4;
    var next;
    if (pm.phase === 'work') {
      if (natural) { pm.totalPomos++; pm.worksDone++; }
      if (pm.worksDone >= sessions) { next = 'long'; pm.worksDone = 0; }
      else next = 'short';
    } else {
      next = 'work';
    }
    pmApplyPhase(next);
  }

  function pmPhaseComplete() {
    var wasWork = pm.phase === 'work';
    // 局面終了の通知音
    if (wasWork) { beep(2, { freq: 660 }); notify('作業終了', '休憩しましょう'); }
    else { beep(3, { freq: 880 }); notify('休憩終了', '作業を再開しましょう'); }
    pmAdvance(true);
    if (pmAuto.checked) {
      pm.endTs = now() + pm.remainingMs;
      pm.running = true;
      pmStartBtn.textContent = '一時停止';
    } else {
      pm.running = false;
      pmStartBtn.textContent = 'スタート';
      pmWrap.classList.add('is-finished');
    }
    renderPm(); updateTitle();
  }

  pmStartBtn.addEventListener('click', function () { pm.running ? pausePm() : startPm(); });
  pmSkipBtn.addEventListener('click', function () {
    pmAdvance(false);
    if (pm.running) { pm.endTs = now() + pm.remainingMs; }
    renderPm(); updateTitle();
  });
  pmResetBtn.addEventListener('click', resetPm);

  function onPmSetting() {
    if (!pm.running) { pm.remainingMs = pmPhaseMs(pm.phase); renderPm(); updateTitle(); }
  }
  pmWork.addEventListener('input', onPmSetting);
  pmShort.addEventListener('input', onPmSetting);
  pmLong.addEventListener('input', onPmSetting);
  pmSessions.addEventListener('input', function () {});

  // ============================================
  //  4. 発表タイマー（経過を計測し、1鈴/2鈴/3鈴で合図）
  // ============================================
  var pr = { elapsedMs: 0, startTs: 0, running: false, rung: { b1: false, b2: false, b3: false } };
  var prDisplay = $('pr-display');
  var prRemain = $('pr-remain');
  var prRing = $('pr-ring');
  var prB1 = $('pr-b1'), prB2 = $('pr-b2'), prB3 = $('pr-b3');
  var prDot1 = $('pr-bell1-dot'), prDot2 = $('pr-bell2-dot'), prDot3 = $('pr-bell3-dot');
  var prStartBtn = $('pr-start');
  var prResetBtn = $('pr-reset');
  var prWrap = $('pr-wrap');

  function prElapsed() { return pr.elapsedMs + (pr.running ? now() - pr.startTs : 0); }
  function prBellMs(input) { var v = parseFloat(input.value); return (v > 0 ? v : 0) * 60000; }

  function renderPr() {
    var el = prElapsed();
    var b1 = prBellMs(prB1), b2 = prBellMs(prB2), b3 = prBellMs(prB3);
    prDisplay.textContent = fmtClock(el);

    // 残り（2鈴=本鈴基準）。超過は赤で表示
    if (el <= b2) {
      prRemain.textContent = '残り ' + fmtClock(b2 - el);
      prDisplay.classList.remove('is-over');
    } else {
      prRemain.textContent = '超過 +' + fmtClock(el - b2);
      prDisplay.classList.add('is-over');
    }

    // リングは3鈴（終了）基準で進捗
    setRing(prRing, b3 > 0 ? el / b3 : 0);

    // 色ステージ
    prRing.classList.remove('is-warn', 'is-over');
    if (el >= b2) prRing.classList.add('is-over');
    else if (el >= b1) prRing.classList.add('is-warn');

    // ベル点灯状態
    prDot1.classList.toggle('on', el >= b1 && b1 > 0);
    prDot2.classList.toggle('on', el >= b2 && b2 > 0);
    prDot3.classList.toggle('on', el >= b3 && b3 > 0);
  }

  function prCheckBells() {
    var el = prElapsed();
    var b1 = prBellMs(prB1), b2 = prBellMs(prB2), b3 = prBellMs(prB3);
    if (b1 > 0 && el >= b1 && !pr.rung.b1) { pr.rung.b1 = true; beep(1, { freq: 880 }); notify('1鈴', 'まもなく時間です'); }
    if (b2 > 0 && el >= b2 && !pr.rung.b2) { pr.rung.b2 = true; beep(2, { freq: 880 }); notify('2鈴', '終了時間です'); }
    if (b3 > 0 && el >= b3 && !pr.rung.b3) {
      pr.rung.b3 = true; beep(3, { freq: 988 }); notify('3鈴', '時間超過です');
      prWrap.classList.add('is-finished');
    }
  }

  function startPr() {
    ensureAudio();
    pr.startTs = now();
    pr.running = true;
    prStartBtn.textContent = '一時停止';
    prSetBellsDisabled(true);
    ensureLoop(); requestWakeLock(); renderPr(); updateTitle();
  }
  function pausePr() {
    pr.elapsedMs = prElapsed();
    pr.running = false;
    prStartBtn.textContent = '再開';
    renderPr(); updateTitle(); stopLoopIfIdle();
  }
  function resetPr() {
    pr.running = false;
    pr.elapsedMs = 0;
    pr.rung = { b1: false, b2: false, b3: false };
    prStartBtn.textContent = 'スタート';
    prWrap.classList.remove('is-finished');
    prSetBellsDisabled(false);
    renderPr(); updateTitle(); stopLoopIfIdle();
  }
  function prSetBellsDisabled(disabled) {
    prB1.disabled = prB2.disabled = prB3.disabled = disabled;
  }

  prStartBtn.addEventListener('click', function () { pr.running ? pausePr() : startPr(); });
  prResetBtn.addEventListener('click', resetPr);
  prB1.addEventListener('input', function () { if (!pr.running) renderPr(); });
  prB2.addEventListener('input', function () { if (!pr.running) renderPr(); });
  prB3.addEventListener('input', function () { if (!pr.running) renderPr(); });

  // ============================================
  //  初期化
  // ============================================
  setCdFromInputs();
  pmApplyPhase('work');
  renderAll();
})();
