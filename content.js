// aicus - 채팅 네비게이터 (플로팅 + 호버 미리보기)
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
    
    // 설정값 (로컬 스토리지 대신 메모리에 저장)
    this.settings = {
      accentColor: '#BCBAE6', // Lavender로 기본값 변경
      theme: 'auto' // auto, light, dark
    };
    
    // 팬톤 파스텔 + 쨍한 컬러 팔레트 (12개 파스텔 + 6개 비비드)
    this.colorPalette = [
      // 파스텔 색상 (기존)
      { name: 'Lavender', color: '#BCBAE6' }, // 기본값으로 이동
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
      // 쨍한 비비드 색상 (팬톤 2024-2025 트렌드)
      { name: 'Viva Magenta', color: '#BE3455' }, // 2023 올해의 색상
      { name: 'Electric Blue', color: '#0066CC' }, // 일렉트릭 블루
      { name: 'Vibrant Orange', color: '#FF5722' }, // 레드 오렌지
      { name: 'Emerald Green', color: '#00A86B' }, // 에메랄드
      { name: 'Italian Plum', color: '#5D4E75' }, // 이탈리안 플럼
      { name: 'Living Coral', color: '#FF6F61' } // 리빙 코랄
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
        transform-origin: top right; /* 오른쪽 위를 기준으로 변형 */
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
        transform-origin: top right; /* 최소화 시에도 오른쪽 위 기준 */
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
        max-height: calc(80vh - 60px);
        overflow-y: auto;
        padding: 8px 0;
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
        box-shadow: 0 0 0 2px var(--accent-color, #3b82f6);
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
        <svg class="aicus-icon settings-btn" viewBox="0 0 64 64" width="20" height="20" aria-hidden="true" style="cursor: pointer;" title="설정">
          <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" stroke-width="6"/>
          <path fill="var(--accent-color, #BCBAE6)" d="M32 10l5.5 12.8L50 28.5 37.2 34 32 50 26.8 34 14 28.5l12.5-5.7L32 10z"/>
          <path fill="currentColor" d="M36 20 44 34 28 44z"/>
          <circle cx="32" cy="32" r="3" fill="currentColor"/>
          <circle cx="18.5" cy="24.5" r="2" fill="currentColor"/>
          <circle cx="45.5" cy="39.5" r="2" fill="currentColor"/>
        </svg>
        <span class="title">Aicus</span>
        <div class="controls">
          <button class="control-btn collapse-btn" title="접기/펼치기">−</button>
          <button class="control-btn minimize-btn" title="최소화">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <rect x="2" y="2" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
              <line x1="2" y1="5" x2="10" y2="5" stroke="currentColor" stroke-width="1.5"/>
            </svg>
          </button>
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
    const collapseBtn = this.shadowRoot.querySelector('.collapse-btn');
    const minimizeBtn = this.shadowRoot.querySelector('.minimize-btn');
    const closeBtn = this.shadowRoot.querySelector('.close-btn');
    const resizeHandle = this.shadowRoot.querySelector('.resize-handle');

    // 드래그 기능
    let isDragging = false;
    let dragMoved = false; // 드래그로 실제 이동했는지 체크
    let startX, startY, startLeft, startTop;

    const startDrag = (e) => {
      if (e.target.closest('.controls') || e.target.closest('.resize-handle')) return;
      
      isDragging = true;
      dragMoved = false; // 드래그 시작 시 이동 플래그 초기화
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
      
      // 일정 거리 이상 이동했을 때만 dragMoved = true
      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        dragMoved = true;
      }
      
      // 최소화 상태일 때는 60px 기준으로 계산
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
    
    // 최소화 아이콘에는 별도의 이벤트 리스너
    minimizedIcon.addEventListener('mousedown', startDrag);
    minimizedIcon.addEventListener('click', (e) => {
      // 드래그로 이동하지 않았을 때만 복원
      if (!dragMoved) {
        this.toggleMinimize();
      }
      e.preventDefault();
      e.stopPropagation();
    });

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

    // 컨트롤 버튼
    const settingsBtn = this.shadowRoot.querySelector('.settings-btn');
    
    collapseBtn.addEventListener('click', () => this.toggleCollapse());
    closeBtn.addEventListener('click', () => this.hide());
    minimizeBtn.addEventListener('click', () => this.toggleMinimize());
    // minimizedIcon 클릭은 위에서 처리
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleSettings();
    });
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
    // 디버깅을 위한 로그
    console.log('🧭 aicus: Scanning for USER questions only on', window.location.hostname);

    let userMessages = [];

    // 사이트별로 사용자 메시지 컨테이너만 찾기 (AI 응답 제외)
    if (window.location.hostname.includes('openai.com') || window.location.hostname.includes('chatgpt.com')) {
      // ChatGPT: 사용자 메시지만 (assistant 메시지 제외)
      userMessages = Array.from(document.querySelectorAll('[data-message-author-role="user"]'));
    } else if (window.location.hostname.includes('claude.ai')) {
      // Claude: 사용자 메시지만 찾기 (data-testid="user-message"만)
      // AI 응답은 다른 testid를 가지므로 제외됨
      userMessages = Array.from(document.querySelectorAll('[data-testid="user-message"]'));
      console.log('🧭 aicus: Found user message containers:', userMessages.length);
    }

    // 페이지 상에서의 실제 위치 순서대로 정렬 (위→아래)
    userMessages.sort((a, b) => {
      const rectA = a.getBoundingClientRect();
      const rectB = b.getBoundingClientRect();
      
      // Y 좌표로 정렬 (위에 있는 것이 먼저)
      if (Math.abs(rectA.top - rectB.top) > 10) {
        return rectA.top - rectB.top;
      }
      
      // Y가 비슷하면 DOM 순서로
      const position = a.compareDocumentPosition(b);
      return (position & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1;
    });

    console.log('🧭 aicus: Sorted user messages by position');

    // 각 사용자 메시지에서 텍스트 추출
    const questions = [];
    userMessages.forEach((container, index) => {
      let text = '';
      
      if (window.location.hostname.includes('claude.ai')) {
        // Claude: p 태그의 텍스트 우선, 없으면 전체 컨테이너
        const pElement = container.querySelector('p.whitespace-pre-wrap');
        if (pElement) {
          text = pElement.textContent?.trim() || '';
        } else {
          text = container.textContent?.trim() || '';
        }
      } else if (window.location.hostname.includes('openai.com') || window.location.hostname.includes('chatgpt.com')) {
        // ChatGPT: 전체 컨테이너의 텍스트
        text = container.textContent?.trim() || '';
      }

      // 유효한 사용자 질문인지 확인
      if (text && text.length > 3 && text.length < 10000) {
        console.log(`🧭 aicus: User Question #${index + 1}:`, text.substring(0, 100) + (text.length > 100 ? '...' : ''));
        
        questions.push({
          text: text,
          fullText: text, // 호버 시 표시할 전체 텍스트 (100자까지)
          element: container,
          index: index + 1,
          selector: window.location.hostname.includes('claude.ai') ? '[data-testid="user-message"]' : '[data-message-author-role="user"]'
        });
      }
    });

    console.log(`🧭 aicus: Total USER questions found: ${questions.length}`);
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
            콘솔을 확인해주세요 (F12 → Console)
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
      // 클릭 이벤트
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index);
        const question = this.questions.find(q => q.index === index);
        if (question && question.element) {
          this.scrollToQuestion(question.element);
        }
      });

      // 호버 이벤트 (미리보기)
      item.addEventListener('mouseenter', (e) => this.showPreview(e, item));
      item.addEventListener('mouseleave', () => this.hidePreview());
      item.addEventListener('mousemove', (e) => this.updatePreviewPosition(e));
    });

    console.log(`🧭 aicus: Updated questions list with ${this.questions.length} items`);
  }

  showPreview(e, item) {
    const fullText = item.dataset.fullText;
    if (!fullText || fullText.length <= 80) return; // 짧은 텍스트는 미리보기 안함

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
    
    // 마우스 위치 기준으로 툴팁 위치 계산
    let left = e.clientX - rect.left + 10;
    let top = e.clientY - rect.top - tooltipRect.height - 10;

    // 화면 경계 체크
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
    // 부드러운 스크롤로 해당 질문으로 이동
    element.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center',
      inline: 'nearest'
    });

    // 하이라이트 효과
    this.highlightElement(element);
  }

  highlightElement(element) {
    // 기존 하이라이트 제거
    document.querySelectorAll('.aicus-highlight').forEach(el => {
      el.classList.remove('aicus-highlight');
    });

    // 새 하이라이트 추가
    element.classList.add('aicus-highlight');

    // 하이라이트 스타일 추가 (한번만)
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

    // 3초 후 하이라이트 제거
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
      // 현재 스타일과 위치 저장
      this.savedStyles = {
        width: navigator.style.width,
        height: navigator.style.height,
        maxHeight: navigator.style.maxHeight
      };
      
      // 최소화: 컨테이너를 60px로 고정하고 위치 조정
      navigator.classList.add('minimized');
      
      // 컨테이너 크기를 60px로 설정하고 오른쪽 정렬 유지
      this.container.style.width = '60px';
      this.container.style.height = '60px';
      
      // 오른쪽 끝에 붙어있을 때도 제대로 최소화되도록 위치 보정
      const currentRight = parseInt(this.container.style.right) || 20;
      this.container.style.right = currentRight + 'px';
      this.container.style.left = 'auto';
      
      this.showSettings = false;
      navigator.classList.remove('show-settings');
      this.hidePreview();
    } else {
      // 복원: 저장된 스타일 복구
      navigator.classList.remove('minimized');
      
      // 복원 시 컨테이너가 오른쪽으로 늘어나지 않도록 위치 조정
      const currentRight = parseInt(this.container.style.right) || 20;
      const targetWidth = parseInt(this.savedStyles?.width) || 320;
      
      // 오른쪽 끝에서 왼쪽으로 펼쳐지도록 조정
      this.container.style.width = 'auto';
      this.container.style.height = 'auto';
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

    // 색상 선택 이벤트
    colorPalette.addEventListener('click', (e) => {
      if (e.target.classList.contains('color-option')) {
        const newColor = e.target.dataset.color;
        this.settings.accentColor = newColor;
        this.applyColorScheme();
        this.updateColorPalette(); // 선택 상태 업데이트
      }
    });
  }

  applyColorScheme() {
    const navigator = this.shadowRoot.querySelector('.navigator');
    
    // CSS 변수 설정
    navigator.style.setProperty('--accent-color', this.settings.accentColor);
    
    // 액센트 컬러 기반으로 배경색 계산
    const accentRgb = this.hexToRgb(this.settings.accentColor);
    const headerBg = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.08)`;
    const borderColor = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.15)`;
    const settingsBg = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.05)`;
    const hoverBg = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.15)`;
    
    navigator.style.setProperty('--header-bg', headerBg);
    navigator.style.setProperty('--border-color', borderColor);
    navigator.style.setProperty('--settings-bg', settingsBg);
    navigator.style.setProperty('--hover-bg', hoverBg);
    
    console.log(`🎨 Applied color scheme: ${this.settings.accentColor}`, {
      headerBg, borderColor, settingsBg, hoverBg
    });
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
      this.hidePreview(); // 숨김 시 미리보기도 제거
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
  // 이미 실행 중이면 중지
  if (aicusNavigator) {
    aicusNavigator.destroy();
  }
  
  // 새 인스턴스 생성
  aicusNavigator = new AicusNavigator();
}

// DOM이 로드되면 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAicus);
} else {
  initAicus();
}

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', () => {
  if (aicusNavigator) {
    aicusNavigator.destroy();
  }
});