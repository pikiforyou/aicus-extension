// aicus - 채팅 네비게이터
class AicusNavigator {
  constructor() {
    this.isVisible = false;
    this.isMinimized = false;
    this.isCollapsed = false;
    this.shadowRoot = null;
    this.container = null;
    this.observer = null;
    this.questions = [];
    
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
      top: 20px;
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
      }

      .navigator.dark {
        background: rgba(30, 30, 30, 0.95);
        border-color: rgba(255, 255, 255, 0.1);
        color: #fff;
      }

      .navigator.minimized {
        width: 60px;
        height: 60px;
      }

      .header {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        background: rgba(0, 0, 0, 0.05);
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        cursor: move;
        user-select: none;
      }

      .dark .header {
        background: rgba(255, 255, 255, 0.05);
        border-bottom-color: rgba(255, 255, 255, 0.1);
      }

      .title {
        flex: 1;
        font-weight: 600;
        font-size: 14px;
        color: #333;
        margin-left: 8px;
      }

      .dark .title {
        color: #fff;
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
      }

      .control-btn:hover {
        background: rgba(0, 0, 0, 0.1);
      }

      .dark .control-btn:hover {
        background: rgba(255, 255, 255, 0.1);
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
        padding: 8px 16px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        cursor: pointer;
        transition: background 0.2s ease;
        position: relative;
      }

      .dark .question-item {
        border-bottom-color: rgba(255, 255, 255, 0.05);
      }

      .question-item:hover {
        background: rgba(0, 0, 0, 0.05);
      }

      .dark .question-item:hover {
        background: rgba(255, 255, 255, 0.05);
      }

      .question-text {
        font-size: 13px;
        line-height: 1.4;
        color: #444;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        margin-bottom: 4px;
      }

      .dark .question-text {
        color: #ccc;
      }

      .question-meta {
        font-size: 11px;
        color: #888;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .dark .question-meta {
        color: #888;
      }

      .question-index {
        background: rgba(59, 130, 246, 0.1);
        color: #3b82f6;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 500;
      }

      .dark .question-index {
        background: rgba(59, 130, 246, 0.2);
        color: #60a5fa;
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
      .navigator.minimized .resize-handle {
        display: none;
      }

      .navigator.minimized .minimized-icon {
        display: flex;
      }

      .navigator.collapsed .content {
        display: none;
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
  }

  createNavigatorHTML() {
    const navigator = document.createElement('div');
    navigator.className = 'navigator';
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      navigator.classList.add('dark');
    }

    navigator.innerHTML = `
      <div class="minimized-icon">🧭</div>
      <div class="header">
        <span>🧭</span>
        <span class="title">aicus</span>
        <div class="controls">
          <button class="control-btn collapse-btn" title="접기/펼치기">−</button>
          <button class="control-btn minimize-btn" title="최소화">□</button>
          <button class="control-btn close-btn" title="닫기">×</button>
        </div>
      </div>
      <div class="content">
        <div class="empty-state">질문을 찾는 중...</div>
      </div>
      <div class="resize-handle"></div>
    `;

    this.shadowRoot.appendChild(navigator);
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
    let startX, startY, startLeft, startTop;

    const startDrag = (e) => {
      if (e.target.closest('.controls') || e.target.closest('.resize-handle')) return;
      
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
      
      this.container.style.left = Math.max(0, Math.min(window.innerWidth - 320, startLeft + deltaX)) + 'px';
      this.container.style.top = Math.max(0, Math.min(window.innerHeight - 100, startTop + deltaY)) + 'px';
      this.container.style.right = 'auto';
    };

    const stopDrag = () => {
      isDragging = false;
      document.removeEventListener('mousemove', drag);
      document.removeEventListener('mouseup', stopDrag);
    };

    header.addEventListener('mousedown', startDrag);
    minimizedIcon.addEventListener('mousedown', startDrag);

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
    collapseBtn.addEventListener('click', () => this.toggleCollapse());
    minimizeBtn.addEventListener('click', () => this.toggleMinimize());
    closeBtn.addEventListener('click', () => this.hide());
    minimizedIcon.addEventListener('click', () => this.toggleMinimize());
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
        // 디바운스를 위해 잠시 대기
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
      <div class="question-item" data-index="${question.index}">
        <div class="question-text">${this.escapeHtml(question.text.substring(0, 100))}${question.text.length > 100 ? '...' : ''}</div>
        <div class="question-meta">
          <span class="question-index">#${question.index}</span>
          <span style="font-size: 10px; color: #666;">${question.selector}</span>
          <span>${question.text.length}자</span>
        </div>
      </div>
    `).join('');

    content.innerHTML = questionsHTML;

    // 클릭 이벤트 추가
    content.querySelectorAll('.question-item').forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index);
        const question = this.questions.find(q => q.index === index);
        if (question && question.element) {
          this.scrollToQuestion(question.element);
        }
      });
    });

    console.log(`🧭 aicus: Updated questions list with ${this.questions.length} items`);
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
      navigator.classList.add('minimized');
    } else {
      navigator.classList.remove('minimized');
    }
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
