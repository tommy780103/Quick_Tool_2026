/* ============================================
   ちょいツール — ルーティング・サイドバー制御
   ============================================ */

(function () {
  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.getElementById('menuToggle');
  const sidebarItems = document.querySelectorAll('.sidebar-item');
  const toolPanels = document.querySelectorAll('.tool-panel');

  // サイドバー開閉
  menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });

  // モバイル時：ツール選択でサイドバーを閉じる
  function closeSidebarOnMobile() {
    if (window.innerWidth <= 768) {
      sidebar.classList.add('collapsed');
    }
  }

  // ツール切り替え
  function activateTool(toolId) {
    // サイドバーのアクティブ状態
    sidebarItems.forEach((item) => {
      item.classList.toggle('active', item.dataset.tool === toolId);
    });

    // パネルの表示切り替え
    toolPanels.forEach((panel) => {
      panel.classList.toggle('active', panel.id === `tool-${toolId}`);
    });

    closeSidebarOnMobile();
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

  // ハッシュ変更時
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.slice(1);
    if (hash) activateTool(hash);
  });

  // 初期表示
  const initialHash = window.location.hash.slice(1) || 'image-convert';
  window.location.hash = initialHash;
  activateTool(initialHash);

  // PDF.js ワーカー設定
  if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  }
})();
