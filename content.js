// ===== 1. 사이트별 어댑터 시스템 =====
class ChatSiteAdapter {
  constructor() {
    this.hostname = window.location.hostname;
  }

  getUserMessages() {
    if (this.hostname.includes('openai.com') || this.hostname.includes('chatgpt.com')) {
      // ChatGPT는 다른 대화로 이동해도 이전 대화의 질문을 숨긴 채 DOM에 남겨두므로 보이는 것만 사용
      return Array.from(document.querySelectorAll('[data-user-message-bubble="true"]'))
        .filter(el => this.isElementVisible(el));
    } else if (this.hostname.includes('claude.ai')) {
      return Array.from(document.querySelectorAll('[data-testid="user-message"]'));
    } else if (this.hostname.includes('gemini.google.com') || this.hostname.includes('bard.google.com')) {
      const root = document.querySelector('main[role="main"]') || 
                   document.querySelector('[aria-label="Chat history"]') || 
                   document.body;
      const bubbles = Array.from(root.querySelectorAll('.user-query-bubble-with-background'));
      return bubbles.map(bubble =>
        bubble.querySelector('.query-text-line, .query-text.gds-body-l, [id^="user-query-content-"] > span') || bubble
      ).filter((el, index, arr) => arr.indexOf(el) === index);
    } else if (this.hostname.includes('copilot.microsoft.com') || 
               this.hostname.includes('copilot.cloud.microsoft') ||
               this.hostname.includes('m365.cloud.microsoft') ||
               this.hostname.includes('bing.com/chat')) {
      
      // M365 Copilot을 위한 확장된 셀렉터 목록
      const copilotSelectors = [
        // 기존 셀렉터들
        '.fai-UserMessage__message',
        '[id^="user-message-"]',
        '[data-testid="chatOutput"]',
        '.user-message',
        '.human-turn',
        '[data-role="user"]',
        '.message.user',
        
        // M365 Copilot 전용 셀렉터들
        '[data-testid="user-bubble"]',
        '[data-testid="user-input-bubble"]',
        '.user-bubble',
        '.human-message',
        '[role="user"]',
        '[aria-label*="user" i]',
        '[aria-label*="sent" i]',
        '.message[data-author="user"]',
        '.chat-message.user',
        '.conversation-message.user',
        
        // iframe 내부 셀렉터들
        'iframe[src*="copilot"] .user-message',
        'iframe[src*="chat"] .user-message',
        '.copilot-chat .user-message',
        '.ms-copilot .user-message',
        
        // 일반적인 채팅 패턴
        '.message:not(.assistant):not(.bot):not(.ai)',
        '[class*="user"]:not([class*="assistant"]):not([class*="bot"])',
        '.prompt',
        '.input-message',
        '.sent-message',
        
        // Microsoft UI 패턴
        '[data-automation-id*="user"]',
        '[data-automation-id*="input"]',
        '.ms-Button--user',
        '.fluent-message.user'
      ];
      
      let userMessages = [];
      
      // iframe 내부도 검색
      const checkInIframes = () => {
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            if (iframeDoc) {
              copilotSelectors.forEach(selector => {
                try {
                  const elements = Array.from(iframeDoc.querySelectorAll(selector));
                  if (elements.length > 0) {
                    userMessages = userMessages.concat(elements);
                  }
                } catch (e) {
                  // 접근 권한 없음, 무시
                }
              });
            }
          } catch (e) {
            // Cross-origin iframe, 무시
          }
        });
      };
      
      // 메인 문서에서 검색
      copilotSelectors.forEach(selector => {
        try {
          const elements = Array.from(document.querySelectorAll(selector));
          if (elements.length > 0) {
            userMessages = userMessages.concat(elements);
          }
        } catch (e) {
          // 셀렉터 오류 무시
        }
      });
      
      // iframe도 확인
      checkInIframes();

      // 중복 제거
      userMessages = Array.from(new Set(userMessages));
      
      // AI 응답 필터링 및 텍스트가 있는 것만 선택
      const filteredMessages = userMessages.filter(element => {
        // AI 응답 제외
        const isAIResponse = element.classList.contains('assistant') || 
                           element.classList.contains('ai-message') ||
                           element.classList.contains('bot') ||
                           element.classList.contains('copilot') ||
                           element.querySelector('[data-testid="botOutput"]') ||
                           element.closest('[data-role="assistant"]') ||
                           element.getAttribute('data-author') === 'assistant' ||
                           element.getAttribute('data-author') === 'bot';
        
        if (isAIResponse) return false;
        
        // 텍스트 내용이 있는지 확인
        const text = this.extractText(element);
        return text && text.trim().length > 0;
      });
      
      console.log(`M365 Copilot: Found ${filteredMessages.length} user messages`);
      return filteredMessages;
    }
    return [];
  }

  // display:none 등으로 숨겨진 요소 제외 (checkVisibility 미지원 브라우저는 offsetParent로 판정)
  isElementVisible(el) {
    return typeof el.checkVisibility === 'function'
      ? el.checkVisibility()
      : el.offsetParent !== null;
  }

  extractText(container) {
    if (this.hostname.includes('claude.ai')) {
      const pElement = container.querySelector('p.whitespace-pre-wrap');
      return pElement ? pElement.textContent?.trim() : container.textContent?.trim();
    } else if (this.hostname.includes('openai.com') || this.hostname.includes('chatgpt.com')) {
      return container.textContent?.trim();
    } else if (this.hostname.includes('gemini.google.com') || this.hostname.includes('bard.google.com')) {
      // 화면낭독기용 숨김 제목(h5.cdk-visually-hidden: "말씀하신 내용 " + 질문 앞부분)을 제외하고 추출
      const clone = container.cloneNode(true);
      clone.querySelectorAll('.cdk-visually-hidden').forEach(el => el.remove());
      let text = clone.textContent?.trim();
      if (!text) {
        const textElements = clone.querySelectorAll('p, div, span');
        text = Array.from(textElements)
          .map(el => el.textContent?.trim())
          .filter(t => t && t.length > 5)
          .join(' ');
      }
      return text;
    } else if (this.hostname.includes('copilot.microsoft.com') || 
               this.hostname.includes('copilot.cloud.microsoft') ||
               this.hostname.includes('m365.cloud.microsoft') ||
               this.hostname.includes('bing.com/chat')) {
      
      // M365 Copilot용 텍스트 추출 개선
      const chatOutput = container.querySelector('[data-testid="chatOutput"]');
      if (chatOutput) {
        return chatOutput.textContent?.trim() || '';
      }
      
      // 다양한 텍스트 컨테이너 시도
      const textContainers = [
        container.querySelector('.message-text'),
        container.querySelector('.user-text'),
        container.querySelector('.prompt-text'),
        container.querySelector('[data-content]'),
        container.querySelector('p'),
        container.querySelector('div[role="text"]'),
        container.querySelector('.text-content')
      ].filter(el => el);
      
      for (const textContainer of textContainers) {
        const text = textContainer.textContent?.trim();
        if (text && text.length > 0) {
          return text;
        }
      }
      
      // 직접 텍스트 추출
      let text = container.textContent?.trim();
      if (!text) {
        const textElements = container.querySelectorAll('p, div, span');
        if (textElements.length > 0) {
          text = Array.from(textElements)
            .map(el => el.textContent?.trim())
            .filter(t => t && t.length > 3) // 더 짧은 텍스트도 허용
            .join(' ');
        }
      }
      return text;
    }
    return container.textContent?.trim() || '';
  }

  // 채팅 관련 노드인지 정밀하게 판단
  isRelevantChatNode(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    
    if (this.hostname.includes('openai.com') || this.hostname.includes('chatgpt.com')) {
      return node.matches('[data-user-message-bubble="true"]') ||
             node.querySelector('[data-user-message-bubble="true"]') ||
             node.matches('[data-testid*="conversation"]') ||
             node.closest('[data-testid*="conversation"]');
    } else if (this.hostname.includes('claude.ai')) {
      return node.matches('[data-testid="user-message"]') ||
             node.querySelector('[data-testid="user-message"]') ||
             node.matches('[data-testid*="conversation"]') ||
             node.closest('[data-testid*="conversation"]');
    } else if (this.hostname.includes('gemini.google.com') || this.hostname.includes('bard.google.com')) {
      return node.matches('.user-query-bubble-with-background') ||
             node.querySelector('.user-query-bubble-with-background') ||
             node.matches('main[role="main"]') ||
             node.closest('main[role="main"]');
    } else if (this.hostname.includes('copilot.microsoft.com') || 
               this.hostname.includes('copilot.cloud.microsoft') ||
               this.hostname.includes('m365.cloud.microsoft') ||
               this.hostname.includes('bing.com/chat')) {
      
      // M365 Copilot 채팅 관련 노드 판단 개선
      const chatRelatedSelectors = [
        '.fai-UserMessage__message',
        '[id^="user-message-"]',
        '[data-testid="chatOutput"]',
        '[data-testid*="conversation"]',
        '[data-testid*="chat"]',
        '.user-message',
        '.human-turn',
        '[data-role="user"]',
        '.message',
        '.chat-message',
        '.conversation-message',
        '.user-bubble',
        '[class*="chat"]',
        '[class*="message"]',
        '[class*="conversation"]',
        'main[role="main"]',
        '[role="main"]',
        '.copilot-chat',
        '.ms-copilot'
      ];
      
      return chatRelatedSelectors.some(selector => {
        try {
          return node.matches(selector) || 
                 node.querySelector(selector) || 
                 node.closest(selector);
        } catch (e) {
          return false;
        }
      });
    }
    
    return false;
  }

  // 현재 채팅 페이지에 있는지 확인
  isOnChatPage() {
    if (this.hostname.includes('openai.com') || this.hostname.includes('chatgpt.com')) {
      return Array.from(document.querySelectorAll('[data-user-message-bubble="true"]'))
        .some(el => this.isElementVisible(el));
    } else if (this.hostname.includes('claude.ai')) {
      return !!document.querySelector('[data-testid="user-message"]');
    } else if (this.hostname.includes('gemini.google.com') || this.hostname.includes('bard.google.com')) {
      return !!document.querySelector('.user-query-bubble-with-background');
    } else if (this.hostname.includes('copilot.microsoft.com') || 
               this.hostname.includes('copilot.cloud.microsoft') ||
               this.hostname.includes('m365.cloud.microsoft') ||
               this.hostname.includes('bing.com/chat')) {
      
      // M365 Copilot 채팅 페이지 감지 개선
      const chatIndicators = [
        '.fai-UserMessage__message',
        '[id^="user-message-"]',
        '[data-testid="chatOutput"]',
        '.user-message',
        '.human-turn',
        '[data-role="user"]',
        '.message',
        '.chat-message',
        '.conversation-message',
        '.user-bubble',
        '[data-testid*="chat"]',
        '[class*="chat"]',
        'input[type="text"]', // 채팅 입력창
        'textarea[placeholder*="Ask"]', // Ask Copilot 입력창
        '[placeholder*="chat" i]',
        '[placeholder*="message" i]'
      ];
      
      return chatIndicators.some(selector => {
        try {
          return !!document.querySelector(selector);
        } catch (e) {
          return false;
        }
      }) || 
      // iframe 내부도 확인
      Array.from(document.querySelectorAll('iframe')).some(iframe => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          if (iframeDoc) {
            return chatIndicators.some(selector => {
              try {
                return !!iframeDoc.querySelector(selector);
              } catch (e) {
                return false;
              }
            });
          }
        } catch (e) {
          return false;
        }
        return false;
      });
    }
    return false;
  }
}

