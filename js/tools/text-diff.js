/* ============================================
   テキスト差分比較
   ============================================ */
(function () {
  'use strict';

  var oldEl = document.getElementById('diff-old');
  var newEl = document.getElementById('diff-new');
  var modeEl = document.getElementById('diff-mode');
  var viewEl = document.getElementById('diff-view');
  var executeBtn = document.getElementById('diff-execute');
  var resultEl = document.getElementById('diff-result');
  var statsEl = document.getElementById('diff-stats');
  var outputEl = document.getElementById('diff-output');

  var escapeHtml = ChoiTool.escapeHTML;

  function computeDiff(oldText, newText, mode) {
    switch (mode) {
      case 'chars':
        return Diff.diffChars(oldText, newText);
      case 'words':
        return Diff.diffWords(oldText, newText);
      case 'lines':
        return Diff.diffLines(oldText, newText);
      default:
        return Diff.diffChars(oldText, newText);
    }
  }

  function calcStats(parts) {
    var added = 0;
    var removed = 0;
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].added) added += parts[i].count || 1;
      else if (parts[i].removed) removed += parts[i].count || 1;
    }
    return { added: added, removed: removed };
  }

  function renderStats(stats) {
    statsEl.innerHTML =
      '<span class="diff-stats-added">+ 追加 ' + stats.added +
      '件</span> / <span class="diff-stats-removed">- 削除 ' + stats.removed +
      '件</span>';
  }

  /** 行内の文字差分をハイライトしたHTMLを返す */
  function highlightCharDiff(oldLine, newLine) {
    var charDiff = Diff.diffChars(oldLine, newLine);
    var oldHtml = '';
    var newHtml = '';

    for (var i = 0; i < charDiff.length; i++) {
      var d = charDiff[i];
      var text = escapeHtml(d.value);
      if (d.added) {
        newHtml += '<span class="diff-char-added">' + text + '</span>';
      } else if (d.removed) {
        oldHtml += '<span class="diff-char-removed">' + text + '</span>';
      } else {
        oldHtml += text;
        newHtml += text;
      }
    }
    return { oldHtml: oldHtml, newHtml: newHtml };
  }

  /** 差分行の HTML を生成 */
  function buildLine(lineNum, sign, text, cls) {
    return '<div class="diff-line ' + cls + '">' +
      '<span class="diff-line-num">' + (lineNum !== null ? lineNum : '') + '</span>' +
      '<span class="diff-line-sign">' + sign + '</span>' +
      '<span class="diff-line-text">' + text + '</span>' +
      '</div>';
  }

  function renderUnifiedInline(parts) {
    var html = '<div class="diff-inline">';
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      var text = escapeHtml(p.value);
      if (p.added) {
        html += '<span class="diff-added">' + text + '</span>';
      } else if (p.removed) {
        html += '<span class="diff-removed">' + text + '</span>';
      } else {
        html += '<span>' + text + '</span>';
      }
    }
    html += '</div>';
    return html;
  }

  function renderUnifiedLines(parts) {
    var html = '';
    var oldLineNum = 1;
    var newLineNum = 1;

    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      var lines = p.value.replace(/\n$/, '').split('\n');

      if (p.removed) {
        // 行内ハイライト: 直後に added があればペアリング
        var nextAdded = (i + 1 < parts.length && parts[i + 1].added) ? parts[i + 1] : null;
        var addedLines = nextAdded ? nextAdded.value.replace(/\n$/, '').split('\n') : [];

        for (var j = 0; j < lines.length; j++) {
          if (j < addedLines.length) {
            var hl = highlightCharDiff(lines[j], addedLines[j]);
            html += buildLine(oldLineNum++, '-', hl.oldHtml, 'diff-line-removed');
          } else {
            html += buildLine(oldLineNum++, '-', escapeHtml(lines[j]), 'diff-line-removed');
          }
        }

        if (nextAdded) {
          for (var k = 0; k < addedLines.length; k++) {
            if (k < lines.length) {
              var hl2 = highlightCharDiff(lines[k], addedLines[k]);
              html += buildLine(newLineNum++, '+', hl2.newHtml, 'diff-line-added');
            } else {
              html += buildLine(newLineNum++, '+', escapeHtml(addedLines[k]), 'diff-line-added');
            }
          }
          i++; // nextAdded をスキップ
        }
      } else if (p.added) {
        for (var m = 0; m < lines.length; m++) {
          html += buildLine(newLineNum++, '+', escapeHtml(lines[m]), 'diff-line-added');
        }
      } else {
        for (var n = 0; n < lines.length; n++) {
          html += buildLine(oldLineNum + '|' + newLineNum, ' ', escapeHtml(lines[n]), 'diff-line-context');
          oldLineNum++;
          newLineNum++;
        }
      }
    }
    return html;
  }

  function renderSideBySide(parts) {
    var leftLines = [];
    var rightLines = [];
    var oldLineNum = 1;
    var newLineNum = 1;
    var i = 0;

    while (i < parts.length) {
      var p = parts[i];
      var lines = p.value.replace(/\n$/, '').split('\n');

      if (p.removed) {
        var nextAdded = i + 1 < parts.length && parts[i + 1].added ? parts[i + 1] : null;
        var removedLines = lines;
        var addedLines = nextAdded
          ? nextAdded.value.replace(/\n$/, '').split('\n')
          : [];

        var max = Math.max(removedLines.length, addedLines.length);
        for (var j = 0; j < max; j++) {
          if (j < removedLines.length && j < addedLines.length) {
            // ペア行 → 行内ハイライト
            var hl = highlightCharDiff(removedLines[j], addedLines[j]);
            leftLines.push({ num: oldLineNum++, text: hl.oldHtml, type: 'removed', raw: false });
            rightLines.push({ num: newLineNum++, text: hl.newHtml, type: 'added', raw: false });
          } else if (j < removedLines.length) {
            leftLines.push({ num: oldLineNum++, text: removedLines[j], type: 'removed', raw: true });
            rightLines.push({ num: null, text: '', type: 'empty', raw: true });
          } else {
            leftLines.push({ num: null, text: '', type: 'empty', raw: true });
            rightLines.push({ num: newLineNum++, text: addedLines[j], type: 'added', raw: true });
          }
        }

        if (nextAdded) i += 2;
        else i++;
      } else if (p.added) {
        for (var k = 0; k < lines.length; k++) {
          leftLines.push({ num: null, text: '', type: 'empty', raw: true });
          rightLines.push({ num: newLineNum++, text: lines[k], type: 'added', raw: true });
        }
        i++;
      } else {
        for (var m = 0; m < lines.length; m++) {
          leftLines.push({ num: oldLineNum++, text: lines[m], type: 'context', raw: true });
          rightLines.push({ num: newLineNum++, text: lines[m], type: 'context', raw: true });
        }
        i++;
      }
    }

    var html = '<div class="diff-side-by-side">';

    html += '<div class="diff-side" id="diff-side-left"><div class="diff-side-header">変更前</div>';
    for (var a = 0; a < leftLines.length; a++) {
      var l = leftLines[a];
      var sign = l.type === 'removed' ? '-' : (l.type === 'empty' ? '' : ' ');
      var textHtml = l.raw ? escapeHtml(l.text) : l.text;
      html += buildLine(l.num, sign, textHtml, 'diff-line-' + l.type);
    }
    html += '</div>';

    html += '<div class="diff-side" id="diff-side-right"><div class="diff-side-header">変更後</div>';
    for (var b = 0; b < rightLines.length; b++) {
      var r = rightLines[b];
      var sign2 = r.type === 'added' ? '+' : (r.type === 'empty' ? '' : ' ');
      var textHtml2 = r.raw ? escapeHtml(r.text) : r.text;
      html += buildLine(r.num, sign2, textHtml2, 'diff-line-' + r.type);
    }
    html += '</div>';

    html += '</div>';
    return html;
  }

  /** 並列ビューのスクロール同期 */
  function syncSideScroll() {
    var left = document.getElementById('diff-side-left');
    var right = document.getElementById('diff-side-right');
    if (!left || !right) return;

    var syncing = false;
    left.addEventListener('scroll', function () {
      if (syncing) return;
      syncing = true;
      right.scrollTop = left.scrollTop;
      syncing = false;
    });
    right.addEventListener('scroll', function () {
      if (syncing) return;
      syncing = true;
      left.scrollTop = right.scrollTop;
      syncing = false;
    });
  }

  function execute() {
    var oldText = oldEl.value;
    var newText = newEl.value;

    if (!oldText && !newText) {
      ChoiTool.showToast('テキストを入力してください', 'error');
      return;
    }

    var mode = modeEl.value;
    var view = viewEl.value;

    var parts = computeDiff(oldText, newText, mode);
    var stats = calcStats(parts);

    renderStats(stats);

    var html;
    if (view === 'side' && mode === 'lines') {
      html = renderSideBySide(parts);
    } else if (mode === 'lines') {
      html = renderUnifiedLines(parts);
    } else {
      html = renderUnifiedInline(parts);
    }

    outputEl.innerHTML = html;
    resultEl.style.display = '';

    if (view === 'side' && mode === 'lines') {
      syncSideScroll();
    }
  }

  executeBtn.addEventListener('click', execute);
})();
