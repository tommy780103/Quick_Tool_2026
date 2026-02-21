/* ============================================
   QRコード生成
   ============================================ */
(function () {
  'use strict';

  const textEl = document.getElementById('qr-text');
  const sizeEl = document.getElementById('qr-size');
  const sizeValEl = document.getElementById('qr-size-val');
  const fgEl = document.getElementById('qr-fg');
  const bgEl = document.getElementById('qr-bg');
  const resultEl = document.getElementById('qr-result');
  const previewEl = document.getElementById('qr-preview');
  const btnPng = document.getElementById('qr-download-png');
  const btnSvg = document.getElementById('qr-download-svg');

  let currentCanvas = null;

  function getOptions() {
    return {
      text: textEl.value,
      width: parseInt(sizeEl.value, 10),
      height: parseInt(sizeEl.value, 10),
      colorDark: fgEl.value,
      colorLight: bgEl.value,
      correctLevel: QRCode.CorrectLevel.M,
    };
  }

  function generate() {
    const text = textEl.value.trim();
    if (!text) {
      resultEl.style.display = 'none';
      currentCanvas = null;
      return;
    }

    previewEl.innerHTML = '';
    const opts = getOptions();

    new QRCode(previewEl, {
      text: opts.text,
      width: opts.width,
      height: opts.height,
      colorDark: opts.colorDark,
      colorLight: opts.colorLight,
      correctLevel: opts.correctLevel,
    });

    resultEl.style.display = '';

    setTimeout(function () {
      currentCanvas = previewEl.querySelector('canvas');
    }, 50);
  }

  function downloadPng() {
    if (!currentCanvas) return;
    var dataUrl = currentCanvas.toDataURL('image/png');
    ChoiTool.downloadDataURL(dataUrl, 'qrcode.png');
  }

  function downloadSvg() {
    var text = textEl.value.trim();
    if (!text) return;

    var tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);

    var opts = getOptions();
    new QRCode(tempDiv, {
      text: opts.text,
      width: opts.width,
      height: opts.height,
      colorDark: opts.colorDark,
      colorLight: opts.colorLight,
      correctLevel: opts.correctLevel,
      drawer: 'svg',
    });

    setTimeout(function () {
      var svgEl = tempDiv.querySelector('svg');
      if (svgEl) {
        var svgData = new XMLSerializer().serializeToString(svgEl);
        var blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        ChoiTool.downloadBlob(blob, 'qrcode.svg');
      }
      document.body.removeChild(tempDiv);
    }, 50);
  }

  var debouncedGenerate = ChoiTool.debounce(generate, 300);

  textEl.addEventListener('input', debouncedGenerate);

  sizeEl.addEventListener('input', function () {
    sizeValEl.textContent = sizeEl.value;
    if (textEl.value.trim()) generate();
  });

  fgEl.addEventListener('input', function () {
    if (textEl.value.trim()) generate();
  });

  bgEl.addEventListener('input', function () {
    if (textEl.value.trim()) generate();
  });

  btnPng.addEventListener('click', downloadPng);
  btnSvg.addEventListener('click', downloadSvg);
})();
