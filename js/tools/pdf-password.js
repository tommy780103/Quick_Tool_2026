/* ============================================
   PDFパスワード保護
   PDF 1.4 Standard Security Handler (40-bit RC4)
   ============================================ */
(function () {
  'use strict';

  // --- DOM要素 ---
  var settingsPanel = document.getElementById('pp-settings');
  var filenameDisplay = document.getElementById('pp-filename');
  var filesizeDisplay = document.getElementById('pp-filesize');
  var userPassInput = document.getElementById('pp-user-pass');
  var userToggleBtn = document.getElementById('pp-user-toggle');
  var ownerPassInput = document.getElementById('pp-owner-pass');
  var ownerToggleBtn = document.getElementById('pp-owner-toggle');
  var permPrint = document.getElementById('pp-perm-print');
  var permCopy = document.getElementById('pp-perm-copy');
  var permEdit = document.getElementById('pp-perm-edit');
  var executeBtn = document.getElementById('pp-execute');
  var resultArea = document.getElementById('pp-result');
  var downloadBtn = document.getElementById('pp-download');
  var resetBtn = document.getElementById('pp-reset');

  // --- 状態 ---
  var srcFile = null;
  var srcBytes = null;
  var resultBlob = null;
  var resultFileName = '';

  // --- ドロップゾーン初期化 ---
  ChoiTool.initDropZone('pp-drop', 'pp-file', {
    multiple: false,
    onFiles: handleFiles,
  });

  // --- パスワード表示/非表示トグル ---
  if (userToggleBtn) {
    userToggleBtn.addEventListener('click', function () {
      var isPassword = userPassInput.type === 'password';
      userPassInput.type = isPassword ? 'text' : 'password';
      userToggleBtn.textContent = isPassword ? '\u25CE' : '\u25C9';
      userToggleBtn.title = isPassword ? 'パスワードを非表示' : 'パスワードを表示';
    });
  }
  if (ownerToggleBtn) {
    ownerToggleBtn.addEventListener('click', function () {
      var isPassword = ownerPassInput.type === 'password';
      ownerPassInput.type = isPassword ? 'text' : 'password';
      ownerToggleBtn.textContent = isPassword ? '\u25CE' : '\u25C9';
      ownerToggleBtn.title = isPassword ? 'パスワードを非表示' : 'パスワードを表示';
    });
  }

  // --- ファイル読み込み ---
  async function handleFiles(files) {
    var file = files[0];
    if (!file) return;

    var ext = file.name.toLowerCase().match(/\.[^.]+$/);
    if (!ext || ext[0] !== '.pdf') {
      ChoiTool.showToast('PDFファイルを選択してください', 'error');
      return;
    }

    try {
      srcFile = file;
      srcBytes = new Uint8Array(await ChoiTool.readFileAs(file, 'arrayBuffer'));

      // pdf-libで読み込み検証
      var pdfDoc = await PDFLib.PDFDocument.load(srcBytes);
      var pageCount = pdfDoc.getPageCount();

      filenameDisplay.textContent = file.name;
      filesizeDisplay.textContent = ChoiTool.formatFileSize(file.size) + ' / ' + pageCount + ' ページ';
      settingsPanel.style.display = '';
      resultArea.style.display = 'none';
      resultBlob = null;

      ChoiTool.showToast('PDFを読み込みました（' + pageCount + ' ページ）', 'info');
    } catch (e) {
      ChoiTool.showToast('PDFの読み込みに失敗しました: ' + e.message, 'error');
    }
  }

  // ===========================================================================
  //  MD5 実装 (RFC 1321) — Uint8Array を受け取り Uint8Array(16) を返す
  // ===========================================================================
  var md5 = (function () {
    function safeAdd(x, y) {
      var lsw = (x & 0xffff) + (y & 0xffff);
      var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
      return (msw << 16) | (lsw & 0xffff);
    }
    function bitRotateLeft(num, cnt) {
      return (num << cnt) | (num >>> (32 - cnt));
    }
    function md5cmn(q, a, b, x, s, t) {
      return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
    }
    function md5ff(a, b, c, d, x, s, t) {
      return md5cmn((b & c) | (~b & d), a, b, x, s, t);
    }
    function md5gg(a, b, c, d, x, s, t) {
      return md5cmn((b & d) | (c & ~d), a, b, x, s, t);
    }
    function md5hh(a, b, c, d, x, s, t) {
      return md5cmn(b ^ c ^ d, a, b, x, s, t);
    }
    function md5ii(a, b, c, d, x, s, t) {
      return md5cmn(c ^ (b | ~d), a, b, x, s, t);
    }

    function binlMD5(x, len) {
      x[len >> 5] |= 0x80 << (len % 32);
      x[((len + 64) >>> 9 << 4) + 14] = len;

      var a = 1732584193;
      var b = -271733879;
      var c = -1732584194;
      var d = 271733878;

      for (var i = 0; i < x.length; i += 16) {
        var olda = a, oldb = b, oldc = c, oldd = d;

        a = md5ff(a, b, c, d, x[i],      7, -680876936);
        d = md5ff(d, a, b, c, x[i + 1],  12, -389564586);
        c = md5ff(c, d, a, b, x[i + 2],  17, 606105819);
        b = md5ff(b, c, d, a, x[i + 3],  22, -1044525330);
        a = md5ff(a, b, c, d, x[i + 4],  7, -176418897);
        d = md5ff(d, a, b, c, x[i + 5],  12, 1200080426);
        c = md5ff(c, d, a, b, x[i + 6],  17, -1473231341);
        b = md5ff(b, c, d, a, x[i + 7],  22, -45705983);
        a = md5ff(a, b, c, d, x[i + 8],  7, 1770035416);
        d = md5ff(d, a, b, c, x[i + 9],  12, -1958414417);
        c = md5ff(c, d, a, b, x[i + 10], 17, -42063);
        b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162);
        a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682);
        d = md5ff(d, a, b, c, x[i + 13], 12, -40341101);
        c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290);
        b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329);

        a = md5gg(a, b, c, d, x[i + 1],  5, -165796510);
        d = md5gg(d, a, b, c, x[i + 6],  9, -1069501632);
        c = md5gg(c, d, a, b, x[i + 11], 14, 643717713);
        b = md5gg(b, c, d, a, x[i],      20, -373897302);
        a = md5gg(a, b, c, d, x[i + 5],  5, -701558691);
        d = md5gg(d, a, b, c, x[i + 10], 9, 38016083);
        c = md5gg(c, d, a, b, x[i + 15], 14, -660478335);
        b = md5gg(b, c, d, a, x[i + 4],  20, -405537848);
        a = md5gg(a, b, c, d, x[i + 9],  5, 568446438);
        d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690);
        c = md5gg(c, d, a, b, x[i + 3],  14, -187363961);
        b = md5gg(b, c, d, a, x[i + 8],  20, 1163531501);
        a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467);
        d = md5gg(d, a, b, c, x[i + 2],  9, -51403784);
        c = md5gg(c, d, a, b, x[i + 7],  14, 1735328473);
        b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734);

        a = md5hh(a, b, c, d, x[i + 5],  4, -378558);
        d = md5hh(d, a, b, c, x[i + 8],  11, -2022574463);
        c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562);
        b = md5hh(b, c, d, a, x[i + 14], 23, -35309556);
        a = md5hh(a, b, c, d, x[i + 1],  4, -1530992060);
        d = md5hh(d, a, b, c, x[i + 4],  11, 1272893353);
        c = md5hh(c, d, a, b, x[i + 7],  16, -155497632);
        b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640);
        a = md5hh(a, b, c, d, x[i + 13], 4, 681279174);
        d = md5hh(d, a, b, c, x[i],      11, -358537222);
        c = md5hh(c, d, a, b, x[i + 3],  16, -722521979);
        b = md5hh(b, c, d, a, x[i + 6],  23, 76029189);
        a = md5hh(a, b, c, d, x[i + 9],  4, -640364487);
        d = md5hh(d, a, b, c, x[i + 12], 11, -421815835);
        c = md5hh(c, d, a, b, x[i + 15], 16, 530742520);
        b = md5hh(b, c, d, a, x[i + 2],  23, -995338651);

        a = md5ii(a, b, c, d, x[i],      6, -198630844);
        d = md5ii(d, a, b, c, x[i + 7],  10, 1126891415);
        c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905);
        b = md5ii(b, c, d, a, x[i + 5],  21, -57434055);
        a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571);
        d = md5ii(d, a, b, c, x[i + 3],  10, -1894986606);
        c = md5ii(c, d, a, b, x[i + 10], 15, -1051523);
        b = md5ii(b, c, d, a, x[i + 1],  21, -2054922799);
        a = md5ii(a, b, c, d, x[i + 8],  6, 1873313359);
        d = md5ii(d, a, b, c, x[i + 15], 10, -30611744);
        c = md5ii(c, d, a, b, x[i + 6],  15, -1560198380);
        b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649);
        a = md5ii(a, b, c, d, x[i + 4],  6, -145523070);
        d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379);
        c = md5ii(c, d, a, b, x[i + 2],  15, 718787259);
        b = md5ii(b, c, d, a, x[i + 9],  21, -343485551);

        a = safeAdd(a, olda);
        b = safeAdd(b, oldb);
        c = safeAdd(c, oldc);
        d = safeAdd(d, oldd);
      }
      return [a, b, c, d];
    }

    function bytesToWords(bytes) {
      var words = [];
      for (var i = 0; i < bytes.length; i++) {
        words[i >> 2] |= bytes[i] << ((i % 4) << 3);
      }
      return words;
    }

    function wordsToBytes(words) {
      var bytes = new Uint8Array(words.length * 4);
      for (var i = 0; i < words.length; i++) {
        bytes[i * 4]     = (words[i])       & 0xff;
        bytes[i * 4 + 1] = (words[i] >> 8)  & 0xff;
        bytes[i * 4 + 2] = (words[i] >> 16) & 0xff;
        bytes[i * 4 + 3] = (words[i] >> 24) & 0xff;
      }
      return bytes;
    }

    return function (input) {
      var words = bytesToWords(input);
      var hash = binlMD5(words, input.length * 8);
      return wordsToBytes(hash);
    };
  })();

  // ===========================================================================
  //  RC4 暗号化
  // ===========================================================================
  function rc4(key, data) {
    var s = new Uint8Array(256);
    var i, j, tmp;
    for (i = 0; i < 256; i++) s[i] = i;
    j = 0;
    for (i = 0; i < 256; i++) {
      j = (j + s[i] + key[i % key.length]) & 0xff;
      tmp = s[i]; s[i] = s[j]; s[j] = tmp;
    }
    var result = new Uint8Array(data.length);
    i = 0; j = 0;
    for (var k = 0; k < data.length; k++) {
      i = (i + 1) & 0xff;
      j = (j + s[i]) & 0xff;
      tmp = s[i]; s[i] = s[j]; s[j] = tmp;
      result[k] = data[k] ^ s[(s[i] + s[j]) & 0xff];
    }
    return result;
  }

  // ===========================================================================
  //  PDF標準セキュリティハンドラ定数
  // ===========================================================================
  var PADDING = new Uint8Array([
    0x28, 0xBF, 0x4E, 0x5E, 0x4D, 0x75, 0x8A, 0x41,
    0x64, 0x00, 0x4E, 0x56, 0xFF, 0xFA, 0x01, 0x08,
    0x2E, 0x2E, 0x00, 0xB6, 0xD0, 0x68, 0x3E, 0x80,
    0x2F, 0x0C, 0xA9, 0xFE, 0x64, 0x53, 0x69, 0x7A
  ]);

  /**
   * パスワードを32バイトにパディング
   */
  function padPassword(password) {
    var bytes = new TextEncoder().encode(password || '');
    var padded = new Uint8Array(32);
    var len = Math.min(bytes.length, 32);
    padded.set(bytes.subarray(0, len));
    if (len < 32) {
      padded.set(PADDING.subarray(0, 32 - len), len);
    }
    return padded;
  }

  /**
   * Algorithm 3: Owner Password (O) 値を計算
   * R=2, keyLength=40bit(5bytes)
   */
  function computeOwnerValue(ownerPass, userPass) {
    var paddedOwner = padPassword(ownerPass || userPass);
    var hash = md5(paddedOwner);
    var rc4Key = hash.subarray(0, 5); // 40-bit key
    var paddedUser = padPassword(userPass);
    return rc4(rc4Key, paddedUser);
  }

  /**
   * Algorithm 2: 暗号化キーを計算
   * R=2, keyLength=40bit(5bytes)
   */
  function computeEncryptionKey(userPass, oValue, permissions, fileId) {
    var paddedUser = padPassword(userPass);
    // P値を4バイトリトルエンディアンに
    var pBytes = new Uint8Array(4);
    pBytes[0] = permissions & 0xff;
    pBytes[1] = (permissions >> 8) & 0xff;
    pBytes[2] = (permissions >> 16) & 0xff;
    pBytes[3] = (permissions >> 24) & 0xff;

    // MD5(padded_user + O + P_LE + fileId)
    var input = new Uint8Array(paddedUser.length + oValue.length + 4 + fileId.length);
    var offset = 0;
    input.set(paddedUser, offset); offset += paddedUser.length;
    input.set(oValue, offset); offset += oValue.length;
    input.set(pBytes, offset); offset += 4;
    input.set(fileId, offset);

    var hash = md5(input);
    return hash.subarray(0, 5); // 40-bit key
  }

  /**
   * Algorithm 4: User Password (U) 値を計算
   * R=2
   */
  function computeUserValue(encryptionKey) {
    return rc4(encryptionKey, PADDING);
  }

  /**
   * パーミッション値を計算（32bit符号付き整数）
   * PDF仕様: ビット1-2は0, ビット7-8は1が必須
   * ビット3(4): 印刷, ビット4(8): 内容変更, ビット5(16): テキスト等コピー
   * ビット6(32): 注釈追加
   * 上位ビットは全て1
   */
  function computePermissions(allowPrint, allowCopy, allowEdit) {
    // 基本: ビット7,8 = 1、ビット1,2 = 0、上位ビット(13-32)は全て1
    var p = 0xFFFFF0C0; // -3904 — 上位20bit全部1, bit7=1(64), bit8=1(128)
    if (allowPrint) p |= 4;   // bit 3
    if (allowEdit)  p |= 8;   // bit 4
    if (allowCopy)  p |= 16;  // bit 5
    // bit 6(32): 注釈追加 — デフォルトで許可しない
    return p | 0; // 符号付き整数に変換
  }

  // ===========================================================================
  //  ヘルパー
  // ===========================================================================

  /** バイト列をPDFヘキサ文字列に変換 */
  function bytesToHex(bytes) {
    var hex = '';
    for (var i = 0; i < bytes.length; i++) {
      hex += ('0' + bytes[i].toString(16)).slice(-2);
    }
    return hex;
  }

  /** 16進数文字列からUint8Arrayへ変換 */
  function hexToBytes(hex) {
    var bytes = new Uint8Array(hex.length / 2);
    for (var i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }

  /** オブジェクトごとの暗号化キーを計算 */
  function computeObjectKey(encKey, objNum, genNum) {
    var input = new Uint8Array(encKey.length + 5);
    input.set(encKey);
    input[encKey.length]     = objNum & 0xff;
    input[encKey.length + 1] = (objNum >> 8) & 0xff;
    input[encKey.length + 2] = (objNum >> 16) & 0xff;
    input[encKey.length + 3] = genNum & 0xff;
    input[encKey.length + 4] = (genNum >> 8) & 0xff;
    var hash = md5(input);
    return hash.subarray(0, Math.min(encKey.length + 5, 16));
  }

  /** Uint8ArrayをLatin-1文字列に変換（位置検索用、バイト位置と1:1対応） */
  function bytesToLatin1(bytes) {
    var parts = [];
    var CHUNK = 8192;
    for (var i = 0; i < bytes.length; i += CHUNK) {
      var end = Math.min(i + CHUNK, bytes.length);
      parts.push(String.fromCharCode.apply(null, bytes.subarray(i, end)));
    }
    return parts.join('');
  }

  /** xrefオフセットを10桁にゼロパディング */
  function padXrefOffset(offset) {
    var str = String(offset);
    while (str.length < 10) str = '0' + str;
    return str;
  }

  // ===========================================================================
  //  PDF文字列パーサー（暗号化用）
  // ===========================================================================

  /** リテラル文字列 (text) をパースしてバイト列を返す */
  function parseLiteralString(text, start) {
    var bytes = [];
    var i = start + 1;
    var depth = 1;
    while (i < text.length && depth > 0) {
      var ch = text.charCodeAt(i);
      if (ch === 0x5C) {
        i++;
        if (i >= text.length) break;
        var esc = text.charCodeAt(i);
        if (esc === 0x6E) bytes.push(0x0A);
        else if (esc === 0x72) bytes.push(0x0D);
        else if (esc === 0x74) bytes.push(0x09);
        else if (esc === 0x62) bytes.push(0x08);
        else if (esc === 0x66) bytes.push(0x0C);
        else if (esc === 0x28) bytes.push(0x28);
        else if (esc === 0x29) bytes.push(0x29);
        else if (esc === 0x5C) bytes.push(0x5C);
        else if (esc === 0x0D || esc === 0x0A) {
          if (esc === 0x0D && i + 1 < text.length && text.charCodeAt(i + 1) === 0x0A) i++;
        } else if (esc >= 0x30 && esc <= 0x37) {
          var octal = text[i];
          if (i + 1 < text.length && text.charCodeAt(i + 1) >= 0x30 && text.charCodeAt(i + 1) <= 0x37) {
            i++; octal += text[i];
            if (i + 1 < text.length && text.charCodeAt(i + 1) >= 0x30 && text.charCodeAt(i + 1) <= 0x37) {
              i++; octal += text[i];
            }
          }
          bytes.push(parseInt(octal, 8) & 0xFF);
        } else {
          bytes.push(esc & 0xFF);
        }
      } else if (ch === 0x28) {
        depth++;
        bytes.push(ch);
      } else if (ch === 0x29) {
        depth--;
        if (depth > 0) bytes.push(ch);
      } else {
        bytes.push(ch & 0xFF);
      }
      i++;
    }
    return { bytes: new Uint8Array(bytes), endPos: i };
  }

  /** 16進文字列 <hex> をパースしてバイト列を返す */
  function parseHexString(text, start) {
    var i = start + 1;
    var hex = '';
    while (i < text.length && text[i] !== '>') {
      var c = text[i];
      if ((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')) hex += c;
      i++;
    }
    if (i < text.length) i++;
    if (hex.length % 2 !== 0) hex += '0';
    return { bytes: hexToBytes(hex), endPos: i };
  }

  /** オブジェクト内の文字列リテラルを全てRC4暗号化してhex形式に変換 */
  function encryptStringsInText(text, objKey) {
    var result = '';
    var i = 0;
    while (i < text.length) {
      if (text[i] === '(') {
        var parsed = parseLiteralString(text, i);
        var encrypted = rc4(objKey, parsed.bytes);
        result += '<' + bytesToHex(encrypted) + '>';
        i = parsed.endPos;
      } else if (text[i] === '<' && i + 1 < text.length && text[i + 1] === '<') {
        result += '<<';
        i += 2;
      } else if (text[i] === '>' && i + 1 < text.length && text[i + 1] === '>') {
        result += '>>';
        i += 2;
      } else if (text[i] === '<') {
        var parsed = parseHexString(text, i);
        var encrypted = rc4(objKey, parsed.bytes);
        result += '<' + bytesToHex(encrypted) + '>';
        i = parsed.endPos;
      } else {
        result += text[i];
        i++;
      }
    }
    return result;
  }

  // ===========================================================================
  //  メインの暗号化処理
  //
  //  方針: PDF全体を再構築し、全ストリーム・全文字列を暗号化
  // ===========================================================================

  async function encryptPdf(pdfBytes, userPassword, ownerPassword, permissions) {
    // --- Step 1: pdf-lib で正規化 ---
    var pdfDoc = await PDFLib.PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    var savedBuf = await pdfDoc.save({ useObjectStreams: false });
    var pdf = new Uint8Array(savedBuf);
    var pdfText = bytesToLatin1(pdf);

    // --- Step 2: PDFバージョン取得 ---
    var verMatch = pdfText.match(/%PDF-(\d+\.\d+)/);
    var pdfVersion = verMatch ? verMatch[1] : '1.4';

    // --- Step 3: File ID ---
    var fileId;
    var idMatch = pdfText.match(/\/ID\s*\[\s*<([0-9a-fA-F]+)>/);
    if (idMatch) {
      fileId = hexToBytes(idMatch[1]);
    } else {
      fileId = new Uint8Array(16);
      crypto.getRandomValues(fileId);
    }

    // --- Step 4: 暗号化パラメータ ---
    var oValue = computeOwnerValue(ownerPassword, userPassword);
    var encKey = computeEncryptionKey(userPassword, oValue, permissions, fileId);
    var uValue = computeUserValue(encKey);

    // --- Step 5: 全オブジェクトをパース ---
    var objects = [];
    var objRe = /(\d+)\s+(\d+)\s+obj\b/g;
    var m;
    while ((m = objRe.exec(pdfText)) !== null) {
      var objNum = parseInt(m[1]);
      var genNum = parseInt(m[2]);
      var afterKw = m.index + m[0].length;
      var slice = pdfText.substring(afterKw, Math.min(afterKw + 200000, pdfText.length));

      // stream キーワードを検索
      var sMatch = slice.match(/\bstream(\r?\n)/);
      if (sMatch) {
        var header = slice.substring(0, sMatch.index);
        var lenMatch = header.match(/\/Length\s+(\d+)/);
        if (!lenMatch) continue;
        var streamLen = parseInt(lenMatch[1]);
        var dataStart = afterKw + sMatch.index + 6 + sMatch[1].length;
        if (dataStart + streamLen > pdf.length) continue;
        objects.push({
          num: objNum, gen: genNum, hasStream: true,
          header: header,
          streamData: new Uint8Array(pdf.subarray(dataStart, dataStart + streamLen)),
        });
      } else {
        var endIdx = slice.indexOf('endobj');
        if (endIdx === -1) continue;
        objects.push({
          num: objNum, gen: genNum, hasStream: false,
          body: slice.substring(0, endIdx),
        });
      }
    }

    // --- Step 6: トレーラー情報 ---
    var rootMatch = pdfText.match(/\/Root\s+(\d+\s+\d+\s+R)/);
    if (!rootMatch) throw new Error('/Root が見つかりません');
    var infoMatch = pdfText.match(/\/Info\s+(\d+\s+\d+\s+R)/);

    var maxObjNum = 0;
    for (var i = 0; i < objects.length; i++) {
      if (objects[i].num > maxObjNum) maxObjNum = objects[i].num;
    }
    var encObjNum = maxObjNum + 1;
    var totalSize = encObjNum + 1;

    // --- Step 7: 新しいPDFを構築 ---
    var parts = [];
    var offset = 0;
    var xrefMap = {};

    function emit(str) {
      var bytes = new Uint8Array(str.length);
      for (var k = 0; k < str.length; k++) bytes[k] = str.charCodeAt(k) & 0xFF;
      parts.push(bytes);
      offset += bytes.length;
    }
    function emitBytes(bytes) {
      parts.push(bytes);
      offset += bytes.length;
    }

    emit('%PDF-' + pdfVersion + '\n');

    objects.sort(function (a, b) { return a.num - b.num; });

    for (var i = 0; i < objects.length; i++) {
      var obj = objects[i];
      var objKey = computeObjectKey(encKey, obj.num, obj.gen);
      xrefMap[obj.num] = offset;

      if (obj.hasStream) {
        var encHeader = encryptStringsInText(obj.header, objKey);
        emit(obj.num + ' ' + obj.gen + ' obj' + encHeader + '\nstream\n');
        emitBytes(rc4(objKey, obj.streamData));
        emit('\nendstream\nendobj\n');
      } else {
        var encBody = encryptStringsInText(obj.body, objKey);
        emit(obj.num + ' ' + obj.gen + ' obj' + encBody + 'endobj\n');
      }
    }

    // Encrypt辞書オブジェクト
    xrefMap[encObjNum] = offset;
    emit(encObjNum + ' 0 obj\n<< /Filter /Standard /V 1 /R 2 /Length 40' +
      ' /O <' + bytesToHex(oValue) + '>' +
      ' /U <' + bytesToHex(uValue) + '>' +
      ' /P ' + permissions + ' >>\nendobj\n');

    // xrefテーブル
    var xrefOffset = offset;
    emit('xref\n0 ' + totalSize + '\n');
    emit('0000000000 65535 f \n');
    for (var n = 1; n < totalSize; n++) {
      if (xrefMap[n] !== undefined) {
        emit(padXrefOffset(xrefMap[n]) + ' 00000 n \n');
      } else {
        emit('0000000000 00000 f \n');
      }
    }

    // trailer
    var trailer = 'trailer\n<< /Size ' + totalSize +
      ' /Root ' + rootMatch[1] +
      ' /Encrypt ' + encObjNum + ' 0 R' +
      ' /ID [<' + bytesToHex(fileId) + '><' + bytesToHex(fileId) + '>]';
    if (infoMatch) trailer += ' /Info ' + infoMatch[1];
    trailer += ' >>\nstartxref\n' + xrefOffset + '\n%%EOF\n';
    emit(trailer);

    // 結合
    var totalLen = 0;
    for (var i = 0; i < parts.length; i++) totalLen += parts[i].length;
    var result = new Uint8Array(totalLen);
    var pos = 0;
    for (var i = 0; i < parts.length; i++) {
      result.set(parts[i], pos);
      pos += parts[i].length;
    }
    return result;
  }

  // ===========================================================================
  //  実行ボタン
  // ===========================================================================
  if (executeBtn) {
    executeBtn.addEventListener('click', async function () {
      if (!srcBytes) {
        ChoiTool.showToast('PDFファイルを読み込んでください', 'error');
        return;
      }

      var userPass = userPassInput.value.trim();
      if (!userPass) {
        ChoiTool.showToast('ユーザーパスワードを入力してください', 'error');
        userPassInput.focus();
        return;
      }

      var ownerPass = ownerPassInput.value.trim() || userPass;
      var allowPrint = permPrint.checked;
      var allowCopy = permCopy.checked;
      var allowEdit = permEdit.checked;

      executeBtn.disabled = true;
      executeBtn.textContent = '暗号化中...';

      try {
        var permissions = computePermissions(allowPrint, allowCopy, allowEdit);
        var encryptedBytes = await encryptPdf(srcBytes, userPass, ownerPass, permissions);

        resultBlob = new Blob([encryptedBytes], { type: 'application/pdf' });
        resultFileName = srcFile.name.replace(/\.pdf$/i, '_protected.pdf');

        resultArea.style.display = '';
        ChoiTool.showToast('PDFにパスワード保護を適用しました', 'success');
      } catch (e) {
        console.error('PDF暗号化エラー:', e);
        ChoiTool.showToast('暗号化に失敗しました: ' + e.message, 'error');

        // フォールバック: 暗号化なしで再保存
        try {
          ChoiTool.showToast('フォールバック: 暗号化なしでPDFを再保存します', 'info');
          var doc = await PDFLib.PDFDocument.load(srcBytes);
          var savedBytes = await doc.save();
          resultBlob = new Blob([savedBytes], { type: 'application/pdf' });
          resultFileName = srcFile.name.replace(/\.pdf$/i, '_resaved.pdf');
          resultArea.style.display = '';
        } catch (e2) {
          ChoiTool.showToast('PDFの処理に失敗しました: ' + e2.message, 'error');
        }
      } finally {
        executeBtn.disabled = false;
        executeBtn.textContent = 'パスワード保護を実行';
      }
    });
  }

  // --- ダウンロード ---
  if (downloadBtn) {
    downloadBtn.addEventListener('click', function () {
      if (resultBlob) {
        ChoiTool.downloadBlob(resultBlob, resultFileName);
      }
    });
  }

  // --- リセット ---
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      srcFile = null;
      srcBytes = null;
      resultBlob = null;
      resultFileName = '';
      settingsPanel.style.display = 'none';
      resultArea.style.display = 'none';
      filenameDisplay.textContent = '';
      filesizeDisplay.textContent = '';
      userPassInput.value = '';
      ownerPassInput.value = '';
      permPrint.checked = true;
      permCopy.checked = false;
      permEdit.checked = false;
      document.getElementById('pp-file').value = '';
    });
  }
})();
