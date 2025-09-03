// Aicus - Chat Navigator (개선된 모듈형 구조)

// ===== 1. 사이트별 어댑터 시스템 =====
class ChatSiteAdapter {
  constructor() {
    this.hostname = window.location.hostname;
    this.adapter = this.createAdapter();
  }

  createAdapter() {
    if (this.hostname.includes('openai.com') || this.hostname.includes('chatgpt.com')) {
      return new ChatGPTAdapter();
    } else if (this.hostname.includes('claude.ai')) {
      return new ClaudeAdapter();
    } else if (this.hostname.includes('gemini.google.com') || this.hostname.includes('bard.google.com')) {
      return new GeminiAdapter();
    }
    return new DefaultAdapter();
  }

  getUserMessages() {
    return this.adapter.getUserMessages();
  }

  extractText(element) {
    return this.adapter.extractText(element);
  }

  getObserverConfig() {
    return this.adapter.getObserverConfig();
  }

  shouldObserveNode(node) {
    return this.adapter.shouldObserveNode(node);
  }
}

// 기본 어댑터
class DefaultAdapter {
  getUserMessages() {
    return [];
  }

  extractText(element) {
    return element.textContent?.trim() || '';
  }

  getObserverConfig() {
    return {
      childList: true,
      subtree: true,
      attributes: false
    };
  }

  shouldObserveNode(node) {
    return node.nodeType === Node.ELEMENT_NODE;
  }
}

// ChatGPT 어댑터
class ChatGPTAdapter extends DefaultAdapter {
  getUserMessages() {
    return Array.from(document.querySelectorAll('[data-message-author-role="user"]'));
  }

  shouldObserveNode(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    
    // ChatGPT 특정 컨테이너만 감시
    return node.matches('[data-message-author-role="user"]') ||
           node.querySelector('[data-message-author-role="user"]') ||
           node.closest('[data-testid="conversation-turn"]') ||
           node.matches('.text-base, .markdown, .prose');
  }
}

// Claude 어댑터
class ClaudeAdapter extends DefaultAdapter {
  getUserMessages() {
    return Array.from(document.querySelectorAll('[data-testid="user-message"]'));
  }

  extractText(element) {
    const pElement = element.querySelector('p.whitespace-pre-wrap');
    return pElement ? pElement.textContent?.trim() || '' : element.textContent?.trim() || '';
  }

  shouldObserveNode(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    
    // Claude 특정 컨테이너만 감시
    return node.matches('[data-testid="user-message"]') ||
           node.querySelector('[data-testid="user-message"]') ||
           node.closest('[data-testid="conversation"]') ||
           node.matches('.whitespace-pre-wrap, .prose');
  }
}

// Gemini 어댑터
class GeminiAdapter extends DefaultAdapter {
  getUserMessages() {
    const root = document.querySelector('main[role="main"]') || 
                 document.querySelector('[aria-label="Chat history"]') || 
                 document.body;
    
    const bubbles = Array.from(root.querySelectorAll('.user-query-bubble-with-background'));
    
    return bubbles.map(bubble =>
      bubble.querySelector('.query-text-line, .query-text.gds-body-l, [id^="user-query-content-"] > span') || bubble
    ).filter((el, index, arr) => arr.indexOf(el) === index);
  }

  shouldObserveNode(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    
    // Gemini 특정 컨테이너만 감시
    return node.matches('.user-query-bubble-with-background') ||
           node.querySelector('.user-query-bubble-with-background') ||
           node.matches('.query-text, .query-text-line') ||
           node.closest('main[role="main"]');
  }
}

// ===== 2. 효율적인 옵저버 관리자 =====
class SmartObserver {
  constructor(callback, adapter) {
    this.callback = callback;
    this.adapter = adapter;
    this.observer = null;
    this.debounceTimer = null;
    this.lastScanTime = 0;
    this.scanCooldown = 1000; // 1초 쿨다운
    this.isObserving = false;
  }

  start() {
    if (this.isObserving) return;
    
    this.observer = new MutationObserver((mutations) => {
      this.handleMutations(mutations);
    });

    this.observer.observe(document.body, this.adapter.getObserverConfig());
    this.isObserving = true;
    console.log('🧭 SmartObserver started');
  }