// ===== 2. 최적화된 MutationObserver =====
class OptimizedObserver {
  constructor(callback, adapter) {
    this.callback = callback;
    this.adapter = adapter;
    this.observer = null;
    this.debounceTimer = null;
    this.lastScanTime = 0;
    this.scanCooldown = 1000; // 1초 쿨다운
    this.isObserving = false;
    
    // SPA 감지를 위한 URL 추적
    this.lastUrl = window.location.href;
    this.urlCheckTimer = null;
    
    // M365 Copilot용 특별 처리
    this.iframeObservers = [];
  }

  start() {
    if (this.isObserving) return;
    
    // MutationObserver 시작
    this.observer = new MutationObserver((mutations) => {
      this.handleMutations(mutations);
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false // attributes 감시 비활성화로 성능 향상
    });

    // URL 변화 감지 설정
    this.setupUrlWatcher();
    
    // M365 Copilot용 iframe 감시 설정
    this.setupIframeWatchers();
    
    this.isObserving = true;
    console.log('🧭 OptimizedObserver started');
  }

  stop() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    // iframe observers 정리
    this.iframeObservers.forEach(obs => obs.disconnect());
    this.iframeObservers = [];
    
    this.clearTimers();
    this.cleanupUrlWatcher();
    this.isObserving = false;
    
