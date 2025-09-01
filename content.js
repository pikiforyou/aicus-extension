// aicus - 채팅 네비게이터 (완전 새 버전)
class AicusNavigator {
  constructor() {
    this.isVisible = false;
    this.isMinimized = false;
    this.isCollapsed = false;
    this.showSettings = false;
    this.shadowRoot = null;
    this.container = null;
    this.observer = null;
    this.questions = [];
    this.previewTooltip = null;
    this.donationModal = null;
    
    // 설정값
    this.settings = {
      accentColor: '#BCBAE6',
      theme: 'auto'
    };
    
    // 색상 팔레트
    this.colorPalette = [
      { name: 'Lavender', color: '#BCBAE6' },
      { name: 'Blue', color: '#3b82f6' },
      { name: 'Mint Green', color: '#AFE6AC' },
      { name: 'Sky Blue', color: '#C3E9DB' },
      { name: 'Soft Yellow', color: '#F0F0B1' },
      { name: 'Baby Pink', color: '#EEC2C5' },
      { name: 'Lilac', color: '#E0A0E6' },
      { name: 'Peach Fuzz', color: '#FFBE98' },
      { name: 'Soft Coral', color: '#FF9999' },
      { name: 'Sage Green', color: '#B2D3B2' },
      { name: 'Powder Blue', color: '#B8D4E3' },
      { name: 'Cream', color: '#F5F5DC' },
      { name: 'Viva Magenta', color: '#BE3455' },
      { name: 'Electric Blue', color: '#0066CC' },
      { name: 'Vibrant Orange', color: '#FF5722' },
      { name: 'Emerald Green', color: '#00A86B' },
      { name: 'Italian Plum', color: '#5D4E75' },
      { name: 'Living Coral', color: '#FF6F61' }
    ];
    
    this.init();
  }