  stop() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.isObserving = false;
    console.log('🧭 SmartObserver stopped');
  }

  handleMutations(mutations) {
    // 빠른 필터링: 관련 없는 변경사항 무시
    const relevantMutations = mutations.filter(mutation => {
      // 텍스트 노드만 변경된 경우 무시
      if (mutation.type === 'childList') {
        const hasRelevantNodes = Array.from(mutation.addedNodes).some(node =>
          this.adapter.shouldObserveNode(node)
        );
        return hasRelevantNodes;
      }
      return false;
    });

    if (relevantMutations.length === 0) {
      return; // 관련 없는 변경사항, 콜백 호출하지 않음
    }

    // 쿨다운 체크
    const now = Date.now();
    if (now - this.lastScanTime < this.scanCooldown) {
      // 쿨다운 중이면 디바운싱으로 지연
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      
      this.debounceTimer = setTimeout(() => {
        this.executeScan();
      }, this.scanCooldown - (now - this.lastScanTime));
      
      return;
    }

    this.executeScan();
  }

  executeScan() {
    this.lastScanTime = Date.now();
    this.callback();
    console.log('🧭 Observer triggered scan');
  }

  // 수동 스캔 (페이지 로드 시 등)
  forceScan() {
    this.lastScanTime = Date.now();
    this.callback();
  }
}

// ===== 3. 질문 데이터 관리자 =====
class QuestionManager {
  constructor(adapter) {
    this.adapter = adapter;
    this.questions = [];
    this.questionMap = new Map(); // 중복 체크용
  }

  scanQuestions() {
    const userMessages = this.adapter.getUserMessages();
    
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

    const newQuestions = [];
    const newQuestionMap = new Map();

    userMessages.forEach((element, index) => {
      const text = this.adapter.extractText(element);
      
      if (this.isValidQuestion(text)) {
        const questionId = this.generateQuestionId(text, element);
        
        // 중복 체크
        if (!newQuestionMap.has(questionId)) {
          const question = {
            id: questionId,
            text: text,
            fullText: text,
            element: element,
            index: index + 1
          };
          
          newQuestions.push(question);
          newQuestionMap.set(questionId, question);
        }
      }
    });

    // 변경사항 체크 (성능 최적화)
    const hasChanges = this.hasQuestionsChanged(newQuestions);
    
    if (hasChanges) {
      this.questions = newQuestions;
      this.questionMap = newQuestionMap;
      console.log(`🧭 Questions updated: ${this.questions.length} questions found`);
      return true;
    }
    
    return false;
  }

  isValidQuestion(text) {
    return text && text.length > 3 && text.length < 10000;
  }

  generateQuestionId(text, element) {
    // 텍스트와 DOM 위치 기반으로 고유 ID 생성
    const textHash = this.simpleHash(text.substring(0, 100));
    const elementPath = this.getElementPath(element);
    return `${textHash}-${elementPath}`;
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  getElementPath(element) {
    const path = [];
    let current = element;
    
    while (current && current !== document.body && path.length < 5) {
      const tagName = current.tagName?.toLowerCase() || '';
      const classList = Array.from(current.classList || []).slice(0, 2);
      path.unshift(`${tagName}${classList.length ? '.' + classList.join('.') : ''}`);
      current = current.parentElement;
    }
    
    return path.join('>');
  }

  hasQuestionsChanged(newQuestions) {
    if (this.questions.length !== newQuestions.length) {
      return true;
    }
    
    return newQuestions.some((newQ, index) => {
      const oldQ = this.questions[index];
      return !oldQ || oldQ.id !== newQ.id;
    });
  }

  getQuestions() {
    return this.questions;
  }

  findQuestionByIndex(index) {
    return this.questions.find(q => q.index === index);
  }
}

// ===== 4. UI 컴포넌트 관리자 =====
class UIManager {
  constructor() {
    this.container = null;
    this.shadowRoot = null;
    this.isVisible = false;
    this.isMinimized = false;
    this.isCollapsed = false;
    this.showSettings = false;
    this.previewTooltip = null;
    
    this.settings = {
      accentColor: '#BCBAE6',
      theme: 'auto'
    };

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
  }

