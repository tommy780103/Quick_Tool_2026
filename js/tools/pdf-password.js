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
    0x64, 0x00, 0x4B, 0x49, 0x43, 0x48, 0x45, 0x46,
    0x2B, 0x6E, 0x2C, 0x7E, 0x2C, 0x7E, 0x2C, 0x7E,
    0x2C, 0x7E, 0x2C, 0x7E, 0x50, 0x45, 0x47, 0x45
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
  //  PDFバイト列操作ヘルパー
  // ===========================================================================

  /**
   * Uint8Arrayを文字列として読む（Latin-1/バイナリセーフ）
   */
  function bytesToStr(bytes) {
    var parts = [];
    var CHUNK = 8192;
    for (var i = 0; i < bytes.length; i += CHUNK) {
      var end = Math.min(i + CHUNK, bytes.length);
      var slice = bytes.subarray(i, end);
      parts.push(String.fromCharCode.apply(null, slice));
    }
    return parts.join('');
  }

  /**
   * 文字列をUint8Arrayに変換（Latin-1）
   */
  function strToBytes(str) {
    var bytes = new Uint8Array(str.length);
    for (var i = 0; i < str.length; i++) {
      bytes[i] = str.charCodeAt(i) & 0xff;
    }
    return bytes;
  }

  /**
   * バイト列をPDFヘキサ文字列に変換
   */
  function bytesToHex(bytes) {
    var hex = '';
    for (var i = 0; i < bytes.length; i++) {
      hex += ('0' + bytes[i].toString(16)).slice(-2);
    }
    return hex;
  }

  /**
   * 16進数文字列からUint8Arrayへ変換
   */
  function hexToBytes(hex) {
    var bytes = new Uint8Array(hex.length / 2);
    for (var i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }

  /**
   * PDFのFile ID（/ID配列の最初の要素）を取得
   * なければランダムに16バイト生成
   */
  function extractFileId(pdfStr) {
    // /ID [<hex><hex>] or /ID[<hex><hex>] パターンを検索
    var match = pdfStr.match(/\/ID\s*\[\s*<([0-9a-fA-F]+)>/);
    if (match) {
      return hexToBytes(match[1]);
    }
    // なければランダム生成
    var id = new Uint8Array(16);
    for (var i = 0; i < 16; i++) {
      id[i] = Math.floor(Math.random() * 256);
    }
    return id;
  }

  /**
   * PDFの%%EOF位置を見つける
   */
  function findLastEof(pdfStr) {
    var idx = pdfStr.lastIndexOf('%%EOF');
    return idx;
  }

  /**
   * PDFのxref/trailerセクションの開始位置を見つける
   * startxrefの値からxrefテーブルの位置を取得
   */
  function findStartXref(pdfStr) {
    var match = pdfStr.match(/startxref\s+(\d+)\s+%%EOF\s*$/);
    if (!match) {
      // 末尾から逆方向に探す
      var lastIdx = pdfStr.lastIndexOf('startxref');
      if (lastIdx === -1) return -1;
      var sub = pdfStr.substring(lastIdx);
      var m2 = sub.match(/startxref\s+(\d+)/);
      if (m2) return parseInt(m2[1]);
      return -1;
    }
    return parseInt(match[1]);
  }

  /**
   * trailerの/Root参照を取得
   */
  function findRootRef(pdfStr) {
    var match = pdfStr.match(/\/Root\s+(\d+)\s+(\d+)\s+R/);
    if (match) {
      return { objNum: parseInt(match[1]), genNum: parseInt(match[2]) };
    }
    return null;
  }

  /**
   * PDFの最大オブジェクト番号を取得
   */
  function findMaxObjNum(pdfStr) {
    var max = 0;
    var re = /(\d+)\s+\d+\s+obj/g;
    var match;
    while ((match = re.exec(pdfStr)) !== null) {
      var num = parseInt(match[1]);
      if (num > max) max = num;
    }
    return max;
  }

  // ===========================================================================
  //  ストリーム・文字列の暗号化
  // ===========================================================================

  /**
   * オブジェクトごとの暗号化キーを計算
   * encKey + objNum(3bytes LE) + genNum(2bytes LE) → MD5 → 先頭 min(keyLen+5, 16) bytes
   */
  function computeObjectKey(encKey, objNum, genNum) {
    var input = new Uint8Array(encKey.length + 5);
    input.set(encKey);
    input[encKey.length]     = objNum & 0xff;
    input[encKey.length + 1] = (objNum >> 8) & 0xff;
    input[encKey.length + 2] = (objNum >> 16) & 0xff;
    input[encKey.length + 3] = genNum & 0xff;
    input[encKey.length + 4] = (genNum >> 8) & 0xff;
    var hash = md5(input);
    // min(encKey.length + 5, 16) = min(5+5, 16) = 10
    return hash.subarray(0, Math.min(encKey.length + 5, 16));
  }

  /**
   * PDFバイト列内のstream...endstreamを暗号化
   * ストリームの内容をRC4で暗号化する
   */
  function encryptStreams(pdfStr, encKey) {
    // 各 N G obj ... stream\r\n...endstream を見つけて暗号化
    // 注意: 改行は \r\n or \n
    var result = pdfStr;
    var objPattern = /(\d+)\s+(\d+)\s+obj\b/g;
    var objects = [];
    var m;
    while ((m = objPattern.exec(pdfStr)) !== null) {
      objects.push({
        objNum: parseInt(m[1]),
        genNum: parseInt(m[2]),
        startIndex: m.index
      });
    }

    // オブジェクトごとにstream内容を暗号化（後方から処理して位置がずれないようにする）
    var replacements = [];

    for (var i = 0; i < objects.length; i++) {
      var obj = objects[i];
      var objEnd = (i + 1 < objects.length) ? objects[i + 1].startIndex : pdfStr.length;
      var objBody = pdfStr.substring(obj.startIndex, objEnd);

      // stream の位置を見つける
      var streamMatch = objBody.match(/stream(\r?\n)/);
      if (!streamMatch) continue;

      var streamStart = objBody.indexOf(streamMatch[0]) + streamMatch[0].length;
      var endStreamIdx = objBody.indexOf('endstream', streamStart);
      if (endStreamIdx === -1) continue;

      // stream内容をバイト列に変換
      var streamContent = objBody.substring(streamStart, endStreamIdx);
      // 末尾に\r\nまたは\nがある場合は除去（PDF仕様）
      if (streamContent.endsWith('\r\n')) {
        streamContent = streamContent.substring(0, streamContent.length - 2);
      } else if (streamContent.endsWith('\n')) {
        streamContent = streamContent.substring(0, streamContent.length - 1);
      }

      var streamBytes = strToBytes(streamContent);
      var objKey = computeObjectKey(encKey, obj.objNum, obj.genNum);
      var encrypted = rc4(objKey, streamBytes);
      var encryptedStr = bytesToStr(encrypted);

      // 置換情報を記録
      var absStreamStart = obj.startIndex + streamStart;
      var absStreamEnd = obj.startIndex + endStreamIdx;
      // 末尾改行の調整
      if (pdfStr.charAt(absStreamEnd - 1) === '\n') {
        if (pdfStr.charAt(absStreamEnd - 2) === '\r') {
          absStreamEnd -= 2;
        } else {
          absStreamEnd -= 1;
        }
      }

      replacements.push({
        start: absStreamStart,
        end: absStreamEnd,
        content: encryptedStr + '\n'
      });
    }

    // 後方から置換
    replacements.sort(function (a, b) { return b.start - a.start; });
    for (var r = 0; r < replacements.length; r++) {
      result = result.substring(0, replacements[r].start) +
               replacements[r].content +
               result.substring(replacements[r].end);
    }

    return result;
  }

  /**
   * PDF文字列リテラル (...) を暗号化
   * ()内の文字列をRC4で暗号化
   */
  function encryptStringLiterals(pdfStr, encKey) {
    var result = pdfStr;
    var objPattern = /(\d+)\s+(\d+)\s+obj\b/g;
    var objects = [];
    var m;
    while ((m = objPattern.exec(pdfStr)) !== null) {
      objects.push({
        objNum: parseInt(m[1]),
        genNum: parseInt(m[2]),
        startIndex: m.index
      });
    }

    var replacements = [];

    for (var i = 0; i < objects.length; i++) {
      var obj = objects[i];
      var objEnd = (i + 1 < objects.length) ? objects[i + 1].startIndex : pdfStr.length;
      var objBody = pdfStr.substring(obj.startIndex, objEnd);

      // streamセクション以外の文字列を暗号化
      var streamIdx = objBody.indexOf('stream');
      var searchEnd = streamIdx !== -1 ? streamIdx : objBody.length;
      var bodyToSearch = objBody.substring(0, searchEnd);

      // 括弧の対応を辿って文字列リテラルを見つける
      var strLiterals = findStringLiterals(bodyToSearch);

      for (var s = strLiterals.length - 1; s >= 0; s--) {
        var lit = strLiterals[s];
        var strBytes = decodePdfStringLiteral(lit.content);
        var objKey = computeObjectKey(encKey, obj.objNum, obj.genNum);
        var encrypted = rc4(objKey, strBytes);
        var hexStr = '<' + bytesToHex(encrypted) + '>';

        replacements.push({
          start: obj.startIndex + lit.start,
          end: obj.startIndex + lit.end,
          content: hexStr
        });
      }
    }

    // 後方から置換
    replacements.sort(function (a, b) { return b.start - a.start; });
    for (var r = 0; r < replacements.length; r++) {
      result = result.substring(0, replacements[r].start) +
               replacements[r].content +
               result.substring(replacements[r].end);
    }

    return result;
  }

  /**
   * PDF文字列リテラルの位置を検出
   * 括弧のネストとエスケープを考慮
   */
  function findStringLiterals(str) {
    var literals = [];
    var i = 0;
    while (i < str.length) {
      if (str[i] === '(') {
        var start = i;
        var depth = 1;
        i++;
        while (i < str.length && depth > 0) {
          if (str[i] === '\\') {
            i += 2; // エスケープをスキップ
            continue;
          }
          if (str[i] === '(') depth++;
          if (str[i] === ')') depth--;
          i++;
        }
        if (depth === 0) {
          literals.push({
            start: start,
            end: i,
            content: str.substring(start + 1, i - 1)
          });
        }
      } else {
        i++;
      }
    }
    return literals;
  }

  /**
   * PDF文字列リテラルをバイト配列にデコード
   * エスケープシーケンスを処理
   */
  function decodePdfStringLiteral(str) {
    var bytes = [];
    var i = 0;
    while (i < str.length) {
      if (str[i] === '\\') {
        i++;
        if (i >= str.length) break;
        switch (str[i]) {
          case 'n':  bytes.push(0x0a); i++; break;
          case 'r':  bytes.push(0x0d); i++; break;
          case 't':  bytes.push(0x09); i++; break;
          case 'b':  bytes.push(0x08); i++; break;
          case 'f':  bytes.push(0x0c); i++; break;
          case '(':  bytes.push(0x28); i++; break;
          case ')':  bytes.push(0x29); i++; break;
          case '\\': bytes.push(0x5c); i++; break;
          default:
            // 8進数エスケープ
            if (str[i] >= '0' && str[i] <= '7') {
              var oct = str[i]; i++;
              if (i < str.length && str[i] >= '0' && str[i] <= '7') { oct += str[i]; i++; }
              if (i < str.length && str[i] >= '0' && str[i] <= '7') { oct += str[i]; i++; }
              bytes.push(parseInt(oct, 8) & 0xff);
            } else {
              bytes.push(str.charCodeAt(i) & 0xff); i++;
            }
        }
      } else {
        bytes.push(str.charCodeAt(i) & 0xff);
        i++;
      }
    }
    return new Uint8Array(bytes);
  }

  // ===========================================================================
  //  メインの暗号化処理
  // ===========================================================================

  /**
   * PDFにパスワード保護を適用する
   * pdf-libで再保存した後、バイナリレベルで暗号化辞書を挿入し
   * ストリームと文字列リテラルをRC4で暗号化する
   */
  async function encryptPdf(pdfBytes, userPassword, ownerPassword, permissions) {
    // 1. pdf-libで読み込み・再保存（クリーンなPDFを得る）
    var pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
    var cleanBytes = await pdfDoc.save();

    // 2. バイト列を文字列として扱う
    var pdfStr = bytesToStr(new Uint8Array(cleanBytes));

    // 3. File IDを取得/生成
    var fileId = extractFileId(pdfStr);
    var fileIdHex = bytesToHex(fileId);

    // 4. 暗号化パラメータを計算
    var oValue = computeOwnerValue(ownerPassword, userPassword);
    var encKey = computeEncryptionKey(userPassword, oValue, permissions, fileId);
    var uValue = computeUserValue(encKey);

    // 5. ストリームと文字列を暗号化
    var encryptedPdf = encryptStreams(pdfStr, encKey);
    encryptedPdf = encryptStringLiterals(encryptedPdf, encKey);

    // 6. 新しいオブジェクト番号を取得
    var maxObj = findMaxObjNum(encryptedPdf);
    var encryptObjNum = maxObj + 1;

    // 7. /Encrypt辞書オブジェクトを作成
    var oHex = bytesToHex(oValue);
    var uHex = bytesToHex(uValue);

    var encryptObj =
      encryptObjNum + ' 0 obj\n' +
      '<< /Filter /Standard /V 1 /R 2 /Length 40\n' +
      '   /O <' + oHex + '>\n' +
      '   /U <' + uHex + '>\n' +
      '   /P ' + permissions + '\n' +
      '>>\n' +
      'endobj\n';

    // 8. trailer を修正して /Encrypt 参照と /ID を追加
    //    末尾のxref+trailerセクションを再構築する

    // startxref位置を取得
    var startXrefOffset = findStartXref(encryptedPdf);
    var eofIdx = findLastEof(encryptedPdf);

    // trailer辞書を見つける
    var trailerMatch = encryptedPdf.lastIndexOf('trailer');
    if (trailerMatch === -1) {
      // クロスリファレンスストリームの場合（pdf-libはこちらを使う可能性が高い）
      return encryptPdfWithXRefStream(encryptedPdf, encryptObj, encryptObjNum, fileIdHex, permissions, oValue, uValue, encKey);
    }

    // 従来のtrailer形式
    var trailerStr = encryptedPdf.substring(trailerMatch, eofIdx);

    // trailer辞書に /Encrypt と /ID を追加
    var newTrailer = trailerStr.replace(
      /trailer\s*<<\s*/,
      'trailer\n<< /Encrypt ' + encryptObjNum + ' 0 R /ID [<' + fileIdHex + '><' + fileIdHex + '>]\n   '
    );

    // 暗号化オブジェクトを挿入し、xrefを再構築
    var beforeTrailer = encryptedPdf.substring(0, trailerMatch);
    var encryptObjOffset = beforeTrailer.length;

    // 暗号化オブジェクトを追加
    var withEncrypt = beforeTrailer + encryptObj;
    var newXrefOffset = withEncrypt.length;

    // xref追記
    var xrefSection =
      'xref\n' +
      encryptObjNum + ' 1\n' +
      padXrefOffset(encryptObjOffset) + ' 00000 n \n';

    // 新しいtrailerを構築
    // /Size を更新
    var sizeMatch = trailerStr.match(/\/Size\s+(\d+)/);
    var newSize = sizeMatch ? Math.max(parseInt(sizeMatch[1]), encryptObjNum + 1) : encryptObjNum + 1;
    var rootRef = findRootRef(encryptedPdf);

    var finalTrailer =
      'trailer\n' +
      '<< /Size ' + newSize +
      ' /Root ' + rootRef.objNum + ' ' + rootRef.genNum + ' R' +
      ' /Encrypt ' + encryptObjNum + ' 0 R' +
      ' /ID [<' + fileIdHex + '><' + fileIdHex + '>]';

    // /Info があれば引き継ぐ
    var infoMatch = trailerStr.match(/\/Info\s+(\d+)\s+(\d+)\s+R/);
    if (infoMatch) {
      finalTrailer += ' /Info ' + infoMatch[1] + ' ' + infoMatch[2] + ' R';
    }

    // /Prev があれば設定（増分更新用）
    finalTrailer += ' /Prev ' + startXrefOffset;
    finalTrailer += ' >>\n';

    var result = withEncrypt + xrefSection + finalTrailer +
                 'startxref\n' + newXrefOffset + '\n%%EOF\n';

    return strToBytes(result);
  }

  /**
   * クロスリファレンスストリーム形式のPDFを暗号化する
   * pdf-libはxref streamを使うので、このケースが主になる
   */
  function encryptPdfWithXRefStream(pdfStr, encryptObj, encryptObjNum, fileIdHex, permissions, oValue, uValue, encKey) {
    // pdf-libが生成するxref streamを使ったPDFの場合
    // 増分更新（incremental update）でtrailerを追加する方式を使う

    var startXrefOffset = findStartXref(pdfStr);
    var rootRef = findRootRef(pdfStr);

    if (!rootRef) {
      throw new Error('PDF /Root参照が見つかりません');
    }

    // /Info参照を探す
    var infoMatch = pdfStr.match(/\/Info\s+(\d+)\s+(\d+)\s+R/);

    // /Sizeを探す
    var sizeMatch = pdfStr.match(/\/Size\s+(\d+)/);
    var currentSize = sizeMatch ? parseInt(sizeMatch[1]) : encryptObjNum;
    var newSize = Math.max(currentSize, encryptObjNum + 1);

    // 暗号化オブジェクトを元のPDFの末尾(%%EOF の後)に追加
    var encObjOffset = pdfStr.length;
    var withEncObj = pdfStr + '\n' + encryptObj;

    // xrefテーブル（増分更新）
    var xrefOffset = withEncObj.length;
    var xrefSection =
      'xref\n' +
      '0 1\n' +
      '0000000000 65535 f \n' +
      encryptObjNum + ' 1\n' +
      padXrefOffset(encObjOffset + 1) + ' 00000 n \n'; // +1 for \n

    // trailer
    var trailer =
      'trailer\n' +
      '<< /Size ' + newSize +
      ' /Root ' + rootRef.objNum + ' ' + rootRef.genNum + ' R' +
      ' /Encrypt ' + encryptObjNum + ' 0 R' +
      ' /ID [<' + fileIdHex + '><' + fileIdHex + '>]';

    if (infoMatch) {
      trailer += ' /Info ' + infoMatch[1] + ' ' + infoMatch[2] + ' R';
    }

    trailer += ' /Prev ' + startXrefOffset;
    trailer += ' >>\n';

    var result = withEncObj + xrefSection + trailer +
                 'startxref\n' + xrefOffset + '\n%%EOF\n';

    return strToBytes(result);
  }

  /**
   * xrefオフセットを10桁にゼロパディング
   */
  function padXrefOffset(offset) {
    var str = String(offset);
    while (str.length < 10) str = '0' + str;
    return str;
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
