// aicus - 채팅 네비게이터 (최종 완성 버전)
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
    
    // 설정값
    this.settings = {
      accentColor: '#BCBAE6', // Lavender 기본값
      theme: 'auto'
    };
    
    // 팬톤 파스텔 + 비비드 컬러 팔레트 (18개)
    this.colorPalette = [
      // 파스텔 색상
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
      // 비비드 색상
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
  }

  createShadowDOM() {
    // Shadow DOM 컨테이너 생성
    this.container = document.createElement('div');
    this.container.id = 'aicus-navigator';
    this.container.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Shadow DOM 생성
    this.shadowRoot = this.container.attachShadow({ mode: 'closed' });
    
    // 스타일 생성
    const style = document.createElement('style');
    style.textContent = `
      :host {
        all: initial;
      }
      
      .navigator {
        width: 320px;
        max-height: 80vh;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        transition: all 0.3s ease;
        overflow: hidden;
        transform-origin: top right;
      }

      .navigator.dark {
        background: rgba(30, 30, 30, 0.95);
        border-color: rgba(255, 255, 255, 0.1);
        color: #fff;
      }

      .navigator.minimized {
        width: 60px !important;
        height: 60px !important;
        max-height: 60px !important;
        overflow: hidden !important;
        transform-origin: top right;
      }

      .header {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        background: var(--header-bg, rgba(0, 0, 0, 0.05));
        border-bottom: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
        cursor: move;
        user-select: none;
      }

      .dark .header {
        background: var(--header-bg, rgba(255, 255, 255, 0.05));
        border-bottom-color: var(--border-color, rgba(255, 255, 255, 0.1));
      }

      .title {
        flex: 1;
        font-weight: 600;
        font-size: 14px;
        color: #333;
        margin-left: 8px;
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

      .main-icon, .title {
        cursor: pointer !important;
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

      .content {
        max-height: calc(80vh - 120px);
        overflow-y: auto;
        padding: 8px 0;
      }

      .navigator.show-settings .content {
        max-height: calc(80vh - 200px);
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
        transition: background 0.2s ease;
      }

      .content::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 0, 0, 0.3);
      }

      .dark .content::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
      }

      .dark .content::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      .question-item {
        padding: 12px 16px;
        border-bottom: 1px solid var(--border-color, rgba(0, 0, 0, 0.05));
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
        margin-bottom: 2px;
      }

      .dark .question-item {
        border-bottom-color: var(--border-color, rgba(255, 255, 255, 0.05));
      }

      .question-item:hover {
        background: var(--hover-bg, rgba(0, 0, 0, 0.05)) !important;
        transform: translateX(2px);
      }

      .dark .question-item:hover {
        background: var(--hover-bg, rgba(255, 255, 255, 0.05)) !important;
      }

      .question-text {
        font-size: 13px;
        line-height: 1.4;
        color: #333;
        padding: 4px 0;
        word-wrap: break-word;
        overflow-wrap: break-word;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
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
        font-size: 24px;
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

      .navigator.collapsed .content {
        display: none;
      }

      .settings-panel {
        display: none;
        padding: 16px;
        border-bottom: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
        background: var(--settings-bg, rgba(0, 0, 0, 0.02));
      }

      .dark .settings-panel {
        border-bottom-color: var(--border-color, rgba(255, 255, 255, 0.1));
        background: var(--settings-bg, rgba(255, 255, 255, 0.02));
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
        margin-bottom: 16px;
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
        border-color: rgba(255, 255, 255, 0.5);
      }

      .color-option.selected {
        border-color: #fff;
        box-shadow: 0 0 0 2px var(--accent-color, #BCBAE6);
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

      /* 호버 미리보기 툴팁 */
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
        box-shadow: 0 4px 20px rgba(255, 255, 255, 0.1);
      }

      @media (prefers-color-scheme: dark) {
        .navigator {
          background: rgba(30, 30, 30, 0.95);
          border-color: rgba(255, 255, 255, 0.1);
          color: #fff;
        }
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
        <svg class="aicus-icon" viewBox="0 0 64 64" width="32" height="32" aria-hidden="true">
          <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" stroke-width="6"/>
          <path fill="var(--accent-color, #BCBAE6)" d="M32 10l5.5 12.8L50 28.5 37.2 34 32 50 26.8 34 14 28.5l12.5-5.7L32 10z"/>
          <path fill="currentColor" d="M36 20 44 34 28 44z"/>
          <circle cx="32" cy="32" r="3" fill="currentColor"/>
          <circle cx="18.5" cy="24.5" r="2" fill="currentColor"/>
          <circle cx="45.5" cy="39.5" r="2" fill="currentColor"/>
        </svg>
      </div>
      <div class="header">
        <svg class="aicus-icon main-icon" viewBox="0 0 64 64" width="20" height="20" aria-hidden="true" title="최소화/복원">
          <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" stroke-width="6"/>
          <path fill="var(--accent-color, #BCBAE6)" d="M32 10l5.5 12.8L50 28.5 37.2 34 32 50 26.8 34 14 28.5l12.5-5.7L32 10z"/>
          <path fill="currentColor" d="M36 20 44 34 28 44z"/>
          <circle cx="32" cy="32" r="3" fill="currentColor"/>
          <circle cx="18.5" cy="24.5" r="2" fill="currentColor"/>
          <circle cx="45.5" cy="39.5" r="2" fill="currentColor"/>
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
      </div>
      <div class="content">
        <div class="empty-state">질문을 찾는 중...</div>
      </div>
      <div class="resize-handle"></div>
    `;

    this.shadowRoot.appendChild(navigator);
    this.updateColorPalette();
    this.applyColorScheme();
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
    const settingsBtn = this.shadowRoot.querySelector('.settings-btn');
    const collapseBtn = this.shadowRoot.querySelector('.collapse-btn');
    const closeBtn = this.shadowRoot.querySelector('.close-btn');
    const resizeHandle = this.shadowRoot.querySelector('.resize-handle');

    // 드래그 기능
    let isDragging = false;
    let dragMoved = false;
    let startX, startY, startLeft, startTop;

    const startDrag = (e) => {
      // 메인 아이콘, 타이틀, 컨트롤 버튼은 드래그에서 제외
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
      
      navigator.style.width = Math.max(250, Math.min(500, startWidth + deltaX)) + 'px';
      navigator.style.maxHeight = Math.max(200, Math.min(window.innerHeight * 0.9, startHeight + deltaY)) + 'px';
    };

    const stopResize = () => {
      isResizing = false;
      document.removeEventListener('mousemove', resize);
      document.removeEventListener('mouseup', stopResize);
    };

    resizeHandle.addEventListener('mousedown', startResize);

    // 메인 아이콘과 타이틀 클릭 - 최소화/복원
    const titleElement = this.shadowRoot.querySelector('.title');
    
    mainIcon.addEventListener('click', (e) => {
      this.toggleMinimize();
      e.preventDefault();
      e.stopPropagation();
    });

    titleElement.addEventListener('click', (e) => {
      this.toggleMinimize();
      e.preventDefault();
      e.stopPropagation();
    });

    // 최소화된 아이콘 - 드래그와 클릭 구분
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

    minimizedIcon.addEventListener('click', (e) => {
      if (!dragMoved) {
        this.toggleMinimize();
      }
      e.preventDefault();
      e.stopPropagation();
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
    const config = {
      childList: true,
      subtree: true,
      attributes: false
    };

    this.observer = new MutationObserver((mutations) => {
      let shouldRescan = false;
      
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          shouldRescan = true;
        }
      });

      if (shouldRescan) {
        clearTimeout(this.rescanTimeout);
        this.rescanTimeout = setTimeout(() => {
          this.scanForQuestions();
        }, 500);
      }
    });

    this.observer.observe(document.body, config);
  }

  scanForQuestions() {
    let userMessages = [];

    // 사이트별로 사용자 메시지 컨테이너만 찾기
    if (window.location.hostname.includes('openai.com') || window.location.hostname.includes('chatgpt.com')) {
      userMessages = Array.from(document.querySelectorAll('[data-message-author-role="user"]'));
    } else if (window.location.hostname.includes('claude.ai')) {
      userMessages = Array.from(document.querySelectorAll('[data-testid="user-message"]'));
    } else if (window.location.hostname.includes('gemini.google.com') || window.location.hostname.includes('bard.google.com')) {
      const root =
        document.querySelector('main[role="main"]') ||
        document.querySelector('[aria-label="Chat history"]') ||
        document.body;
    
      const bubbles = Array.from(root.querySelectorAll('.user-query-bubble-with-background'));

      userMessages = bubbles.map(bubble =>
        bubble.querySelector('.query-text-line, .query-text.gds-body-l, [id^="user-query-content-"] > span') || bubble
      );

      userMessages = Array.from(new Set(userMessages));
    }

    // 위→아래 순서로 정렬
    userMessages.sort((a, b) => {
      const rectA = a.getBoundingClientRect();
      const rectB = b.getBoundingClientRect();
      
      if (Math.abs(rectA.top - rectB.top) > 10) {
        return rectA.top - rectB.top;
      }
      
      const position = a.compareDocumentPosition(b);
      return (position & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1;
    });

    // 각 사용자 메시지에서 텍스트 추출
    const questions = [];
    userMessages.forEach((container, index) => {
      let text = '';
      
      if (window.location.hostname.includes('claude.ai')) {
        const pElement = container.querySelector('p.whitespace-pre-wrap');
        if (pElement) {
          text = pElement.textContent?.trim() || '';
        } else {
          text = container.textContent?.trim() || '';
        }
      } else if (window.location.hostname.includes('openai.com') || window.location.hostname.includes('chatgpt.com')) {
        text = container.textContent?.trim() || '';
      } else if (window.location.hostname.includes('gemini.google.com') || window.location.hostname.includes('bard.google.com')) {
        // Gemini/Bard 텍스트 추출
        text = container.textContent?.trim() || '';
        
        // 추가적으로 내부 텍스트 요소들도 확인
        const textElements = container.querySelectorAll('p, div, span');
        if (!text && textElements.length > 0) {
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
          <div style="margin-bottom: 8px;">질문을 찾을 수 없습니다.</div>
          <div style="font-size: 11px; color: #999;">
            문제가 계속되면 문의주세요
            <a href="mailto:pikiforyou@gmail.com">pikiforyou@gmail.com</a>
          </div>
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

    // 클릭 이벤트 및 호버 이벤트 추가
    content.querySelectorAll('.question-item').forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index);
        const question = this.questions.find(q => q.index === index);
        if (question && question.element) {
          this.scrollToQuestion(question.element);
        }
      });

      // 호버 미리보기
      item.addEventListener('mouseenter', (e) => this.showPreview(e, item));
      item.addEventListener('mouseleave', () => this.hidePreview());
      item.addEventListener('mousemove', (e) => this.updatePreviewPosition(e));
    });
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
    element.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center',
      inline: 'nearest'
    });

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
      // 현재 스타일 저장
      this.savedStyles = {
        width: navigator.style.width,
        height: navigator.style.height,
        maxHeight: navigator.style.maxHeight
      };
      
      // 최소화: 네비게이터와 컨테이너 모두 60px로 강제 변경
      navigator.classList.add('minimized');
      this.container.style.width = '60px';
      this.container.style.height = '60px';
      
      // 오른쪽 위치 유지
      const currentRight = parseInt(this.container.style.right) || 20;
      this.container.style.right = currentRight + 'px';
      this.container.style.left = 'auto';
      
      this.showSettings = false;
      navigator.classList.remove('show-settings');
      this.hidePreview();
    } else {
      // 복원: 저장된 스타일 복구
      navigator.classList.remove('minimized');
      
      // 컨테이너 크기 복구
      this.container.style.width = 'auto';
      this.container.style.height = 'auto';
      
      // 오른쪽 위치 유지하면서 복원
      const currentRight = parseInt(this.container.style.right) || 20;
      this.container.style.right = currentRight + 'px';
      this.container.style.left = 'auto';
      
      if (this.savedStyles) {
        navigator.style.width = this.savedStyles.width || '320px';
        navigator.style.height = this.savedStyles.height || '';
        navigator.style.maxHeight = this.savedStyles.maxHeight || '80vh';
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
    const headerBg = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.08)`;
    const borderColor = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.15)`;
    const settingsBg = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.05)`;
    const hoverBg = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.15)`;
    
    navigator.style.setProperty('--header-bg', headerBg);
    navigator.style.setProperty('--border-color', borderColor);
    navigator.style.setProperty('--settings-bg', settingsBg);
    navigator.style.setProperty('--hover-bg', hoverBg);
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 188, g: 186, b: 230 }; // 라벤더 기본값
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
    if (this.rescanTimeout) {
      clearTimeout(this.rescanTimeout);
    }
  }
}

// 확장 프로그램 초기화
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