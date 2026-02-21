/* ============================================
   文字数カウント
   ============================================ */
(function () {
  'use strict';

  var textEl = document.getElementById('cc-text');
  var totalEl = document.getElementById('cc-total');
  var noSpaceEl = document.getElementById('cc-no-space');
  var fullwidthEl = document.getElementById('cc-fullwidth');
  var halfwidthEl = document.getElementById('cc-halfwidth');
  var linesEl = document.getElementById('cc-lines');
  var bytesEl = document.getElementById('cc-bytes');
  var wordsEl = document.getElementById('cc-words');
  var paragraphsEl = document.getElementById('cc-paragraphs');
  var visualEl = document.getElementById('cc-visual');
  var visualTitle = document.getElementById('cc-visual-title');
  var visualBody = document.getElementById('cc-visual-body');
  var visualLegend = document.getElementById('cc-visual-legend');
  var closeBtn = document.getElementById('cc-visual-close');
  var statCards = document.querySelectorAll('#cc-stats .stat-card[data-cc-mode]');

  var activeMode = null;

  function isFullwidth(code) {
    return code > 255;
  }

  function countWords(text) {
    if (!text) return 0;
    var count = 0;
    var inAsciiWord = false;

    for (var i = 0; i < text.length; i++) {
      var code = text.charCodeAt(i);

      if (isFullwidth(code)) {
        if (inAsciiWord) {
          inAsciiWord = false;
        }
        count++;
      } else if (/\S/.test(text[i])) {
        if (!inAsciiWord) {
          inAsciiWord = true;
          count++;
        }
      } else {
        inAsciiWord = false;
      }
    }

    return count;
  }

  function countParagraphs(text) {
    if (!text.trim()) return 0;
    var blocks = text.split(/\n\s*\n/);
    var count = 0;
    for (var i = 0; i < blocks.length; i++) {
      if (blocks[i].trim()) count++;
    }
    return count;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function update() {
    var text = textEl.value;

    if (!text) {
      totalEl.textContent = '0';
      noSpaceEl.textContent = '0';
      fullwidthEl.textContent = '0';
      halfwidthEl.textContent = '0';
      linesEl.textContent = '0';
      bytesEl.textContent = '0';
      wordsEl.textContent = '0';
      paragraphsEl.textContent = '0';
      if (activeMode) renderVisual(activeMode);
      return;
    }

    var total = text.length;
    var noSpace = text.replace(/\s/g, '').length;
    var fullwidth = 0;
    var halfwidth = 0;

    for (var i = 0; i < text.length; i++) {
      if (isFullwidth(text.charCodeAt(i))) {
        fullwidth++;
      } else {
        halfwidth++;
      }
    }

    var lines = text.split('\n').length;
    var bytes = new Blob([text]).size;
    var words = countWords(text);
    var paragraphs = countParagraphs(text);

    totalEl.textContent = total.toLocaleString();
    noSpaceEl.textContent = noSpace.toLocaleString();
    fullwidthEl.textContent = fullwidth.toLocaleString();
    halfwidthEl.textContent = halfwidth.toLocaleString();
    linesEl.textContent = lines.toLocaleString();
    bytesEl.textContent = bytes.toLocaleString();
    wordsEl.textContent = words.toLocaleString();
    paragraphsEl.textContent = paragraphs.toLocaleString();

    if (activeMode) renderVisual(activeMode);
  }

  // --- ビジュアライズ ---

  function getUtf8ByteLength(ch) {
    var code = ch.codePointAt(0);
    if (code <= 0x7f) return 1;
    if (code <= 0x7ff) return 2;
    if (code <= 0xffff) return 3;
    return 4;
  }

  /** 単語分割: 全角文字は1文字=1単語、半角英数は連続で1単語 */
  function splitWords(text) {
    var segments = [];
    var i = 0;
    while (i < text.length) {
      var code = text.charCodeAt(i);
      if (isFullwidth(code)) {
        segments.push({ text: text[i], type: 'word' });
        i++;
      } else if (/\S/.test(text[i])) {
        var start = i;
        while (i < text.length && !isFullwidth(text.charCodeAt(i)) && /\S/.test(text[i])) i++;
        segments.push({ text: text.substring(start, i), type: 'word' });
      } else {
        var start2 = i;
        while (i < text.length && /\s/.test(text[i]) && !isFullwidth(text.charCodeAt(i))) i++;
        segments.push({ text: text.substring(start2, i), type: 'space' });
      }
    }
    return segments;
  }

  var VISUALIZERS = {
    'total': {
      title: '文字数（空白含む）',
      legend: [{ label: '全文字', color: '#bbdefb' }],
      render: function (text) {
        var html = '';
        for (var i = 0; i < text.length; i++) {
          if (text[i] === '\n') {
            html += '<span class="cc-hl-newline">\u21B5</span>\n';
          } else {
            html += '<span class="cc-hl-match">' + escapeHtml(text[i]) + '</span>';
          }
        }
        return html;
      }
    },
    'no-space': {
      title: '文字数（空白除く）',
      legend: [
        { label: '空白以外', color: '#bbdefb' },
        { label: '空白・改行', color: '#ffe0b2' },
      ],
      render: function (text) {
        var html = '';
        for (var i = 0; i < text.length; i++) {
          if (text[i] === '\n') {
            html += '<span class="cc-hl-newline">\u21B5</span>\n';
          } else if (/\s/.test(text[i])) {
            html += '<span class="cc-hl-space">' + escapeHtml(text[i]) + '</span>';
          } else {
            html += '<span class="cc-hl-match">' + escapeHtml(text[i]) + '</span>';
          }
        }
        return html;
      }
    },
    'fullwidth': {
      title: '全角文字',
      legend: [
        { label: '全角', color: '#c8e6c9' },
        { label: '半角', color: '#bbdefb' },
      ],
      render: function (text) {
        var html = '';
        for (var i = 0; i < text.length; i++) {
          if (text[i] === '\n') {
            html += '<span class="cc-hl-newline">\u21B5</span>\n';
          } else if (isFullwidth(text.charCodeAt(i))) {
            html += '<span class="cc-hl-fullwidth">' + escapeHtml(text[i]) + '</span>';
          } else {
            html += '<span class="cc-hl-halfwidth" style="opacity:.4">' + escapeHtml(text[i]) + '</span>';
          }
        }
        return html;
      }
    },
    'halfwidth': {
      title: '半角文字',
      legend: [
        { label: '半角', color: '#bbdefb' },
        { label: '全角', color: '#c8e6c9' },
      ],
      render: function (text) {
        var html = '';
        for (var i = 0; i < text.length; i++) {
          if (text[i] === '\n') {
            html += '<span class="cc-hl-newline">\u21B5</span>\n';
          } else if (!isFullwidth(text.charCodeAt(i))) {
            html += '<span class="cc-hl-halfwidth">' + escapeHtml(text[i]) + '</span>';
          } else {
            html += '<span class="cc-hl-fullwidth" style="opacity:.4">' + escapeHtml(text[i]) + '</span>';
          }
        }
        return html;
      }
    },
    'lines': {
      title: '行数',
      legend: [
        { label: '奇数行', color: '#bbdefb' },
        { label: '偶数行', color: '#c8e6c9' },
        { label: '改行', color: '#f8bbd0' },
      ],
      render: function (text) {
        var lines = text.split('\n');
        var html = '';
        for (var i = 0; i < lines.length; i++) {
          var cls = (i % 2 === 0) ? 'cc-hl-word-even' : 'cc-hl-word-odd';
          var num = '<span style="color:var(--color-text-secondary);font-size:11px;user-select:none">' + (i + 1) + ': </span>';
          html += num + '<span class="' + cls + '" style="border-radius:2px">' + escapeHtml(lines[i]) + '</span>';
          if (i < lines.length - 1) {
            html += '<span class="cc-hl-newline">\u21B5</span>\n';
          }
        }
        return html;
      }
    },
    'bytes': {
      title: 'バイト数（UTF-8）',
      legend: [
        { label: '1バイト (ASCII)', color: '#c8e6c9' },
        { label: '2バイト', color: '#fff9c4' },
        { label: '3バイト (日本語等)', color: '#ffe0b2' },
        { label: '4バイト (絵文字等)', color: '#ffccbc' },
      ],
      render: function (text) {
        var html = '';
        for (var i = 0; i < text.length; i++) {
          if (text[i] === '\n') {
            html += '<span class="cc-hl-newline">\u21B5</span>\n';
            continue;
          }
          var b = getUtf8ByteLength(text[i]);
          var cls = 'cc-hl-byte-' + b;
          html += '<span class="' + cls + '" title="' + b + 'B">' + escapeHtml(text[i]) + '</span>';
        }
        return html;
      }
    },
    'words': {
      title: '単語数',
      legend: [
        { label: '単語（交互色）', color: '#bbdefb' },
        { label: '', color: '#c8e6c9' },
        { label: '空白', color: 'transparent' },
      ],
      render: function (text) {
        var segments = splitWords(text);
        var html = '';
        var wordIdx = 0;
        for (var i = 0; i < segments.length; i++) {
          var seg = segments[i];
          var escaped = '';
          // 改行を可視化
          for (var j = 0; j < seg.text.length; j++) {
            if (seg.text[j] === '\n') {
              escaped += '<span class="cc-hl-newline">\u21B5</span>\n';
            } else {
              escaped += escapeHtml(seg.text[j]);
            }
          }
          if (seg.type === 'word') {
            var cls = (wordIdx % 2 === 0) ? 'cc-hl-word cc-hl-word-even' : 'cc-hl-word cc-hl-word-odd';
            html += '<span class="' + cls + '">' + escaped + '</span>';
            wordIdx++;
          } else {
            html += escaped;
          }
        }
        return html;
      }
    },
    'paragraphs': {
      title: '段落数',
      legend: [
        { label: '段落（交互色）', color: '#e1bee7' },
        { label: '', color: '#ffe0b2' },
      ],
      render: function (text) {
        var blocks = text.split(/(\n\s*\n)/);
        var html = '';
        var paraIdx = 0;
        for (var i = 0; i < blocks.length; i++) {
          var block = blocks[i];
          if (/^\n\s*\n$/.test(block)) {
            // 段落区切り
            for (var j = 0; j < block.length; j++) {
              if (block[j] === '\n') {
                html += '<span class="cc-hl-newline">\u21B5</span>\n';
              } else {
                html += escapeHtml(block[j]);
              }
            }
          } else if (block.trim()) {
            var cls = (paraIdx % 2 === 0) ? 'cc-hl-paragraph cc-hl-para-even' : 'cc-hl-paragraph cc-hl-para-odd';
            var escaped = '';
            for (var k = 0; k < block.length; k++) {
              if (block[k] === '\n') {
                escaped += '<span class="cc-hl-newline">\u21B5</span>\n';
              } else {
                escaped += escapeHtml(block[k]);
              }
            }
            html += '<span class="' + cls + '">' + escaped + '</span>';
            paraIdx++;
          } else {
            html += escapeHtml(block);
          }
        }
        return html;
      }
    },
  };

  function renderVisual(mode) {
    var viz = VISUALIZERS[mode];
    if (!viz) return;

    var text = textEl.value;
    visualTitle.textContent = viz.title + ' のビジュアライズ';

    if (!text) {
      visualBody.innerHTML = '<div style="text-align:center;padding:24px;color:var(--color-text-secondary)">テキストを入力してください</div>';
    } else {
      visualBody.innerHTML = viz.render(text);
    }

    // 凡例
    var legendHtml = '';
    viz.legend.forEach(function (item) {
      if (!item.label) return;
      legendHtml += '<span class="cc-legend-item">';
      legendHtml += '<span class="cc-legend-swatch" style="background:' + item.color + ';border:1px solid rgba(0,0,0,.1)"></span>';
      legendHtml += item.label;
      legendHtml += '</span>';
    });
    visualLegend.innerHTML = legendHtml;

    visualEl.style.display = '';
  }

  function setActiveCard(mode) {
    statCards.forEach(function (card) {
      card.classList.toggle('cc-active', card.dataset.ccMode === mode);
    });
  }

  // --- カードクリック ---
  statCards.forEach(function (card) {
    card.addEventListener('click', function () {
      var mode = card.dataset.ccMode;
      if (activeMode === mode) {
        // トグルオフ
        activeMode = null;
        visualEl.style.display = 'none';
        setActiveCard(null);
        return;
      }
      activeMode = mode;
      setActiveCard(mode);
      renderVisual(mode);
    });
  });

  // --- 閉じるボタン ---
  closeBtn.addEventListener('click', function () {
    activeMode = null;
    visualEl.style.display = 'none';
    setActiveCard(null);
  });

  textEl.addEventListener('input', update);
})();