    console.log('🧭 OptimizedObserver stopped');
  }

  setupIframeWatchers() {
    // M365 Copilot의 iframe 감시
    const watchIframes = () => {
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          if (iframeDoc && !iframe.dataset.aicusWatched) {
            iframe.dataset.aicusWatched = 'true';
            
            const iframeObserver = new MutationObserver((mutations) => {
              console.log('🧭 Iframe mutation detected');
              this.handleMutations(mutations);
            });
            
            iframeObserver.observe(iframeDoc.body || iframeDoc, {
              childList: true,
              subtree: true,
              attributes: false
            });
            
            this.iframeObservers.push(iframeObserver);
          }
        } catch (e) {
          // Cross-origin iframe 접근 불가, 무시
        }
      });
    };
    
    // 다시 호출되더라도 타이머가 쌓이지 않도록 기존 타이머 해제
    clearTimeout(this.iframeInitTimer);
    clearInterval(this.iframeCheckTimer);

    // 초기 iframe 검사
    this.iframeInitTimer = setTimeout(watchIframes, 1000);

    // 주기적으로 새로운 iframe 확인
    this.iframeCheckTimer = setInterval(watchIframes, 5000);
  }

  setupUrlWatcher() {
    // content script는 isolated world에서 실행되므로 history.pushState를 덮어써도
    // 페이지(SPA)의 호출을 가로챌 수 없다 → popstate + URL 폴링으로 감지

    // popstate 이벤트
    this.popstateHandler = () => this.onUrlChange();
    window.addEventListener('popstate', this.popstateHandler);
    
    // URL 변화 주기적 체크 (fallback - 가벼운 체크)
    this.urlCheckTimer = setInterval(() => {
      if (window.location.href !== this.lastUrl) {
        this.onUrlChange();
      }
    }, 2000); // 2초마다 URL만 체크
  }

  cleanupUrlWatcher() {
    // 이벤트 리스너 제거
    if (this.popstateHandler) {
      window.removeEventListener('popstate', this.popstateHandler);
    }
    
    // 타이머 정리
    if (this.urlCheckTimer) {
      clearInterval(this.urlCheckTimer);
      this.urlCheckTimer = null;
    }
    
    if (this.iframeCheckTimer) {
      clearInterval(this.iframeCheckTimer);
      this.iframeCheckTimer = null;
    }

    clearTimeout(this.iframeInitTimer);
    clearTimeout(this.urlScanTimer);
  }

  onUrlChange() {
    const newUrl = window.location.href;
    if (newUrl !== this.lastUrl) {
      console.log('🧭 URL changed, scanning in 500ms');
      this.lastUrl = newUrl;
      
      // URL 변경 시 잠시 후 스캔 (DOM 로딩 대기)
      // iframe 감시는 start()에서 설정한 5초 인터벌이 계속 처리하므로 다시 설정하지 않는다
      clearTimeout(this.urlScanTimer);
      this.urlScanTimer = setTimeout(() => {
        this.forceScan();
      }, 500);
    }
  }

  handleMutations(mutations) {
    // 채팅 관련 변화만 필터링
    const relevantMutations = mutations.filter(mutation => {
      if (mutation.type === 'childList') {
        const addedNodes = Array.from(mutation.addedNodes);
        const removedNodes = Array.from(mutation.removedNodes);
        
        // 추가되거나 제거된 노드 중 채팅 관련 노드가 있는지 확인
        return [...addedNodes, ...removedNodes].some(node => 
          this.adapter.isRelevantChatNode(node)
        );
      }
      return false;
    });

    if (relevantMutations.length === 0) {
      return; // 채팅 관련 변화가 없으면 무시
    }

    console.log(`🧭 Detected ${relevantMutations.length} relevant mutations`);
    if (this.onRelevantMutation) {
      this.onRelevantMutation();
    }
    this.debouncedScan();
  }

  debouncedScan() {
    const now = Date.now();
    
    // 쿨다운 체크
    if (now - this.lastScanTime < this.scanCooldown) {
      // 디바운싱: 기존 타이머 취소하고 새로 설정
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      
      this.debounceTimer = setTimeout(() => {
        this.executeScan();
      }, this.scanCooldown - (now - this.lastScanTime));
      
      return;
    }

    // 즉시 실행
    this.executeScan();
  }

  executeScan() {
    this.lastScanTime = Date.now();
    this.callback();
    console.log('🧭 Scan executed');
  }

  forceScan() {
    this.lastScanTime = Date.now();
    this.callback();
  }

  clearTimers() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}

