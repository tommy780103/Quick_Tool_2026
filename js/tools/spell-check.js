/* ============================================
   文章チェック（日本語ルールベース）
   ============================================ */
(function () {
  'use strict';

  var inputEl = document.getElementById('sc-input');
  var executeBtn = document.getElementById('sc-execute');
  var summaryEl = document.getElementById('sc-summary');
  var resultEl = document.getElementById('sc-result');
  var highlightedEl = document.getElementById('sc-highlighted');
  var issuesEl = document.getElementById('sc-issues');

  // ===== ルール定義 =====

  /** 重複表現 */
  var REDUNDANT = [
    ['まず最初に', '「まず」か「最初に」のどちらかで十分です', 'まず'],
    ['一番最初', '「最初」だけで十分です', '最初'],
    ['一番最後', '「最後」だけで十分です', '最後'],
    ['後で後悔', '「後悔」だけで十分です', '後悔'],
    ['頭痛が痛い', '「頭が痛い」か「頭痛がする」が適切です', '頭が痛い'],
    ['違和感を感じ', '「違和感がある」「違和感を覚える」が適切です', '違和感を覚え'],
    ['犯罪を犯す', '「罪を犯す」が適切です', '罪を犯す'],
    ['被害を被', '「被害を受ける」が適切です', '被害を受け'],
    ['返事を返す', '「返事をする」が適切です', '返事をする'],
    ['日本に来日', '「来日」だけで十分です', '来日'],
    ['約\\d+くらい', '「約」か「くらい」のどちらかで十分です', null],
    ['およそ\\d+くらい', '「およそ」か「くらい」のどちらかで十分です', null],
    ['必ず必要', '「必要」だけで十分です', '必要'],
    ['各それぞれ', '「各」か「それぞれ」のどちらかで十分です', 'それぞれ'],
    ['まだ未', '「まだ」か「未」のどちらかで十分です', null],
    ['最も最大', '「最大」だけで十分です', '最大'],
    ['元旦の朝', '「元旦」自体が1月1日の朝を意味します', '元旦'],
    ['過半数を超え', '「過半数に達し」が適切です', '過半数に達し'],
    ['思いがけないハプニング', '「ハプニング」だけで十分です', 'ハプニング'],
    ['あらかじめ予定', '「予定」だけで十分です', '予定'],
    ['炎天下の下', '「炎天下」だけで十分です', '炎天下で'],
    ['射程距離', '「射程」だけで十分です', '射程'],
  ];

  /** ら抜き言葉 */
  var RA_NUKI = [
    ['見れる', '見られる'],
    ['見れた', '見られた'],
    ['見れない', '見られない'],
    ['食べれる', '食べられる'],
    ['食べれた', '食べられた'],
    ['食べれない', '食べられない'],
    ['出れる', '出られる'],
    ['出れた', '出られた'],
    ['出れない', '出られない'],
    ['寝れる', '寝られる'],
    ['寝れた', '寝られた'],
    ['寝れない', '寝られない'],
    ['着れる', '着られる'],
    ['着れた', '着られた'],
    ['着れない', '着られない'],
    ['起きれる', '起きられる'],
    ['起きれた', '起きられた'],
    ['起きれない', '起きられない'],
    ['受けれる', '受けられる'],
    ['受けれた', '受けられた'],
    ['受けれない', '受けられない'],
    ['考えれる', '考えられる'],
    ['考えれた', '考えられた'],
    ['考えれない', '考えられない'],
    ['調べれる', '調べられる'],
    ['調べれた', '調べられた'],
    ['調べれない', '調べられない'],
    ['答えれる', '答えられる'],
    ['答えれた', '答えられた'],
    ['答えれない', '答えられない'],
    ['逃げれる', '逃げられる'],
    ['逃げれた', '逃げられた'],
    ['逃げれない', '逃げられない'],
    ['決めれる', '決められる'],
    ['決めれた', '決められた'],
    ['決めれない', '決められない'],
    ['入れれる', '入れられる'],
  ];

  /** い抜き言葉 */
  var I_NUKI = [
    ['してる', 'している'],
    ['見てる', '見ている'],
    ['食べてる', '食べている'],
    ['寝てる', '寝ている'],
    ['着てる', '着ている'],
    ['起きてる', '起きている'],
    ['出てる', '出ている'],
    ['知ってる', '知っている'],
    ['待ってる', '待っている'],
    ['持ってる', '持っている'],
    ['思ってる', '思っている'],
    ['言ってる', '言っている'],
    ['やってる', 'やっている'],
    ['なってる', 'なっている'],
    ['行ってる', '行っている'],
    ['来てる', '来ている'],
    ['考えてる', '考えている'],
    ['使ってる', '使っている'],
    ['走ってる', '走っている'],
    ['読んでる', '読んでいる'],
    ['遊んでる', '遊んでいる'],
    ['飲んでる', '飲んでいる'],
    ['住んでる', '住んでいる'],
  ];

  /** 表記ゆれペア（どちらかに統一すべき） */
  var NOTATION_PAIRS = [
    ['サーバ', 'サーバー'],
    ['プリンタ', 'プリンター'],
    ['コンピュータ', 'コンピューター'],
    ['ユーザ', 'ユーザー'],
    ['ブラウザ', 'ブラウザー'],
    ['フォルダ', 'フォルダー'],
    ['メーカ', 'メーカー'],
    ['ドライバ', 'ドライバー'],
    ['マネージャ', 'マネージャー'],
    ['アダプタ', 'アダプター'],
    ['プロバイダ', 'プロバイダー'],
    ['パラメタ', 'パラメータ'],
    ['パラメタ', 'パラメーター'],
    ['コンテナ', 'コンテナー'],
    ['できる', '出来る'],
    ['いただく', '頂く'],
    ['ください', '下さい'],
    ['すべて', '全て'],
    ['わかる', '分かる'],
  ];

  /** よくあるタイポ（打ち間違い） */
  var TYPO_PATTERNS = [
    // ございます
    ['ございあす', 'ございます'],
    ['ございむす', 'ございます'],
    ['ごさいます', 'ございます'],
    ['ござまいす', 'ございます'],
    ['ござます', 'ございます'],
    // いたします
    ['いたしあす', 'いたします'],
    ['いたしむす', 'いたします'],
    ['いたいsます', 'いたします'],
    // 致します
    ['致しあす', '致します'],
    // お願いします
    ['お願いしあす', 'お願いします'],
    ['おねがいしあす', 'お願いします'],
    ['お願いしむす', 'お願いします'],
    // 思います
    ['思いあす', '思います'],
    ['おもいあす', '思います'],
    // なります
    ['なりあす', 'なります'],
    ['なりむす', 'なります'],
    // おります
    ['おりあす', 'おります'],
    // まいります・参ります
    ['まいりあす', 'まいります'],
    ['参りあす', '参ります'],
    // 存じます
    ['存じあす', '存じます'],
    // 頂きます・いただきます
    ['頂きあす', '頂きます'],
    ['いただきあす', 'いただきます'],
    // 申します
    ['申しあす', '申します'],
    ['もうしあす', '申します'],
    // ありがとう
    ['ありがうとう', 'ありがとう'],
    ['ありがいとう', 'ありがとう'],
    ['ありがおとう', 'ありがとう'],
    ['ありあgtう', 'ありがとう'],
    // おはようございます
    ['おはようございあす', 'おはようございます'],
    ['おはよございます', 'おはようございます'],
    // よろしく
    ['よろいしく', 'よろしく'],
    ['よしろく', 'よろしく'],
    ['よろすく', 'よろしく'],
    // ください
    ['くだいさ', 'ください'],
    ['くだいさい', 'ください'],
    // お疲れ様
    ['おつかれさまdす', 'お疲れ様です'],
    ['お疲れさあmです', 'お疲れ様です'],
    // 承知
    ['しょちう', '承知'],
    // ありません
    ['ありあせん', 'ありません'],
    ['ありまえん', 'ありません'],
    // ました
    ['まいした', 'ました'],
    ['ましあ', 'ました'],
    // です
    ['でうす', 'です'],
    ['でsう', 'です'],
  ];

  /** 誤りやすい表現 */
  var COMMON_ERRORS = [
    { pattern: 'つまづく', msg: '「つまずく」が正しい表記です', suggest: 'つまずく', level: 'error' },
    { pattern: 'づつ', msg: '「ずつ」が正しい表記です', suggest: 'ずつ', level: 'error' },
    { pattern: 'いずれにしろ', msg: '「いずれにせよ」が適切です', suggest: 'いずれにせよ', level: 'warning' },
    { pattern: 'すいません', msg: '「すみません」が正しい表記です', suggest: 'すみません', level: 'error' },
    { pattern: 'うる覚え', msg: '「うろ覚え」が正しい表記です', suggest: 'うろ覚え', level: 'error' },
    { pattern: 'おもむろに', msg: '「おもむろに」は「ゆっくりと」の意味です。「急に」の意味で使っていませんか？', suggest: null, level: 'info' },
    { pattern: '敷居が高い', msg: '本来の意味は「不義理で相手に合わせる顔がない」です。「ハードルが高い」の意味で使っていませんか？', suggest: null, level: 'info' },
    { pattern: '役不足', msg: '「実力に対して役目が軽すぎる」の意味です。「力不足」と混同していませんか？', suggest: null, level: 'info' },
    { pattern: '確信犯', msg: '本来は「信念に基づいて行う犯罪」の意味です。「故意犯」と混同していませんか？', suggest: null, level: 'info' },
    { pattern: '煮詰まる', msg: '「十分に議論が出尽くした」の意味です。「行き詰まる」と混同していませんか？', suggest: null, level: 'info' },
    { pattern: '姑息', msg: '本来の意味は「一時しのぎ」です。「卑怯」の意味で使っていませんか？', suggest: null, level: 'info' },
  ];

  // ===== チェックロジック =====

  var escapeHtml = ChoiTool.escapeHTML;

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function runCheck(text) {
    var issues = [];

    // 1. 重複表現
    REDUNDANT.forEach(function (r) {
      var regex = new RegExp(r[0], 'g');
      var m;
      while ((m = regex.exec(text)) !== null) {
        issues.push({
          start: m.index,
          end: m.index + m[0].length,
          matched: m[0],
          msg: r[1],
          suggest: r[2],
          level: 'warning',
          category: '重複表現',
        });
      }
    });

    // 2. ら抜き言葉
    RA_NUKI.forEach(function (pair) {
      var regex = new RegExp(escapeRegExp(pair[0]), 'g');
      var m;
      while ((m = regex.exec(text)) !== null) {
        issues.push({
          start: m.index,
          end: m.index + m[0].length,
          matched: m[0],
          msg: 'ら抜き言葉です',
          suggest: pair[1],
          level: 'warning',
          category: 'ら抜き言葉',
        });
      }
    });

    // 3. い抜き言葉
    I_NUKI.forEach(function (pair) {
      var regex = new RegExp(escapeRegExp(pair[0]), 'g');
      var m;
      while ((m = regex.exec(text)) !== null) {
        issues.push({
          start: m.index,
          end: m.index + m[0].length,
          matched: m[0],
          msg: 'い抜き言葉です（口語的）',
          suggest: pair[1],
          level: 'info',
          category: 'い抜き言葉',
        });
      }
    });

    // 4. 誤りやすい表現
    COMMON_ERRORS.forEach(function (rule) {
      var regex = new RegExp(escapeRegExp(rule.pattern), 'g');
      var m;
      while ((m = regex.exec(text)) !== null) {
        issues.push({
          start: m.index,
          end: m.index + m[0].length,
          matched: m[0],
          msg: rule.msg,
          suggest: rule.suggest,
          level: rule.level,
          category: '誤用・誤字',
        });
      }
    });

    // 5. よくあるタイポ
    TYPO_PATTERNS.forEach(function (pair) {
      var regex = new RegExp(escapeRegExp(pair[0]), 'g');
      var m;
      while ((m = regex.exec(text)) !== null) {
        issues.push({
          start: m.index,
          end: m.index + m[0].length,
          matched: m[0],
          msg: '「' + pair[1] + '」の打ち間違いの可能性があります',
          suggest: pair[1],
          level: 'error',
          category: 'タイポ',
        });
      }
    });

    // 6. 助詞の連続（同じ助詞が1文内で3回以上）
    var sentences = text.split(/[。！？\!\?\n]+/);
    var sentenceOffset = 0;
    sentences.forEach(function (sentence) {
      if (!sentence) {
        sentenceOffset += 1;
        return;
      }
      var particles = ['が', 'の', 'を', 'に', 'で', 'は'];
      particles.forEach(function (p) {
        var regex = new RegExp(escapeRegExp(p), 'g');
        var positions = [];
        var m;
        while ((m = regex.exec(sentence)) !== null) {
          positions.push(m.index);
        }
        if (positions.length >= 3) {
          // 文頭の位置を特定
          var sIdx = text.indexOf(sentence, sentenceOffset);
          if (sIdx !== -1) {
            issues.push({
              start: sIdx,
              end: sIdx + sentence.length,
              matched: sentence.length > 40 ? sentence.substring(0, 40) + '...' : sentence,
              msg: '「' + p + '」が1文に' + positions.length + '回使われています。読みにくくなる可能性があります',
              suggest: null,
              level: 'info',
              category: '助詞の重複',
            });
          }
        }
      });
      sentenceOffset = text.indexOf(sentence, sentenceOffset) + sentence.length;
    });

    // 6. 「の」の3連続以上
    var noRegex = /([^。！？\!\?\n]*の[^。！？の\!\?\n]*の[^。！？の\!\?\n]*の)/g;
    var noMatch;
    while ((noMatch = noRegex.exec(text)) !== null) {
      issues.push({
        start: noMatch.index,
        end: noMatch.index + noMatch[0].length,
        matched: noMatch[0].length > 40 ? noMatch[0].substring(0, 40) + '...' : noMatch[0],
        msg: '「の」が連続しています。言い換えを検討してください',
        suggest: null,
        level: 'info',
        category: '助詞の連続',
      });
    }

    // 7. 一文が長すぎる（80文字超）
    var longSentences = text.split(/[。\n]+/);
    var lsOffset = 0;
    longSentences.forEach(function (s) {
      var trimmed = s.trim();
      if (trimmed.length > 80) {
        var sIdx = text.indexOf(trimmed, lsOffset);
        if (sIdx !== -1) {
          issues.push({
            start: sIdx,
            end: sIdx + trimmed.length,
            matched: trimmed.substring(0, 30) + '...',
            msg: '一文が' + trimmed.length + '文字あります。読みやすさのため分割を検討してください',
            suggest: null,
            level: 'info',
            category: '長い文',
          });
        }
      }
      lsOffset = text.indexOf(s, lsOffset) + s.length;
    });

    // 8. 同じ文末の連続（3回以上）
    var endSentences = text.split(/[。]+/).filter(function (s) { return s.trim().length > 0; });
    if (endSentences.length >= 3) {
      for (var ei = 0; ei <= endSentences.length - 3; ei++) {
        var ends = [];
        for (var ej = 0; ej < 3; ej++) {
          var s = endSentences[ei + ej].trim();
          var ending = s.slice(-4);
          ends.push(ending);
        }
        if (ends[0] === ends[1] && ends[1] === ends[2] && ends[0].length > 0) {
          var refText = endSentences[ei + 2].trim();
          var refIdx = text.indexOf(refText);
          if (refIdx !== -1) {
            issues.push({
              start: refIdx,
              end: refIdx + refText.length,
              matched: '...「' + ends[0] + '。」が3回連続',
              msg: '同じ文末表現が3回以上連続しています。単調に感じられます',
              suggest: null,
              level: 'info',
              category: '文末の繰り返し',
            });
          }
        }
      }
    }

    // 9. 表記ゆれ検出
    NOTATION_PAIRS.forEach(function (pair) {
      var hasA = text.indexOf(pair[0]) !== -1;
      var hasB = text.indexOf(pair[1]) !== -1;
      if (hasA && hasB) {
        // 短い方の出現箇所を指摘
        var shorter = pair[0].length <= pair[1].length ? pair[0] : pair[1];
        var longer = pair[0].length <= pair[1].length ? pair[1] : pair[0];
        var regex = new RegExp(escapeRegExp(shorter), 'g');
        var m;
        while ((m = regex.exec(text)) !== null) {
          // 長い方の部分文字列でないか確認
          var before = text.substring(Math.max(0, m.index - 2), m.index + shorter.length + 2);
          if (before.indexOf(longer) !== -1) continue;
          issues.push({
            start: m.index,
            end: m.index + shorter.length,
            matched: shorter,
            msg: '「' + pair[0] + '」と「' + pair[1] + '」が混在しています。表記を統一してください',
            suggest: null,
            level: 'warning',
            category: '表記ゆれ',
          });
        }
      }
    });

    // 10. 全角英数字
    var zenRegex = /[Ａ-Ｚａ-ｚ０-９]{2,}/g;
    var zenMatch;
    while ((zenMatch = zenRegex.exec(text)) !== null) {
      var halfWidth = zenMatch[0].replace(/[Ａ-Ｚａ-ｚ０-９]/g, function (c) {
        return String.fromCharCode(c.charCodeAt(0) - 0xFEE0);
      });
      issues.push({
        start: zenMatch.index,
        end: zenMatch.index + zenMatch[0].length,
        matched: zenMatch[0],
        msg: '全角英数字が使われています',
        suggest: halfWidth,
        level: 'info',
        category: '全角英数字',
      });
    }

    // 重複除去（同じ start,end を持つissueは先に見つかったもの優先）
    issues.sort(function (a, b) { return a.start - b.start || a.end - b.end; });
    var seen = {};
    issues = issues.filter(function (issue) {
      var key = issue.start + ':' + issue.end;
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });

    return issues;
  }

  // ===== 表示 =====

  function renderHighlighted(text, issues) {
    if (issues.length === 0) {
      highlightedEl.innerHTML = '<div style="text-align:center;padding:24px;color:var(--color-text-secondary)">問題は見つかりませんでした</div>';
      return;
    }

    // 位置でソート
    var sorted = issues.slice().sort(function (a, b) { return a.start - b.start; });
    var html = '';
    var cursor = 0;

    sorted.forEach(function (issue, idx) {
      // 重なりを避ける
      if (issue.start < cursor) return;

      if (issue.start > cursor) {
        html += escapeHtml(text.substring(cursor, issue.start));
      }

      var cls = 'sc-mark sc-mark-' + issue.level;
      var tip = issue.category + ': ' + issue.msg;
      html += '<span class="' + cls + '" data-idx="' + idx + '" data-tip="' + ChoiTool.escapeAttr(tip) + '">';
      html += escapeHtml(text.substring(issue.start, issue.end));
      html += '</span>';
      cursor = issue.end;
    });

    if (cursor < text.length) {
      html += escapeHtml(text.substring(cursor));
    }

    highlightedEl.innerHTML = html;

    // クリックでissueリストの該当項目へスクロール
    highlightedEl.querySelectorAll('.sc-mark').forEach(function (mark) {
      mark.addEventListener('click', function () {
        var idx = mark.dataset.idx;
        var target = issuesEl.querySelector('[data-idx="' + idx + '"]');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.style.outline = '2px solid var(--color-primary)';
          setTimeout(function () { target.style.outline = ''; }, 1500);
        }
      });
    });
  }

  function renderIssues(issues) {
    issuesEl.innerHTML = '';
    if (issues.length === 0) return;

    issues.forEach(function (issue, idx) {
      var badgeCls = 'sc-issue-badge sc-issue-badge-' + issue.level;
      var levelLabel = issue.level === 'error' ? '誤り' : (issue.level === 'warning' ? '注意' : '情報');

      var html = '<div class="' + badgeCls + '">' + levelLabel + '</div>';
      html += '<div class="sc-issue-body">';
      html += '<div class="sc-issue-text">「' + escapeHtml(issue.matched) + '」<small style="color:var(--color-text-secondary);font-weight:400;margin-left:6px">' + escapeHtml(issue.category) + '</small></div>';
      html += '<div class="sc-issue-msg">' + escapeHtml(issue.msg) + '</div>';
      if (issue.suggest) {
        html += '<div class="sc-issue-suggest">→ ' + escapeHtml(issue.suggest) + '</div>';
      }
      html += '</div>';

      var item = document.createElement('div');
      item.className = 'sc-issue';
      item.dataset.idx = idx;
      item.innerHTML = html;

      // クリックでハイライトへスクロール
      item.addEventListener('click', function () {
        var mark = highlightedEl.querySelector('[data-idx="' + idx + '"]');
        if (mark) {
          mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
          mark.style.outline = '2px solid var(--color-primary)';
          setTimeout(function () { mark.style.outline = ''; }, 1500);
        }
      });

      issuesEl.appendChild(item);
    });
  }

  // ===== 実行 =====

  executeBtn.addEventListener('click', function () {
    var text = inputEl.value;
    if (!text.trim()) {
      ChoiTool.showToast('テキストを入力してください', 'error');
      return;
    }

    var issues = runCheck(text);

    var errors = issues.filter(function (i) { return i.level === 'error'; }).length;
    var warnings = issues.filter(function (i) { return i.level === 'warning'; }).length;
    var infos = issues.filter(function (i) { return i.level === 'info'; }).length;

    if (issues.length === 0) {
      summaryEl.textContent = '問題は見つかりませんでした';
    } else {
      var parts = [];
      if (errors > 0) parts.push('誤り ' + errors + '件');
      if (warnings > 0) parts.push('注意 ' + warnings + '件');
      if (infos > 0) parts.push('情報 ' + infos + '件');
      summaryEl.textContent = parts.join(' / ');
    }

    renderHighlighted(text, issues);
    renderIssues(issues);
    resultEl.style.display = '';

    if (issues.length === 0) {
      ChoiTool.showToast('問題は見つかりませんでした', 'success');
    } else {
      ChoiTool.showToast(issues.length + ' 件の指摘があります', 'info');
    }
  });
})();
