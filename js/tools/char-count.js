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
  }

  textEl.addEventListener('input', update);
})();