  init() {
    this.createShadowDOM();
    this.setupMutationObserver();
    this.scanForQuestions();
    this.show();
    
    // 다크모드 변경 감지
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => this.updateTheme());
  }

  createShadowDOM() {
    this.container = document.createElement('div');
    this.container.id = 'aicus-navigator';
    this.container.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    this.shadowRoot = this.container.attachShadow({ mode: 'closed' });
    
    const style = document.createElement('style');
    style.textContent = `
      :host {
        all: initial;
        color-scheme: light;
      }
      
      * {
        box-sizing: border-box;
      }
      
      .navigator {
        width: 320px;
        max-height: 80vh;
        background: #ffffff;
        border: 1px solid #e5e5e5;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        font-family: inherit;
        font-size: 14px;
        line-height: 1.5;
        color: #333333;
        transition: all 0.3s ease;
        overflow: hidden;
        isolation: isolate;
      }

      .navigator.dark {
        background: #1f1f1f;
        border-color: #404040;
        color: #ffffff;
      }

      .navigator.minimized {
        width: 60px !important;
        height: 60px !important;
        max-height: 60px !important;
        overflow: hidden !important;
      }

      .header {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        background: var(--header-bg);
        border-bottom: 1px solid var(--border-color);
        cursor: move;
        user-select: none;
      }

      .dark .header {
        background: var(--header-bg-dark);
        border-bottom-color: var(--border-color-dark);
      }

      .title {
        flex: 1;
        font-weight: 600;
        font-size: 14px;
        color: #333;
        margin-left: 8px;
        cursor: pointer;
      }

      .dark .title {
        color: #e2e8f0;
      }

      .controls {
        display: flex;
        gap: 4px;
      }

      .control-btn {
        width: 24px;
        height: 24px;
        border: none;
        background: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: background 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #444;
      }

      .dark .control-btn {
        color: #e2e8f0;
      }

      .control-btn:hover {
        background: rgba(0, 0, 0, 0.1);
      }

      .dark .control-btn:hover {
        background: rgba(255, 255, 255, 0.15);
      }

      .main-icon {
        cursor: pointer !important;
      }

      .content {
        max-height: 300px;
        overflow-y: hidden;
        padding: 8px 0;
      }

      .content.scrollable {
        overflow-y: auto;
      }

      .navigator.show-settings .content {
        max-height: 250px;
      }

      .navigator.collapsed .content {
        display: none;
      }

      .content::-webkit-scrollbar {
        width: 6px;
      }

      .content::-webkit-scrollbar-track {
        background: transparent;
      }

      .content::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 3px;
      }

      .dark .content::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
      }

      .question-item {
        padding: 12px 16px;
        border-bottom: 1px solid var(--border-color);
        cursor: pointer;
        transition: all 0.2s ease;
        background: transparent;
      }

      .dark .question-item {
        border-bottom-color: var(--border-color-dark);
      }

      .question-item:hover {
        background: var(--hover-bg);
        transform: translateX(2px);
      }

      .dark .question-item:hover {
        background: var(--hover-bg-dark);
      }

      .question-text {
        font-size: 13px;
        line-height: 1.4;
        color: #333;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .dark .question-text {
        color: #e2e8f0;
      }

      .empty-state {
        padding: 32px 16px;
        text-align: center;
        color: #888;
        font-size: 13px;
      }

      .minimized-icon {
        display: none;
        width: 100%;
        height: 100%;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }

      .navigator.minimized .header,
      .navigator.minimized .content,
      .navigator.minimized .resize-handle,
      .navigator.minimized .settings-panel {
        display: none;
      }

      .navigator.minimized .minimized-icon {
        display: flex;
      }

      .settings-panel {
        display: none;
        padding: 16px;
        padding-bottom: 6px;
        border-bottom: 1px solid var(--border-color);
        background: var(--settings-bg);
      }

      .dark .settings-panel {
        border-bottom-color: var(--border-color-dark);
        background: var(--settings-bg-dark);
      }

      .navigator.show-settings .settings-panel {
        display: block;
      }

      .settings-title {
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 12px;
        color: #333;
      }

      .dark .settings-title {
        color: #e2e8f0;
      }

      .color-palette {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 6px;
        margin-bottom: 12px;
      }

      .color-option {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        cursor: pointer;
        border: 2px solid transparent;
        transition: all 0.2s ease;
        position: relative;
      }

      .color-option:hover {
        transform: scale(1.1);
      }

      .color-option.selected {
        border-color: #fff;
        box-shadow: 0 0 0 2px var(--accent-color);
      }

      .color-option.selected::after {
        content: '✓';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        font-size: 12px;
        font-weight: bold;
        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
      }

      .coffee-section {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid var(--border-color);
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
        border-radius: 4px;
        padding: 6px 8px;
      }

      .coffee-section:hover {
        background: var(--hover-bg);
      }

      .dark .coffee-section {
        border-top-color: var(--border-color-dark);
      }

      .dark .coffee-section:hover {
        background: var(--hover-bg-dark);
      }

      .coffee-emoji {
        font-size: 14px;
        flex-shrink: 0;
      }

      .coffee-text {
        font-size: 10px;
        color: #666;
        opacity: 0;
        transform: translateX(-10px);
        transition: all 0.3s ease;
        white-space: nowrap;
      }

      .dark .coffee-text {
        color: #a0a0a0;
      }

      .coffee-section:hover .coffee-text {
        opacity: 1;
        transform: translateX(0);
      }

      .resize-handle {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 16px;
        height: 16px;
        cursor: nw-resize;
        background: linear-gradient(-45deg, transparent 30%, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.1) 70%, transparent 70%);
      }

      .dark .resize-handle {
        background: linear-gradient(-45deg, transparent 30%, rgba(255,255,255,0.1) 30%, rgba(255,255,255,0.1) 70%, transparent 70%);
      }

      .preview-tooltip {
        position: absolute;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 12px;
        line-height: 1.4;
        max-width: 300px;
        word-wrap: break-word;
        z-index: 10001;
        pointer-events: none;
        opacity: 0;
        transform: translateY(-5px);
        transition: all 0.2s ease;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        white-space: pre-wrap;
      }

      .preview-tooltip.show {
        opacity: 1;
        transform: translateY(0);
      }

      .dark .preview-tooltip {
        background: rgba(255, 255, 255, 0.95);
        color: #333;
      }
    `;

    this.shadowRoot.appendChild(style);
    document.body.appendChild(this.container);

    this.createNavigatorHTML();
    this.setupEventListeners();
    this.createPreviewTooltip();
  }

  createNavigatorHTML() {
    const navigator = document.createElement('div');
    navigator.className = 'navigator';
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      navigator.classList.add('dark');
    }

    navigator.innerHTML = `
      <div class="minimized-icon">
        <svg viewBox="0 0 64 64" width="32" height="32">
          <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" stroke-width="6"/>
          <path fill="var(--accent-color, #BCBAE6)" d="M32 10l5.5 12.8L50 28.5 37.2 34 32 50 26.8 34 14 28.5l12.5-5.7L32 10z"/>
          <path fill="currentColor" d="M36 20 44 34 28 44z"/>
          <circle cx="32" cy="32" r="3" fill="currentColor"/>
        </svg>
      </div>
      <div class="header">
        <svg class="main-icon" viewBox="0 0 64 64" width="20" height="20" title="최소화/복원">
          <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" stroke-width="6"/>
          <path fill="var(--accent-color, #BCBAE6)" d="M32 10l5.5 12.8L50 28.5 37.2 34 32 50 26.8 34 14 28.5l12.5-5.7L32 10z"/>
          <path fill="currentColor" d="M36 20 44 34 28 44z"/>
          <circle cx="32" cy="32" r="3" fill="currentColor"/>
        </svg>
        <span class="title">Aicus</span>
        <div class="controls">
          <button class="control-btn settings-btn" title="설정">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2.5a1.5 1.5 0 011.5 1.5v.5c.494.227.965.497 1.405.806l.353-.353a1.5 1.5 0 112.122 2.122l-.353.353c.309.44.579.911.806 1.405h.5a1.5 1.5 0 010 3h-.5a7.5 7.5 0 01-.806 1.405l.353.353a1.5 1.5 0 11-2.122 2.122l-.353-.353A7.5 7.5 0 0111.5 15.5v.5a1.5 1.5 0 01-3 0v-.5a7.5 7.5 0 01-1.405-.806l-.353.353a1.5 1.5 0 11-2.122-2.122l.353-.353A7.5 7.5 0 014.167 11.5h-.5a1.5 1.5 0 010-3h.5c.227-.494.497-.965.806-1.405L4.62 6.742a1.5 1.5 0 112.122-2.122l.353.353c.44-.309.911-.579 1.405-.806V4a1.5 1.5 0 011.5-1.5zM10 7a3 3 0 100 6 3 3 0 000-6z"/>
            </svg>
          </button>
          <button class="control-btn collapse-btn" title="접기/펼치기">−</button>
          <button class="control-btn close-btn" title="닫기">×</button>
        </div>
      </div>
      <div class="settings-panel">
        <div class="settings-title">테마 색상</div>
        <div class="color-palette"></div>
        <div class="coffee-section">
          <span class="coffee-emoji">☕</span>
          <span class="coffee-text">개발자에게 커피 한잔 사주기!</span>
        </div>
      </div>
      <div class="content">
        <div class="empty-state">질문을 찾는 중...</div>
      </div>
      <div class="resize-handle"></div>
    `;

    this.shadowRoot.appendChild(navigator);
    this.updateColorPalette();
    this.applyColorScheme();
    
    setTimeout(() => this.updateContentHeight(), 0);
  }

  createPreviewTooltip() {
    this.previewTooltip = document.createElement('div');
    this.previewTooltip.className = 'preview-tooltip';
    this.shadowRoot.appendChild(this.previewTooltip);
  }

  setupEventListeners() {
    const navigator = this.shadowRoot.querySelector('.navigator');
    const header = this.shadowRoot.querySelector('.header');
    const minimizedIcon = this.shadowRoot.querySelector('.minimized-icon');
    const mainIcon = this.shadowRoot.querySelector('.main-icon');
    const title = this.shadowRoot.querySelector('.title');
    const settingsBtn = this.shadowRoot.querySelector('.settings-btn');
    const collapseBtn = this.shadowRoot.querySelector('.collapse-btn');
    const closeBtn = this.shadowRoot.querySelector('.close-btn');
    const resizeHandle = this.shadowRoot.querySelector('.resize-handle');
    const coffeeSection = this.shadowRoot.querySelector('.coffee-section');

    // 커피 섹션 클릭
    if (coffeeSection) {
      coffeeSection.addEventListener('click', () => this.showDonationModal());
    }

    // 드래그 변수
    let isDragging = false;
    let dragMoved = false;
    let startX, startY, startLeft, startTop;

    // 드래그 시작
    const startDrag = (e) => {
      if (e.target.closest('.controls') || e.target.closest('.resize-handle') || 
          e.target.closest('.main-icon') || e.target.closest('.title')) return;
      
      isDragging = true;
      dragMoved = false;
      startX = e.clientX;
      startY = e.clientY;
      const rect = this.container.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      
      document.addEventListener('mousemove', drag);
      document.addEventListener('mouseup', stopDrag);
      e.preventDefault();
    };

    // 드래그 중
    const drag = (e) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        dragMoved = true;
      }
      
      const containerWidth = this.isMinimized ? 60 : 320;
      const newLeft = Math.max(0, Math.min(window.innerWidth - containerWidth, startLeft + deltaX));
      const newTop = Math.max(0, Math.min(window.innerHeight - 100, startTop + deltaY));
      
      this.container.style.left = newLeft + 'px';
      this.container.style.top = newTop + 'px';
      this.container.style.right = 'auto';
    };

    // 드래그 종료
    const stopDrag = () => {
      isDragging = false;
      document.removeEventListener('mousemove', drag);
      document.removeEventListener('mouseup', stopDrag);
    };

    header.addEventListener('mousedown', startDrag);

    // 리사이즈 기능
    let isResizing = false;
    let startWidth, startHeight;

    const startResize = (e) => {
      isResizing = true;
      startWidth = navigator.offsetWidth;
      startHeight = navigator.offsetHeight;
      startX = e.clientX;
      startY = e.clientY;
      
      document.addEventListener('mousemove', resize);
      document.addEventListener('mouseup', stopResize);
      e.preventDefault();
      e.stopPropagation();
    };

    const resize = (e) => {
      if (!isResizing) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      const newWidth = Math.max(250, Math.min(500, startWidth + deltaX));
      const newHeight = Math.max(200, Math.min(window.innerHeight * 0.8, startHeight + deltaY));
      
      navigator.style.width = newWidth + 'px';
      navigator.style.maxHeight = newHeight + 'px';
      
      this.updateContentHeight();
    };

    const stopResize = () => {
      isResizing = false;
      document.removeEventListener('mousemove', resize);
      document.removeEventListener('mouseup', stopResize);
    };

    resizeHandle.addEventListener('mousedown', startResize);

    // 아이콘/타이틀 클릭 - 최소화/복원
    mainIcon.addEventListener('click', (e) => {
      this.toggleMinimize();
      e.preventDefault();
      e.stopPropagation();
    });

    title.addEventListener('click', (e) => {
      this.toggleMinimize();
      e.preventDefault();
      e.stopPropagation();
    });

    // 최소화 아이콘 클릭
    minimizedIcon.addEventListener('click', (e) => {
      if (!dragMoved) {
        this.toggleMinimize();
      }
      e.preventDefault();
    });

    // 최소화 아이콘 드래그
    minimizedIcon.addEventListener('mousedown', (e) => {
      isDragging = true;
      dragMoved = false;
      startX = e.clientX;
      startY = e.clientY;
      const rect = this.container.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      
      document.addEventListener('mousemove', drag);
      document.addEventListener('mouseup', stopDrag);
      e.preventDefault();
    });

    // 컨트롤 버튼들
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleSettings();
    });
    
    collapseBtn.addEventListener('click', () => this.toggleCollapse());
    closeBtn.addEventListener('click', () => this.hide());
  }

  setupMutationObserver() {
    this.observer = new MutationObserver((mutations) => {
      let shouldRescan = false;
      
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          shouldRescan = true;
        }
      });

      if (shouldRescan) {
        clearTimeout(this.rescanTimeout);
        this.rescanTimeout = setTimeout(() => this.scanForQuestions(), 500);
      }
    });

    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  scanForQuestions() {
    let userMessages = [];

    if (window.location.hostname.includes('openai.com') || window.location.hostname.includes('chatgpt.com')) {
      userMessages = Array.from(document.querySelectorAll('[data-message-author-role="user"]'));
    } else if (window.location.hostname.includes('claude.ai')) {
      userMessages = Array.from(document.querySelectorAll('[data-testid="user-message"]'));
    } else if (window.location.hostname.includes('gemini.google.com') || window.location.hostname.includes('bard.google.com')) {
      const root = document.querySelector('main[role="main"]') || document.body;
      const bubbles = Array.from(root.querySelectorAll('.user-query-bubble-with-background'));
      userMessages = bubbles.map(bubble =>
        bubble.querySelector('.query-text-line, .query-text.gds-body-l, [id^="user-query-content-"] > span') || bubble
      );
      userMessages = Array.from(new Set(userMessages));
    }

    // 위→아래 정렬
    userMessages.sort((a, b) => {
      const rectA = a.getBoundingClientRect();
      const rectB = b.getBoundingClientRect();
      
      if (Math.abs(rectA.top - rectB.top) > 10) {
        return rectA.top - rectB.top;
      }
      
      const position = a.compareDocumentPosition(b);
      return (position & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1;
    });

    // 텍스트 추출
    const questions = [];
    userMessages.forEach((container, index) => {
      let text = '';
      
      if (window.location.hostname.includes('claude.ai')) {
        const pElement = container.querySelector('p.whitespace-pre-wrap');
        text = pElement ? pElement.textContent?.trim() : container.textContent?.trim();
      } else if (window.location.hostname.includes('openai.com') || window.location.hostname.includes('chatgpt.com')) {
        text = container.textContent?.trim();
      } else if (window.location.hostname.includes('gemini.google.com') || window.location.hostname.includes('bard.google.com')) {
        text = container.textContent?.trim();
        if (!text) {
          const textElements = container.querySelectorAll('p, div, span');
          text = Array.from(textElements)
            .map(el => el.textContent?.trim())
            .filter(t => t && t.length > 5)
            .join(' ');
        }
      }

      if (text && text.length > 3 && text.length < 10000) {      
        questions.push({
          text: text,
          fullText: text,
          element: container,
          index: index + 1
        });
      }
    });

    this.questions = questions;
    this.updateQuestionsList();
  }

  updateQuestionsList() {
    const content = this.shadowRoot.querySelector('.content');
    
    if (this.questions.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <div>질문을 찾을 수 없습니다.</div>
        </div>
      `;
      return;
    }

    const questionsHTML = this.questions.map(question => `
      <div class="question-item" data-index="${question.index}" data-full-text="${this.escapeHtml(question.fullText)}">
        <div class="question-text">${this.escapeHtml(question.text.substring(0, 100))}${question.text.length > 100 ? '...' : ''}</div>
      </div>
    `).join('');

    content.innerHTML = questionsHTML;

    // 이벤트 추가
    content.querySelectorAll('.question-item').forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index);
        const question = this.questions.find(q => q.index === index);
        if (question && question.element) {
          this.scrollToQuestion(question.element);
        }
      });

      item.addEventListener('mouseenter', (e) => this.showPreview(e, item));
      item.addEventListener('mouseleave', () => this.hidePreview());
      item.addEventListener('mousemove', (e) => this.updatePreviewPosition(e));
    });
    
    this.checkScrollNeed();
  }

  showPreview(e, item) {
    const fullText = item.dataset.fullText;
    if (!fullText || fullText.length <= 80) return;

    this.previewTooltip.textContent = fullText;
    this.previewTooltip.classList.add('show');
    this.updatePreviewPosition(e);
  }

  hidePreview() {
    this.previewTooltip.classList.remove('show');
  }

  updatePreviewPosition(e) {
    if (!this.previewTooltip.classList.contains('show')) return;

    const rect = this.container.getBoundingClientRect();
    const tooltipRect = this.previewTooltip.getBoundingClientRect();
    
    let left = e.clientX - rect.left + 10;
    let top = e.clientY - rect.top - tooltipRect.height - 10;

    if (left + tooltipRect.width > rect.width) {
      left = e.clientX - rect.left - tooltipRect.width - 10;
    }
    
    if (top < 0) {
      top = e.clientY - rect.top + 10;
    }

    this.previewTooltip.style.left = left + 'px';
    this.previewTooltip.style.top = top + 'px';
  }

  scrollToQuestion(element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    this.highlightElement(element);
  }

  highlightElement(element) {
    document.querySelectorAll('.aicus-highlight').forEach(el => {
      el.classList.remove('aicus-highlight');
    });

    element.classList.add('aicus-highlight');

    if (!document.getElementById('aicus-highlight-style')) {
      const style = document.createElement('style');
      style.id = 'aicus-highlight-style';
      style.textContent = `
        .aicus-highlight {
          background: rgba(255, 235, 59, 0.3) !important;
          border-radius: 4px !important;
          transition: background 0.5s ease !important;
        }
      `;
      document.head.appendChild(style);
    }

    setTimeout(() => {
      element.classList.remove('aicus-highlight');
    }, 3000);
  }

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    const navigator = this.shadowRoot.querySelector('.navigator');
    const collapseBtn = this.shadowRoot.querySelector('.collapse-btn');
    
    if (this.isCollapsed) {
      navigator.classList.add('collapsed');
      collapseBtn.textContent = '+';
      collapseBtn.title = '펼치기';
    } else {
      navigator.classList.remove('collapsed');
      collapseBtn.textContent = '−';
      collapseBtn.title = '접기';
    }
  }

  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    const navigator = this.shadowRoot.querySelector('.navigator');
    
    if (this.isMinimized) {
      this.savedStyles = {
        width: navigator.style.width,
        maxHeight: navigator.style.maxHeight
      };
      
      navigator.classList.add('minimized');
      this.container.style.width = '60px';
      this.container.style.height = '60px';
      
      const currentRight = parseInt(this.container.style.right) || 20;
      this.container.style.right = currentRight + 'px';
      this.container.style.left = 'auto';
      
      this.showSettings = false;
      navigator.classList.remove('show-settings');
      this.hidePreview();
    } else {
      navigator.classList.remove('minimized');
      
      this.container.style.width = 'auto';
      this.container.style.height = 'auto';
      
      const currentRight = parseInt(this.container.style.right) || 20;
      this.container.style.right = currentRight + 'px';
      this.container.style.left = 'auto';
      
      if (this.savedStyles) {
        navigator.style.width = this.savedStyles.width || '320px';
        navigator.style.maxHeight = this.savedStyles.maxHeight || '80vh';
        
        setTimeout(() => this.updateContentHeight(), 0);
      }
    }
  }

  toggleSettings() {
    this.showSettings = !this.showSettings;
    const navigator = this.shadowRoot.querySelector('.navigator');
    
    if (this.showSettings) {
      navigator.classList.add('show-settings');
    } else {
      navigator.classList.remove('show-settings');
    }
    
    setTimeout(() => this.updateContentHeight(), 0);
  }

  updateContentHeight() {
    const navigator = this.shadowRoot.querySelector('.navigator');
    const content = this.shadowRoot.querySelector('.content');
    const header = this.shadowRoot.querySelector('.header');
    const settingsPanel = this.shadowRoot.querySelector('.settings-panel');
    
    if (!navigator || !content || !header) return;
    
    const navigatorMaxHeight = parseInt(navigator.style.maxHeight) || parseInt(getComputedStyle(navigator).maxHeight) || 500;
    const headerHeight = header.offsetHeight;
    const settingsHeight = this.showSettings && settingsPanel ? settingsPanel.offsetHeight : 0;
    const resizeHandleHeight = 16;
    const padding = 20;
    
    const availableHeight = navigatorMaxHeight - headerHeight - settingsHeight - resizeHandleHeight - padding;
    const finalHeight = Math.max(100, availableHeight);
    content.style.maxHeight = finalHeight + 'px';
    
    this.checkScrollNeed();
  }

  checkScrollNeed() {
    const content = this.shadowRoot.querySelector('.content');
    if (!content) return;
    
    setTimeout(() => {
      const contentHeight = content.scrollHeight;
      const maxHeight = parseInt(content.style.maxHeight) || 300;
      
      if (contentHeight > maxHeight) {
        content.classList.add('scrollable');
      } else {
        content.classList.remove('scrollable');
      }
    }, 0);
  }

  updateColorPalette() {
    const colorPalette = this.shadowRoot.querySelector('.color-palette');
    
    colorPalette.innerHTML = this.colorPalette.map(color => `
      <div class="color-option ${color.color === this.settings.accentColor ? 'selected' : ''}" 
           style="background-color: ${color.color};" 
           data-color="${color.color}"
           title="${color.name}">
      </div>
    `).join('');

    colorPalette.addEventListener('click', (e) => {
      if (e.target.classList.contains('color-option')) {
        const newColor = e.target.dataset.color;
        this.settings.accentColor = newColor;
        this.applyColorScheme();
        this.updateColorPalette();
      }
    });
  }

  applyColorScheme() {
    const navigator = this.shadowRoot.querySelector('.navigator');
    navigator.style.setProperty('--accent-color', this.settings.accentColor);
    
    const accentRgb = this.hexToRgb(this.settings.accentColor);
    
    // 사용자 지정 투명도
    const headerBg = this.blendWithWhite(accentRgb, 0.10);      
    const borderColor = this.blendWithWhite(accentRgb, 0.3);     
    const settingsBg = this.blendWithWhite(accentRgb, 0.08);    
    const hoverBg = this.blendWithWhite(accentRgb, 0.25);       
    
    // 다크모드용
    const headerBgDark = this.blendWithBlack(accentRgb, 0.2);   
    const borderColorDark = this.blendWithBlack(accentRgb, 0.5); 
    const settingsBgDark = this.blendWithBlack(accentRgb, 0.15); 
    const hoverBgDark = this.blendWithBlack(accentRgb, 0.3);    
    
    navigator.style.setProperty('--header-bg', headerBg);
    navigator.style.setProperty('--border-color', borderColor);
    navigator.style.setProperty('--settings-bg', settingsBg);
    navigator.style.setProperty('--hover-bg', hoverBg);
    
    navigator.style.setProperty('--header-bg-dark', headerBgDark);
    navigator.style.setProperty('--border-color-dark', borderColorDark);
    navigator.style.setProperty('--settings-bg-dark', settingsBgDark);
    navigator.style.setProperty('--hover-bg-dark', hoverBgDark);
    
    this.updateTheme();
  }

  updateTheme() {
    const navigator = this.shadowRoot.querySelector('.navigator');
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (isDark) {
      navigator.classList.add('dark');
    } else {
      navigator.classList.remove('dark');
    }
  }

  blendWithWhite(rgb, alpha) {
    const r = Math.round(rgb.r * alpha + 255 * (1 - alpha));
    const g = Math.round(rgb.g * alpha + 255 * (1 - alpha));
    const b = Math.round(rgb.b * alpha + 255 * (1 - alpha));
    return `rgb(${r}, ${g}, ${b})`;
  }

  blendWithBlack(rgb, alpha) {
    const r = Math.round(rgb.r * alpha);
    const g = Math.round(rgb.g * alpha);
    const b = Math.round(rgb.b * alpha);
    return `rgb(${r}, ${g}, ${b})`;
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 188, g: 186, b: 230 };
  }

  createDonationModal() {
    // 기존 모달 제거
    const existingModal = document.getElementById('aicus-donation-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'aicus-donation-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.6);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 999999;
      backdrop-filter: blur(4px);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    modal.innerHTML = `
      <div id="modal-content" style="
        background: white;
        border-radius: 16px;
        padding: 24px;
        max-width: 320px;
        width: 90%;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        transform: scale(0.9);
        transition: transform 0.2s ease;
        position: relative;
      ">
        <button class="close-modal-btn" style="
          position: absolute;
          top: 16px;
          right: 16px;
          width: 24px;
          height: 24px;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 18px;
          color: #999;
        ">×</button>
        
        <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px; color: #333;">
          프로그램이 유용했다면<br>개발자를 응원해주세요!
        </div>
        
        <div style="font-size: 14px; color: #666; margin-bottom: 20px;">
          QR코드를 스캔해서 후원할 수 있어요
        </div>
        
        <div style="display: flex; gap: 8px; margin-bottom: 20px; justify-content: center;">
          <button class="korean-btn" style="
            padding: 8px 16px;
            border: 2px solid ${this.settings.accentColor};
            border-radius: 8px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            background: ${this.settings.accentColor};
            color: white;
            transition: all 0.2s ease;
          ">Korean</button>
          
          <button class="international-btn" style="
            padding: 8px 16px;
            border: 2px solid ${this.settings.accentColor};
            border-radius: 8px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            background: white;
            color: ${this.settings.accentColor};
            transition: all 0.2s ease;
          ">International</button>
        </div>
        
        <div style="
          width: 160px;
          height: 160px;
          margin: 0 auto 20px auto;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          background: #f0f0f0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
          font-size: 12px;
        ">
          <img class="qr-image" src="${chrome.runtime ? chrome.runtime.getURL('docs/daram-qr.png') : 'docs/daram-qr.png'}" 
               alt="후원 QR코드" 
               style="width: 100%; height: 100%; object-fit: cover;"
               onerror="this.style.display='none'; this.parentElement.innerHTML='QR 코드를 불러올 수 없습니다';">
        </div>
        
        <div style="display: flex; gap: 12px; margin-top: 20px;">
          <button class="feedback-btn" style="
            flex: 1;
            padding: 10px 16px;
            border: none;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            background: #f0f0f0;
            color: #333;
            transition: all 0.2s ease;
          ">피드백 보내주기</button>
          
          <button class="close-btn" style="
            flex: 1;
            padding: 10px 16px;
            border: none;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            background: ${this.settings.accentColor};
            color: white;
            transition: all 0.2s ease;
          ">닫기</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // 모든 이벤트 리스너 설정
    const koreanBtn = modal.querySelector('.korean-btn');
    const internationalBtn = modal.querySelector('.international-btn');
    const qrImage = modal.querySelector('.qr-image');
    const closeModalBtn = modal.querySelector('.close-modal-btn');
    const feedbackBtn = modal.querySelector('.feedback-btn');
    const closeBtnMain = modal.querySelector('.close-btn');
    
    // QR 코드 전환 기능
    koreanBtn.addEventListener('click', () => {
      koreanBtn.style.background = this.settings.accentColor;
      koreanBtn.style.color = 'white';
      internationalBtn.style.background = 'white';
      internationalBtn.style.color = this.settings.accentColor;
      
      qrImage.src = chrome.runtime ? chrome.runtime.getURL('docs/daram-qr.png') : 'docs/daram-qr.png';
      qrImage.alt = '토스 후원 QR코드';
    });
    
    internationalBtn.addEventListener('click', () => {
      internationalBtn.style.background = this.settings.accentColor;
      internationalBtn.style.color = 'white';
      koreanBtn.style.background = 'white';
      koreanBtn.style.color = this.settings.accentColor;
      
      qrImage.src = chrome.runtime ? chrome.runtime.getURL('docs/coffee-qr.png') : 'docs/coffee-qr.png';
      qrImage.alt = 'Buy Me a Coffee QR코드';
    });
    
    // 닫기 버튼들
    closeModalBtn.addEventListener('click', () => this.hideDonationModal());
    closeBtnMain.addEventListener('click', () => this.hideDonationModal());
    
    // 피드백 버튼
    feedbackBtn.addEventListener('click', () => this.sendFeedback());
    
    // 모달 외부 클릭시 닫기
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.hideDonationModal();
      }
    });
    
    this.donationModal = modal;
  }

  showDonationModal() {
    if (!this.donationModal) {
      this.createDonationModal();
    }
    
    this.donationModal.style.display = 'flex';
    setTimeout(() => {
      const content = this.donationModal.querySelector('#modal-content');
      if (content) {
        content.style.transform = 'scale(1)';
      }
    }, 10);
  }

  hideDonationModal() {
    if (this.donationModal) {
      const content = this.donationModal.querySelector('#modal-content');
      if (content) {
        content.style.transform = 'scale(0.9)';
      }
      
      setTimeout(() => {
        this.donationModal.style.display = 'none';
      }, 200);
    }
  }

  sendFeedback() {
    const subject = encodeURIComponent('Aicus 확장 프로그램 피드백');
    const body = encodeURIComponent('안녕하세요!\n\nAicus 확장 프로그램에 대한 피드백을 보내드립니다.\n\n피드백 내용:\n- \n\n감사합니다!');
    const mailtoLink = `mailto:pikiforyou@gmail.com?subject=${subject}&body=${body}`;
    
    window.open(mailtoLink);
    this.hideDonationModal();
  }

  show() {
    if (this.container) {
      this.container.style.display = 'block';
      this.isVisible = true;
    }
  }

  hide() {
    if (this.container) {
      this.container.style.display = 'none';
      this.isVisible = false;
      this.hidePreview();
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.container) {
      this.container.remove();
    }
    if (this.donationModal) {
      this.donationModal.remove();
    }
    if (this.rescanTimeout) {
      clearTimeout(this.rescanTimeout);
    }
  }
}

// 전역 변수로 초기화
let aicusNavigator = null;

function initAicus() {
  if (aicusNavigator) {
    aicusNavigator.destroy();
  }
  
  aicusNavigator = new AicusNavigator();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAicus);
} else {
  initAicus();
}

window.addEventListener('beforeunload', () => {
  if (aicusNavigator) {
    aicusNavigator.destroy();
  }
});