// ===== 3. 메인 네비게이터 클래스 =====
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

    // 가상화 사이트(Claude, ChatGPT)용 누적 목록: data-turn-key → { key, text, y, element }
    this.questionMap = new Map();
    this.questionOrder = [];
    this.questionMapUrl = window.location.href;
    // 같은 탭 안에서 대화별 누적 목록 기억 (메모리만 사용, 저장소 X, 새로고침하면 사라짐)
    this.conversationCache = new Map();
    this.scroller = null;
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
    
    // 어댑터 초기화
    this.adapter = new ChatSiteAdapter();
    
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

  setupMutationObserver() {
    // 최적화된 옵저버 사용
    this.observer = new OptimizedObserver(
      () => this.scanForQuestions(),
      this.adapter
    );
    this.observer.onRelevantMutation = () => this.captureRendered();
    this.observer.start();
  }

  scanForQuestions() {
    let userMessages = this.adapter.getUserMessages();

    // 다른 대화로 이동했으면 누적 목록 초기화 (URL 폴링 2초를 기다리지 않고 스캔 시점에 바로 판정)
    this.resetIfUrlChanged();

    // 안정적인 키(data-turn-key)가 있는 사이트는 화면 밖으로 빠진 질문도 유지하도록 누적
    if (this.questionMap.size > 0 || userMessages.some(el => this.getTurnKey(el))) {
      this.mergeKeyedQuestions(userMessages);
      return;
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
      const text = this.adapter.extractText(container);

      // 2글자 이상 허용하되 시스템 텍스트는 제외
      if (text && this.isValidQuestion(text)) {      
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
    
    console.log(`🧭 Found ${questions.length} valid questions`);
  }

  getTurnKey(el) {
    const row = el.closest('[data-turn-key]');
    return row ? row.getAttribute('data-turn-key') : null;
  }

  // 질문 요소를 감싸는 스크롤 컨테이너 (overflow auto/scroll 인 첫 조상)
  findScroller(el) {
    if (this.scroller && this.scroller.isConnected && this.scroller.contains(el)) {
      return this.scroller;
    }
    let node = el.parentElement;
    while (node && node !== document.body) {
      const overflowY = getComputedStyle(node).overflowY;
      if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight + 50) {
        this.scroller = node;
        return node;
      }
      node = node.parentElement;
    }
    this.scroller = document.scrollingElement;
    return this.scroller;
  }

  // 스크롤 컨테이너 기준 위치 (스크롤해도 변하지 않는 값)
  getScrollY(el, scroller) {
    const top = scroller === document.scrollingElement ? 0 : scroller.getBoundingClientRect().top;
    return Math.round(el.getBoundingClientRect().top - top + scroller.scrollTop);
  }

  resetIfUrlChanged() {
    if (window.location.href !== this.questionMapUrl) {
      this.saveConversationCache();
      const cached = this.conversationCache.get(window.location.href);
      this.questionMap = cached ? new Map(cached.map) : new Map();
      this.questionOrder = cached ? [...cached.order] : [];
      this.questionMapUrl = window.location.href;
      this.scroller = null;
      return true;
    }
    return false;
  }

  // 떠나는 대화의 목록을 기억 (DOM 요소 참조는 버려 메모리에 붙잡아 두지 않음, 최근 20개까지)
  saveConversationCache() {
    const url = this.questionMapUrl;
    this.conversationCache.delete(url);
    if (this.questionMap.size === 0) return;
    const map = new Map();
    this.questionMap.forEach((q, key) => map.set(key, { ...q, element: null }));
    this.conversationCache.set(url, { map, order: [...this.questionOrder] });
    while (this.conversationCache.size > 20) {
      this.conversationCache.delete(this.conversationCache.keys().next().value);
    }
  }

  // 지금 DOM에 있는 질문을 누적 목록에 병합. 순서는 위치값이 아니라 DOM 순서로 정한다
  // (가상화 사이트는 렌더 직후 위치가 확정되지 않아 위치값 정렬이 뒤섞임)
  // 반환값: 새 질문이 추가되었거나 텍스트가 바뀌었는지
  mergeRendered(userMessages, measure) {
    let changed = false;
    let lastIdx = -1;
    let scroller = null;

    userMessages.forEach(el => {
      const key = this.getTurnKey(el);
      if (!key) return;
      const text = this.adapter.extractText(el);
      if (!text || !this.isValidQuestion(text)) return;

      const prev = this.questionMap.get(key);
      if (!prev || prev.text !== text) changed = true;

      let y = prev ? prev.y : null;
      if (measure) {
        scroller = this.findScroller(el);
        y = this.getScrollY(el, scroller);
      }
      this.questionMap.set(key, { key, text, y, element: el });

      // 앞에서 처리한 질문 바로 뒤에 오도록 순서 병합
      const idx = this.questionOrder.indexOf(key);
      if (idx === -1) {
        this.questionOrder.splice(lastIdx + 1, 0, key);
        lastIdx += 1;
      } else if (idx > lastIdx) {
        lastIdx = idx;
      } else {
        this.questionOrder.splice(idx, 1);
        this.questionOrder.splice(lastIdx, 0, key);
        changed = true;
      }
    });

    return changed;
  }

  buildKeyedQuestions() {
    this.questions = this.questionOrder
      .map(key => this.questionMap.get(key))
      .filter(Boolean)
      .map((q, i) => ({ ...q, fullText: q.text, index: i + 1 }));
  }

  // 변화가 감지될 때마다 즉시 호출: 잠깐만 렌더되고 빠지는 질문도 놓치지 않도록 키와 텍스트만 기록
  captureRendered() {
    const urlChanged = this.resetIfUrlChanged();
    const userMessages = this.adapter.getUserMessages();
    if (this.questionMap.size === 0 && !userMessages.some(el => this.getTurnKey(el))) return;
    // 기억해 둔 대화로 돌아온 경우 새 질문이 없어도 목록을 바로 교체
    if (this.mergeRendered(userMessages, false) || urlChanged) {
      this.buildKeyedQuestions();
      this.updateQuestionsList();
    }
  }

  mergeKeyedQuestions(userMessages) {
    this.mergeRendered(userMessages, true);
    this.buildKeyedQuestions();
    this.updateQuestionsList();

    console.log(`🧭 Found ${this.questions.length} valid questions (rendered ${userMessages.length})`);
  }

  // 질문 유효성 검사
  isValidQuestion(text) {
    if (!text || text.length < 2 || text.length > 10000) {
      return false;
    }
    
    const meaningfulText = text.trim().replace(/[\s\n\r\t]/g, '');
    if (meaningfulText.length < 2) {
      return false;
    }
    
    const systemTexts = ['계속', 'continue', '继续', 'continuer', 'continuar', 'fortsetzung'];
    const lowerText = text.toLowerCase().trim();
    
    if (systemTexts.includes(lowerText)) {
      return false;
    }
    
    return true;
  }

  updateQuestionsList() {
    const content = this.shadowRoot.querySelector('.content');

    // 전체 불러오기 버튼은 누적 목록을 쓰는 사이트(Claude, ChatGPT)에서만 표시
    const loadAllBtn = this.shadowRoot.querySelector('.load-all-btn');
    if (loadAllBtn) {
      loadAllBtn.hidden = this.questionMap.size === 0;
    }

    if (this.questions.length === 0) {
      const isOnChat = this.adapter.isOnChatPage();
      
      content.innerHTML = `
        <div class="empty-state">
          <div>${isOnChat ? '질문을 찾는 중...' : '질문을 찾을 수 없습니다.'}</div>
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
        if (question) {
          this.scrollToQuestion(question);
        }
      });

      item.addEventListener('mouseenter', (e) => this.showPreview(e, item));
      item.addEventListener('mouseleave', () => this.hidePreview());
      item.addEventListener('mousemove', (e) => this.updatePreviewPosition(e));
    });
    
    this.checkScrollNeed();
  }

  createShadowDOM() {
    // 이전 인스턴스나 다른 Aicus 빌드가 남긴 패널 제거
    document.querySelectorAll('#aicus-navigator').forEach(el => el.remove());

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
        display: flex;
        flex-direction: column;
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

      .control-btn[hidden] {
        display: none;
      }

      .control-btn:disabled {
        opacity: 0.4;
        cursor: progress;
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

      .header,
      .settings-panel {
        flex-shrink: 0;
      }

      /* 목록 영역은 패널 높이에서 헤더/설정을 뺀 나머지를 채움 */
      .content {
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: hidden;
        padding: 8px 0;
      }

      .content.scrollable {
        overflow-y: auto;
      }

      /* 리사이즈 전 기본 크기 (리사이즈 후에는 패널 height만 사용) */
      .navigator:not(.resized) .content {
        max-height: 300px;
      }

      .navigator:not(.resized).show-settings .content {
        max-height: 250px;
      }

      .navigator.collapsed {
        height: auto !important;
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
    
    setTimeout(() => this.updateContentHeight(), 0);
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
          <button class="control-btn load-all-btn" title="전체 질문 불러오기 (대화를 한 번 훑은 뒤 원래 위치로 돌아옵니다)" hidden>⇅</button>
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

    if (coffeeSection) {
      coffeeSection.addEventListener('click', () => this.showDonationModal());
    }

    let isDragging = false;
    let dragMoved = false;
    let startX, startY, startLeft, startTop;

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
      navigator.classList.add('resized');
      navigator.style.width = newWidth + 'px';
      navigator.style.height = newHeight + 'px';
      this.updateContentHeight();
    };

    const stopResize = () => {
      isResizing = false;
      document.removeEventListener('mousemove', resize);
      document.removeEventListener('mouseup', stopResize);
    };

    resizeHandle.addEventListener('mousedown', startResize);

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

    minimizedIcon.addEventListener('click', (e) => {
      if (!dragMoved) {
        this.toggleMinimize();
      }
      e.preventDefault();
    });

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

    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleSettings();
    });
    
    collapseBtn.addEventListener('click', () => this.toggleCollapse());

    const loadAllBtn = this.shadowRoot.querySelector('.load-all-btn');
    loadAllBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.loadAllQuestions();
    });
    closeBtn.addEventListener('click', () => this.hide());
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

  // 페이지 CSS에 scroll-behavior: smooth가 있어도 애니메이션 없이 즉시 이동
  jumpScroll(scroller, top) {
    scroller.scrollTo({ top, behavior: 'instant' });
  }

  // 대화를 맨 위부터 한 화면씩 훑어 화면 밖 질문까지 모은 뒤 원래 위치로 복귀
  // 사용자가 휠/터치/키 입력을 하면 즉시 중단
  async loadAllQuestions() {
    if (this.isLoadingAll) return;
    const first = this.adapter.getUserMessages()[0];
    if (!first) return;
    const scroller = this.findScroller(first);
    if (!scroller) return;

    this.isLoadingAll = true;
    const btn = this.shadowRoot.querySelector('.load-all-btn');
    btn.disabled = true;

    const startUrl = window.location.href;
    const originalTop = scroller.scrollTop;
    let cancelled = false;
    const cancel = () => { cancelled = true; };
    window.addEventListener('wheel', cancel, { capture: true, passive: true });
    window.addEventListener('touchstart', cancel, { capture: true, passive: true });
    window.addEventListener('keydown', cancel, true);

    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const stillValid = () => !cancelled && window.location.href === startUrl;

    try {
      // 1) 맨 위로: 긴 대화는 맨 위에 닿을 때 이전 메시지를 더 불러오며 위치가 밀릴 수 있어(추정)
      //    scrollTop이 0이고 전체 높이가 두 번 연속 그대로일 때까지 반복 (최대 약 10초)
      let lastHeight = -1;
      let stable = 0;
      for (let i = 0; i < 40 && stillValid(); i++) {
        this.jumpScroll(scroller, 0);
        await wait(150);
        this.mergeKeyedQuestions(this.adapter.getUserMessages());
        if (scroller.scrollTop <= 2 && scroller.scrollHeight === lastHeight) {
          if (++stable >= 2) break;
        } else {
          stable = 0;
        }
        lastHeight = scroller.scrollHeight;
      }

      // 2) 한 화면씩 아래로: 높이가 바뀌어도 실제 끝에 닿거나 더 내려가지 않을 때까지
      // 대기가 너무 짧으면 렌더되기 전에 지나가 질문이 빠질 수 있음 → 개수 확인하며 조정
      const stepSize = scroller.clientHeight * 0.9;
      for (let i = 0; i < 1000 && stillValid(); i++) {
        this.mergeKeyedQuestions(this.adapter.getUserMessages());
        if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2) break;
        const before = scroller.scrollTop;
        this.jumpScroll(scroller, before + stepSize);
        await wait(120);
        if (Math.abs(scroller.scrollTop - before) < 1) break;
      }
      if (stillValid()) {
        this.mergeKeyedQuestions(this.adapter.getUserMessages());
      }
    } finally {
      window.removeEventListener('wheel', cancel, { capture: true });
      window.removeEventListener('touchstart', cancel, { capture: true });
      window.removeEventListener('keydown', cancel, true);
      if (stillValid()) {
        this.jumpScroll(scroller, originalTop);
      }
      btn.disabled = false;
      this.isLoadingAll = false;
    }
  }

  scrollToQuestion(question) {
    // 키가 없는 사이트(Gemini 등): 기존 방식
    if (!question.key) {
      if (question.element) {
        question.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        this.highlightElement(question.element);
      }
      return;
    }

    const findLive = () => this.adapter.getUserMessages().find(el => this.getTurnKey(el) === question.key);

    // smooth: 이미 렌더된 질문으로 갈 때 / instant: 한 화면씩 찾아온 뒤 (애니메이션이 겹쳐 버벅이지 않도록)
    const scrollAndSettle = (el, behavior = 'smooth') => {
      el.scrollIntoView({ behavior, block: 'center' });
      this.highlightElement(el);
      // 스크롤 중 위쪽 질문이 다시 렌더되며 높이가 바뀌면 목표에서 벗어날 수 있어 한 번 보정
      setTimeout(() => {
        const live = findLive();
        if (!live) return;
        // 스크롤이 끝난 뒤의 정확한 위치로 저장값 갱신 (다음 점프가 정확해지도록)
        const stored = this.questionMap.get(question.key);
        if (stored) {
          stored.y = this.getScrollY(live, this.findScroller(live));
        }
        const rect = live.getBoundingClientRect();
        if (rect.top < 0 || rect.bottom > window.innerHeight) {
          live.scrollIntoView({ behavior: 'instant', block: 'center' });
          this.highlightElement(live);
        }
      }, 700);
    };

    const live = findLive();
    if (live) {
      scrollAndSettle(live);
      return;
    }

    // DOM에서 빠진 질문: 저장된 위치(있으면)로 먼저 이동한 뒤,
    // 지금 렌더된 질문들과 목록 순서를 비교해 위/아래로 한 화면씩 이동하며 다시 찾기
    const anyRendered = this.adapter.getUserMessages()[0];
    const scroller = this.scroller && this.scroller.isConnected
      ? this.scroller
      : (anyRendered ? this.findScroller(anyRendered) : null);
    if (!scroller) return;

    const targetIdx = this.questionOrder.indexOf(question.key);
    if (question.y != null) {
      this.jumpScroll(scroller, Math.max(0, question.y - scroller.clientHeight / 2));
    }

    // 대화 전체를 한쪽 끝에서 반대쪽 끝까지 훑을 수 있는 횟수 (긴 답변이 많아도 중간에 멈추지 않도록)
    const stepSize = scroller.clientHeight * 0.8;
    const maxTries = Math.ceil(scroller.scrollHeight / stepSize) + 5;

    let tries = 0;
    const step = () => {
      const el = findLive();
      if (el) {
        scrollAndSettle(el, 'instant');
        return;
      }
      if (++tries > maxTries) return;

      // 렌더된 질문 중 목록에서 가장 앞선 것 기준으로 방향 결정
      // (Claude는 마지막 질문을 항상 렌더해 두므로 최댓값이 아니라 최솟값을 기준으로 삼는다)
      const renderedIdx = this.adapter.getUserMessages()
        .map(m => this.questionOrder.indexOf(this.getTurnKey(m)))
        .filter(i => i >= 0);
      const minIdx = renderedIdx.length ? Math.min(...renderedIdx) : -1;
      const dir = minIdx === -1 || targetIdx < minIdx ? -1 : 1;
      this.jumpScroll(scroller, scroller.scrollTop + dir * stepSize);
      setTimeout(step, 150);
    };
    setTimeout(step, 150);
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
        height: navigator.style.height
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
        navigator.style.height = this.savedStyles.height || '';
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

  // 목록 높이는 CSS(flex)가 정하므로 여기서는 스크롤 필요 여부만 다시 판정
  updateContentHeight() {
    this.checkScrollNeed();
  }

  checkScrollNeed() {
    const content = this.shadowRoot.querySelector('.content');
    if (!content) return;
    setTimeout(() => {
      if (content.scrollHeight > content.clientHeight + 1) {
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
    const headerBg = this.blendWithWhite(accentRgb, 0.10);
    const borderColor = this.blendWithWhite(accentRgb, 0.15);
    const settingsBg = this.blendWithWhite(accentRgb, 0.08);
    const hoverBg = this.blendWithWhite(accentRgb, 0.25);
    const headerBgDark = this.blendWithBlack(accentRgb, 0.2);
    const borderColorDark = this.blendWithBlack(accentRgb, 0.3);
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
    const existingModal = document.getElementById('aicus-donation-modal');
    if (existingModal) {
      existingModal.remove();
    }
    const modal = document.createElement('div');
    modal.id = 'aicus-donation-modal';
    modal.style.cssText = `position: fixed;top: 0;left: 0;width: 100vw;height: 100vh;background: rgba(0, 0, 0, 0.6);display: none;justify-content: center;align-items: center;z-index: 999999;backdrop-filter: blur(4px);font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;`;
    modal.innerHTML = `<div id="modal-content" style="background: white;border-radius: 16px;padding: 24px;max-width: 320px;width: 90%;text-align: center;box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);transform: scale(0.9);transition: transform 0.2s ease;position: relative;"><button class="close-modal-btn" style="position: absolute;top: 16px;right: 16px;width: 24px;height: 24px;border: none;background: none;cursor: pointer;font-size: 18px;color: #999;">×</button><div style="font-size: 18px; font-weight: 600; margin-bottom: 8px; color: #333;">프로그램이 유용했다면<br>개발자를 응원해주세요!</div><div style="font-size: 14px; color: #666; margin-bottom: 20px;">QR코드를 스캔해서 후원할 수 있어요</div><div style="display: flex; gap: 8px; margin-bottom: 20px; justify-content: center;"><button class="korean-btn" style="padding: 8px 16px;border: 2px solid #BCBAE6;border-radius: 8px;font-size: 12px;font-weight: 500;cursor: pointer;background: #BCBAE6;color: white;transition: all 0.2s ease;">Korean</button><button class="international-btn" style="padding: 8px 16px;border: 2px solid #BCBAE6;border-radius: 8px;font-size: 12px;font-weight: 500;cursor: pointer;background: white;color: #BCBAE6;transition: all 0.2s ease;">International</button></div><div style="width: 160px;height: 160px;margin: 0 auto 20px auto;border-radius: 12px;overflow: hidden;box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);background: #f0f0f0;display: flex;align-items: center;justify-content: center;color: #666;font-size: 12px;"><img class="qr-image" src="${chrome.runtime ? chrome.runtime.getURL('docs/daram-qr.png') : 'docs/daram-qr.png'}" alt="후원 QR코드" style="width: 100%; height: 100%; object-fit: cover;"><span class="qr-fallback" style="display: none;">QR 코드를 불러올 수 없습니다</span></div><div style="display: flex; gap: 12px; margin-top: 20px;"><button class="feedback-btn" style="flex: 1;padding: 10px 16px;border: none;border-radius: 8px;font-size: 13px;font-weight: 500;cursor: pointer;background: #f0f0f0;color: #333;transition: all 0.2s ease;">피드백 보내주기</button><button class="close-btn" style="flex: 1;padding: 10px 16px;border: none;border-radius: 8px;font-size: 13px;font-weight: 500;cursor: pointer;background: #BCBAE6;color: white;transition: all 0.2s ease;">닫기</button></div></div>`;
    document.body.appendChild(modal);
    
    const koreanBtn = modal.querySelector('.korean-btn');
    const internationalBtn = modal.querySelector('.international-btn');
    const qrImage = modal.querySelector('.qr-image');
    // 모달은 페이지 DOM에 붙으므로 인라인 onerror는 페이지 CSP에 막힘 → 리스너로 처리
    const qrFallback = modal.querySelector('.qr-fallback');
    qrImage.addEventListener('error', () => {
      qrImage.style.display = 'none';
      qrFallback.style.display = 'block';
    });
    qrImage.addEventListener('load', () => {
      qrImage.style.display = 'block';
      qrFallback.style.display = 'none';
    });
    const closeModalBtn = modal.querySelector('.close-modal-btn');
    const feedbackBtn = modal.querySelector('.feedback-btn');
    const closeBtnMain = modal.querySelector('.close-btn');
    
    koreanBtn.addEventListener('click', () => {
      koreanBtn.style.background = '#BCBAE6';
      koreanBtn.style.color = 'white';
      koreanBtn.style.borderColor = '#BCBAE6';
      internationalBtn.style.background = 'white';
      internationalBtn.style.color = '#BCBAE6';
      internationalBtn.style.borderColor = '#BCBAE6';
      qrImage.src = chrome.runtime ? chrome.runtime.getURL('docs/daram-qr.png') : 'docs/daram-qr.png';
      qrImage.alt = '토스 후원 QR코드';
    });
    
    internationalBtn.addEventListener('click', () => {
      internationalBtn.style.background = '#BCBAE6';
      internationalBtn.style.color = 'white';
      internationalBtn.style.borderColor = '#BCBAE6';
      koreanBtn.style.background = 'white';
      koreanBtn.style.color = '#BCBAE6';
      koreanBtn.style.borderColor = '#BCBAE6';
      qrImage.src = chrome.runtime ? chrome.runtime.getURL('docs/coffee-qr.png') : 'docs/coffee-qr.png';
      qrImage.alt = 'Buy Me a Coffee QR코드';
    });
    
    closeModalBtn.addEventListener('click', () => this.hideDonationModal());
    closeBtnMain.addEventListener('click', () => this.hideDonationModal());
    feedbackBtn.addEventListener('click', () => this.sendFeedback());
    
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

  // 텍스트 노드와 속성값(data-full-text="...") 양쪽에 안전하도록 따옴표까지 이스케이프
  escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  destroy() {
    if (this.observer) {
      this.observer.stop();
    }
    if (this.container) {
      this.container.remove();
    }
    if (this.donationModal) {
      this.donationModal.remove();
    }
    console.log('🧭 Aicus destroyed and cleaned up');
  }
}

// 확장 프로그램 초기화
(() => {
  // all_frames: true 이므로 iframe 안에서는 패널을 만들지 않는다
  if (window.top !== window) return;

  let aicusNavigator = null;

  function initAicus() {
    if (aicusNavigator) {
      aicusNavigator.destroy();
    }
    aicusNavigator = new AicusNavigator();
    console.log('🧭 Aicus initialized');
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
})();