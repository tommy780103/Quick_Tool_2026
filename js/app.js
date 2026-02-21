/* ============================================
   ちょいツール — ルーティング・サイドバー制御
   ============================================ */

(function () {
  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.getElementById('menuToggle');
  const sidebarItems = document.querySelectorAll('.sidebar-item');
  const toolPanels = document.querySelectorAll('.tool-panel');
  const overlay = document.getElementById('sidebarOverlay');
  const headerTitleLink = document.getElementById('headerTitleLink');

  // ホーム画面のカードリンク
  const homeCards = document.querySelectorAll('.home-card');

  // サイドバー開閉
  menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    updateOverlay();
  });

  // モバイルオーバーレイ：外側タップで閉じる
  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.add('collapsed');
      updateOverlay();
    });
  }

  function updateOverlay() {
    if (!overlay) return;
    const isMobile = window.innerWidth <= 768;
    const isOpen = !sidebar.classList.contains('collapsed');
    overlay.classList.toggle('active', isMobile && isOpen);
  }

  // モバイル時：ツール選択でサイドバーを閉じる
  function closeSidebarOnMobile() {
    if (window.innerWidth <= 768) {
      sidebar.classList.add('collapsed');
      updateOverlay();
    }
  }

  // --- カテゴリ折りたたみ ---
  const sidebarGroups = document.querySelectorAll('.sidebar-group');
  sidebarGroups.forEach((group) => {
    const cat = group.querySelector('.sidebar-category');
    if (!cat) return; // ホームのグループはスキップ
    cat.addEventListener('click', () => {
      group.classList.toggle('open');
    });
  });

  /** アクティブツールを含むカテゴリを開く */
  function openCategoryForTool(toolId) {
    sidebarGroups.forEach((group) => {
      const items = group.querySelectorAll('.sidebar-item');
      items.forEach((item) => {
        if (item.dataset.tool === toolId) {
          group.classList.add('open');
        }
      });
    });
  }

  // ツール切り替え
  function activateTool(toolId) {
    // サイドバーのアクティブ状態
    sidebarItems.forEach((item) => {
      item.classList.toggle('active', item.dataset.tool === toolId);
    });

    // パネルの表示切り替え
    toolPanels.forEach((panel) => {
      const panelId = panel.id === 'tool-home' ? 'home' : panel.id.replace('tool-', '');
      panel.classList.toggle('active', panelId === toolId);
    });

    // アクティブツールのカテゴリを自動展開
    openCategoryForTool(toolId);

    closeSidebarOnMobile();

    // フォーカス管理：ツールタイトルにフォーカス移動
    requestAnimationFrame(() => {
      const activePanel = document.getElementById(
        toolId === 'home' ? 'tool-home' : 'tool-' + toolId
      );
      if (activePanel) {
        const title = activePanel.querySelector('.tool-title, .home-title');
        if (title) {
          title.focus({ preventScroll: false });
        }
      }
    });
  }

  // サイドバーのクリックイベント
  sidebarItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const toolId = item.dataset.tool;
      window.location.hash = toolId;
      activateTool(toolId);
    });
  });

  // ホーム画面カードのクリックイベント
  homeCards.forEach((card) => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      const toolId = card.dataset.tool;
      window.location.hash = toolId;
      activateTool(toolId);
    });
  });

  // ヘッダータイトルクリックでホームに戻る
  if (headerTitleLink) {
    headerTitleLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.hash = 'home';
      activateTool('home');
    });
  }

  // ハッシュ変更時
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.slice(1);
    if (hash) activateTool(hash);
  });

  // 初期表示：ハッシュがなければホーム画面
  const initialHash = window.location.hash.slice(1) || 'home';
  window.location.hash = initialHash;
  activateTool(initialHash);

  // ウィンドウリサイズ時にオーバーレイ状態を更新
  window.addEventListener('resize', () => {
    updateOverlay();
  });

  // PDF.js ワーカー設定
  if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  }
})();