  init() {
    this.createShadowDOM();
    this.setupEventListeners();
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

    this.shadowRoot = this.container.attachShadow({ mode: 'closed' });
    this.createStyles();
    this.createNavigatorHTML();
    document.body.appendChild(this.container);
  }

  createStyles() {
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
      }

      .dark .content::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
      }

      .question-item {
        padding: 12px 16px;
        border-bottom: 1px solid var(--border-color, rgba(0, 0, 0, 0.05));
        cursor: pointer;
        transition: all 0.2s ease;
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
        word-wrap: break-word;
        overflow-wrap: break-word;
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
        font-size: 24px;
        cursor: pointer;
      }

      .navigator.minimized .header,
      .navigator.minimized .content,
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

      @media (prefers-color-scheme: dark) {
        .navigator {
          background: rgba(30, 30, 30, 0.95);
          border-color: rgba(255, 255, 255, 0.1);
          color: #fff;
        }
      }
    `;

    this.shadowRoot.appendChild(style);
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
          <circle cx="18.5" cy="24.5" r="2" fill="currentColor"/>
          <circle cx="45.5" cy="39.5" r="2" fill="currentColor"/>
        </svg>
      </div>
      <div class="header">
        <svg class="main-icon" viewBox="0 0 64 64" width="20" height="20" title="최소화/복원">
          <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" stroke-width="6"/>
          <path fill="var(--accent-color, #BCBAE6)" d="M32 10l5.5 12.8L50 28.5 37.2 34 32 50 26.8 34 14 28.5l12.5-5.7L32 10z"/>
          <path fill="currentColor" d="M36 20 44 34 28 44z"/>
          <circle cx="32" cy="32" r="3" fill="currentColor"/>
          <circle cx="18.5" cy="24.5" r="2" fill="currentColor"/>
          <circle cx="45.5" cy="39.5" r="2" fill="currentColor"/>
        </svg>
        <span class="title">Aicus</span>
        <div class="controls">
          <button class="control-btn settings-btn" title="설정">⚙️</button>
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
    `;

    this.shadowRoot.appendChild(navigator);
    this.updateColorPalette();
    this.applyColorScheme();
    this.createPreviewTooltip();
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
    const titleElement = this.shadowRoot.querySelector('.title');
    const settingsBtn = this.shadowRoot.querySelector('.settings-btn');
    const collapseBtn = this.shadowRoot.querySelector('.collapse-btn');
    const closeBtn = this.shadowRoot.querySelector('.close-btn');

    // 드래그 기능
    this.setupDragFunctionality(header, minimizedIcon);

