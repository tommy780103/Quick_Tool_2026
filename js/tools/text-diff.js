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

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

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
      '<span class="diff-stats-added">追加 ' +
      stats.added +
      '件</span> / <span class="diff-stats-removed">削除 ' +
      stats.removed +
      '件</span>';
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
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      var lines = p.value.replace(/\n$/, '').split('\n');
      for (var j = 0; j < lines.length; j++) {
        var cls = 'diff-line diff-line-context';
        if (p.added) cls = 'diff-line diff-line-added';
        else if (p.removed) cls = 'diff-line diff-line-removed';
        html += '<div class="' + cls + '">' + escapeHtml(lines[j]) + '</div>';
      }
    }
    return html;
  }

  function renderSideBySide(parts) {
    var leftLines = [];
    var rightLines = [];
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
          if (j < removedLines.length) {
            leftLines.push({ text: removedLines[j], type: 'removed' });
          } else {
            leftLines.push({ text: '', type: 'empty' });
          }
          if (j < addedLines.length) {
            rightLines.push({ text: addedLines[j], type: 'added' });
          } else {
            rightLines.push({ text: '', type: 'empty' });
          }
        }

        if (nextAdded) i += 2;
        else i++;
      } else if (p.added) {
        for (var k = 0; k < lines.length; k++) {
          leftLines.push({ text: '', type: 'empty' });
          rightLines.push({ text: lines[k], type: 'added' });
        }
        i++;
      } else {
        for (var m = 0; m < lines.length; m++) {
          leftLines.push({ text: lines[m], type: 'context' });
          rightLines.push({ text: lines[m], type: 'context' });
        }
        i++;
      }
    }

    var html = '<div class="diff-side-by-side">';

    html += '<div class="diff-side"><div class="diff-side-header">変更前</div>';
    for (var a = 0; a < leftLines.length; a++) {
      var l = leftLines[a];
      var cls = 'diff-line diff-line-' + l.type;
      html += '<div class="' + cls + '">' + escapeHtml(l.text) + '</div>';
    }
    html += '</div>';

    html += '<div class="diff-side"><div class="diff-side-header">変更後</div>';
    for (var b = 0; b < rightLines.length; b++) {
      var r = rightLines[b];
      var cls2 = 'diff-line diff-line-' + r.type;
      html += '<div class="' + cls2 + '">' + escapeHtml(r.text) + '</div>';
    }
    html += '</div>';

    html += '</div>';
    return html;
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
  }

  executeBtn.addEventListener('click', execute);
})();