    // 컨트롤 버튼 이벤트
    mainIcon.addEventListener('click', () => this.toggleMinimize());
    titleElement.addEventListener('click', () => this.toggleMinimize());
    minimizedIcon.addEventListener('click', () => this.toggleMinimize());
    
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleSettings();
    });
    
    collapseBtn.addEventListener('click', () => this.toggleCollapse());
    closeBtn.addEventListener('click', () => this.hide());
  }

  setupDragFunctionality(header, minimizedIcon) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    const startDrag = (e) => {
      if (e.target.closest('.controls') || e.target.closest('.main-icon') || e.target.closest('.title')) return;
      
      isDragging = true;
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
    minimizedIcon.addEventListener('mousedown', startDrag);
  }

  updateQuestionsList(questions) {
    const content = this.shadowRoot.querySelector('.content');
    
    if (questions.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <div style="margin-bottom: 8px;">질문을 찾을 수 없습니다.</div>
        </div>
      `;
      return;
    }

    const questionsHTML = questions.map(question => `
      <div class="question-item" data-index="${question.index}" data-full-text="${this.escapeHtml(question.fullText)}">
        <div class="question-text">${this.escapeHtml(question.text.substring(0, 100))}${question.text.length > 100 ? '...' : ''}</div>
      </div>
    `).join('');

    content.innerHTML = questionsHTML;

    // 이벤트 리스너 추가
    this.attachQuestionListeners();
  }

  attachQuestionListeners() {
    const items = this.shadowRoot.querySelectorAll('.question-item');
    
    items.forEach(item => {
      // 클릭 이벤트
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index);
        this.onQuestionClick?.(index);
      });

      // 호버 이벤트
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

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    const navigator = this.shadowRoot.querySelector('.navigator');
    const collapseBtn = this.shadowRoot.querySelector('.collapse-btn');
    
    if (this.isCollapsed) {
      navigator.classList.add('collapsed');
      collapseBtn.textContent = '+';
    } else {
      navigator.classList.remove('collapsed');
      collapseBtn.textContent = '−';
    }
  }

  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    const navigator = this.shadowRoot.querySelector('.navigator');
    
    if (this.isMinimized) {
      navigator.classList.add('minimized');
      this.container.style.width = '60px';
      this.container.style.height = '60px';
      this.showSettings = false;
      navigator.classList.remove('show-settings');
      this.hidePreview();
    } else {
      navigator.classList.remove('minimized');
      this.container.style.width = 'auto';
      this.container.style.height = 'auto';
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
    } : { r: 188, g: 186, b: 230 };
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
    if (this.container) {
      this.container.remove();
    }
  }

  setQuestionClickHandler(handler) {
    this.onQuestionClick = handler;
  }
}

// ===== 5. 네비게이션 관리자 =====
class NavigationManager {
  scrollToQuestion(element) {
    element.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center',
      inline: 'nearest'
    });

    this.highlightElement(element);
  }

  highlightElement(element) {
    // 기존 하이라이트 제거
    document.querySelectorAll('.aicus-highlight').forEach(el => {
      el.classList.remove('aicus-highlight');
    });

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
}

// ===== 6. 메인 컨트롤러 =====
class AicusNavigator {
  constructor() {
    this.adapter = new ChatSiteAdapter();
    this.questionManager = new QuestionManager(this.adapter);
    this.uiManager = new UIManager();
    this.navigationManager = new NavigationManager();
    this.observer = null;
    
    this.init();
  }

  init() {
    console.log(`🧭 Aicus Navigator initializing for ${window.location.hostname}`);
    
    // UI 초기화
    this.uiManager.init();
    this.uiManager.setQuestionClickHandler((index) => this.handleQuestionClick(index));
    
    // 스마트 옵저버 시작
    this.observer = new SmartObserver(
      () => this.handleContentChange(),
      this.adapter
    );
    
    // 초기 스캔
    this.performInitialScan();
    
    // 옵저버 시작
    this.observer.start();
    
    console.log('🧭 Aicus Navigator initialized successfully');
  }

  performInitialScan() {
    const hasChanges = this.questionManager.scanQuestions();
    if (hasChanges) {
      this.uiManager.updateQuestionsList(this.questionManager.getQuestions());
    }
  }

  handleContentChange() {
    const hasChanges = this.questionManager.scanQuestions();
    if (hasChanges) {
      this.uiManager.updateQuestionsList(this.questionManager.getQuestions());
      console.log(`🧭 UI updated with ${this.questionManager.getQuestions().length} questions`);
    }
  }

  handleQuestionClick(index) {
    const question = this.questionManager.findQuestionByIndex(index);
    if (question && question.element) {
      this.navigationManager.scrollToQuestion(question.element);
    }
  }

  show() {
    this.uiManager.show();
  }

  hide() {
    this.uiManager.hide();
  }

  destroy() {
    if (this.observer) {
      this.observer.stop();
    }
    if (this.uiManager) {
      this.uiManager.destroy();
    }
    console.log('🧭 Aicus Navigator destroyed');
  }
}

// ===== 7. 확장 프로그램 초기화 =====
let aicusNavigator = null;

function initAicus() {
  // 기존 인스턴스 정리
  if (aicusNavigator) {
    aicusNavigator.destroy();
  }
  
  // 새 인스턴스 생성
  aicusNavigator = new AicusNavigator();
}

// DOM 준비 시 초기화
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