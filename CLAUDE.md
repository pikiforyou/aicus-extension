# AICUS — Claude Code 작업 안내서

## 프로젝트 개요
- Chrome 확장(Manifest V3). Claude / ChatGPT / Gemini / Copilot 웹에서 "내 질문"만 모아 플로팅 패널로 보여주고, 클릭하면 해당 질문으로 스크롤한다.
- 웹스토어 ID: ndjlfdeoiagafmfbbbfhjoejdlcmhpdl
- 구조: content.js 단일 파일 (빌드 도구 없음, 순수 JS)
  - ChatSiteAdapter: 사이트별 선택자/텍스트 추출 (hostname if/else)
  - OptimizedObserver: MutationObserver + URL 변화 감시
  - AicusNavigator: Shadow DOM(closed) UI, 드래그/리사이즈/테마/후원 모달
- popup.html / popup.js: 툴바 팝업. manifest에 `action` 있음.

## 버전과 기준선
- 기본 브랜치는 `master`. 작업 기준선은 master의 마지막 코드 커밋 5e1de7a (manifest 1.1.0, Copilot 지원 추가).
- 웹스토어 배포본은 1.0.1 = 커밋 d6faf5b (태그 `store-v1.0.1`). 1.1.0은 배포된 적 없음.
  → 다음 배포 버전은 1.2.0. Copilot 지원(1.1.0에서 추가)은 미완성이라 1.2.0에서 제거했다.
- 개선 전후 비교 기준은 태그 `baseline-v1.1.0`(=5e1de7a).
- 작업은 `fix/v1.2.0` 브랜치에서 하고, 배포 후 master에 머지한다.

## 개발 환경
- 저장소: WSL `~/workspace/aicus-extension` (Claude Code와 git은 WSL에서 실행)
- 테스트: Windows Chrome의 "압축해제된 확장 프로그램 로드"
  - 1순위: `\\wsl.localhost\Ubuntu\home\<WSL사용자>\workspace\aicus-extension` 를 직접 로드
  - 직접 로드가 안 되면: `./sync.sh` 로 `C:\dev\aicus-dev` 에 복사한 뒤 그 폴더를 로드 (수정할 때마다 sync 후 확장 새로고침)
- 웹스토어판 Aicus(1.0.1)는 테스트 중 반드시 꺼둔다 (켜져 있으면 패널이 2개 생김)

## 실측 결과 (2026-11-13, 개선 전)
| 포털 | 질문 선택자 | 결과 | 판정 |
|---|---|---|---|
| Claude | [data-testid="user-message"] | 총 4개 질문인데 스크롤 위치에 따라 1개 또는 3개만 감지. 콘솔에 Found 1 ↔ Found 3 이 반복 | 수집 누락 (가상화 렌더링 의심, 확인 필요) |
| ChatGPT | [data-message-author-role="user"] | 메인/대화 모두 0 | 선택자 고장 |
| Gemini | .user-query-bubble-with-background | 7개, 모든 항목 앞에 "말씀하신 내용" | 추출 고장 (숨김 접근성 라벨 포함 의심) |
- 패널 2개 겹침: 원인은 웹스토어판(1.0.1)과 로컬 압축해제판(1.1.0)이 동시에 켜져 있었던 것. 코드 버그는 아니지만, 중복 초기화 가드는 추가한다.
- 리사이즈가 "됐다 안 됐다" 함: 위 겹침 영향일 수 있으므로 패널 1개 상태에서 재확인 필요.
- 웹스토어판(1.0.1)만 켠 Claude 페이지에서도 Found 1 ↔ Found 2 가 반복됨 → Claude 수집 누락은 여전히 확인 필요.
- 콘솔에 🧭 로그가 스캔마다 계속 출력됨(배포본에서 로그 과다).

## 알려진 문제 (master 5e1de7a 코드 기준)
1. 중복 초기화 가드 없음: 이미 #aicus-navigator가 있어도 새 패널 생성. + manifest `all_frames: true`인데 최상위 프레임 확인 없음.
2. 인터벌 누수: onUrlChange()가 setupIframeWatchers()를 다시 호출하면서 기존 setInterval을 해제하지 않음 → 대화 이동마다 5초 타이머 누적.
3. history.pushState/replaceState 덮어쓰기는 content script의 isolated world라 페이지 호출을 못 가로챔 → 실제로는 2초 폴링만 동작.
4. "디바운스"가 실제로는 첫 변화에 즉시 실행되는 스로틀(1초 쿨다운) → 렌더 중간 상태를 읽고, 스트리밍 중 1초마다 전체 스캔.
5. isRelevantChatNode가 closest('[data-testid*="conversation"]')를 써서 대화 영역의 거의 모든 변화가 "관련"으로 판정됨.
6. 스캔마다 getBoundingClientRect 정렬(레이아웃 강제) + innerHTML 전체 재생성 + 리스너 재부착.
7. escapeHtml이 따옴표(")를 이스케이프하지 않음 → data-full-text 속성 깨짐/주입 가능.
8. Copilot 선택자가 지나치게 광범위([class*="user"], [class*="message"], input 등) → 오탐.
9. hostname.includes('bing.com/chat')는 항상 false.
10. isOnChatPage()가 질문 선택자로 판정 → "빈 대화"와 "선택자 고장"을 구분 못 함.
11. 리사이즈가 height가 아니라 max-height만 변경 + CSS 고정 max-height(300px/250px)와 JS updateContentHeight()가 충돌.

## v1.2.0 진행 결과 (2026-11-19, 브랜치 fix/v1.2.0)
### 알려진 문제 처리
| # | 상태 | 커밋 / 근거 |
|---|---|---|
| 1 중복 패널 | 해결 | c3b37cb (최상위 프레임만 + 기존 패널 제거) |
| 2 인터벌 누수 | 해결 | cd94c50 |
| 3 pushState 패치 무효 | 해결 | cd94c50 삭제 → c1b996e Navigation API(`currententrychange`, isolated world에서 동작 실측) + 2초 폴링 fallback |
| 4 스로틀 | 유지 (측정상 문제 없음) | 답변 20초 동안 scan 2회 (Claude/ChatGPT/Gemini 실측). 턴 단위 변화만 감시(94a889d)해서 스트리밍 중 스캔 없음 → 디바운스 불필요 |
| 5 넓은 관련 노드 판정 | 유지 (측정상 문제 없음) | SITES.relevantWithin에 남아 있으나 위 측정에서 스트리밍 중 스캔 없음 |
| 6 정렬/innerHTML 재생성 | 일부 | Claude/ChatGPT는 저장된 y로 정렬, 바뀐 경우만 재렌더(b92cd59, cda9e64). Gemini 경로는 기존 방식 |
| 7 escapeHtml 따옴표 | 해결 | f960669 |
| 8, 9 Copilot | 해결(제거) | 31e2618: Copilot 지원 전체 삭제(미완성·미검증). manifest 주소/all_frames 제거, 모든 사이트에서 돌던 5초 iframe 감시도 삭제 |
| 10 isOnChatPage | 일부 | 0161ff2: hasQuestionElements로 이름 변경, 빈 목록 문구 "아직 질문이 없어요". 빈 대화/선택자 고장 구분은 v1.3.0 selfCheck |
| 11 리사이즈 | 해결 | bdd01af (height 기준 통일) |

### 추가 실측 (Phase 1~2)
- ChatGPT 질문 선택자: `[data-user-message-bubble="true"]`, 이전 대화의 질문을 숨긴 채 남겨둠 → `checkVisibility()`로 보이는 것만 사용
- Claude/ChatGPT 모두 가상화. 턴마다 `data-turn-key`(UUID)가 있어 누적 목록의 키로 사용
- Claude 긴 대화는 맨 위에 닿아야 이전 메시지를 서버에서 받아 위에 붙임(높이 14565→30432) → 전체 불러오기는 맨 위에서 1초간 변화 없을 때까지 대기(ebff565)
- 위쪽 턴이 빠졌는지 판정: 스크롤 영역 맨 위~첫 턴 간격. 전부 그려짐 81px / 가상화 7433~13172px
- Gemini 질문 텍스트에 숨김 제목 `h5.cdk-visually-hidden`("말씀하신 내용 ...") 포함 → 제외

### 구조
- 사이트별 선택자는 파일 맨 위 `SITES` 설정에만 있음(0186548). 사이트 화면이 바뀌면 해당 항목과 selectorVersion만 수정
- 디버그: 사이트 콘솔에서 `localStorage.aicusDebug = '1'` 후 새로고침 → `[aicus-debug]` 로그(개수/시간만). 끄기 `localStorage.removeItem('aicusDebug')`. 배포본에도 숨은 스위치로 유지(일반 사용자에게는 출력 없음, 문의 대응용)
- 추가 기능: 탭 안에서 대화별 목록 기억, ⇅ 전체 질문 불러오기(진행 막대/중단/재시도 안내), 고른 색을 사이트 localStorage(`aicusAccentColor`)에 저장
- manifest 1.2.0, 권한은 기존 `activeTab`만 (추가 없음)

## 작업 규칙 (반드시 지킬 것)
- manifest에 새 permissions / host_permissions 를 추가하지 않는다. (경고가 뜨는 권한을 추가하면 업데이트 시 사용자 동의 전까지 확장이 비활성화됨)
- 선택자는 추측으로 바꾸지 않는다. 내가 실제 페이지 콘솔에서 측정한 결과를 받아서 반영한다. 필요한 측정 스니펫을 나에게 요청하라.
- 측정 스니펫과 디버그 로그는 대화 텍스트를 출력하지 않는다. 개수, 태그명, 클래스명, 속성명만 출력.
- 콘솔 로그는 DEBUG 플래그로 감싸고 배포본에서는 꺼진 상태로 둔다.
- 한 커밋 = 한 가지 수정. 커밋 메시지에 "원인 / 수정 / 확인 방법"을 적는다.
- 기능 추가보다 수정이 먼저. 이번 릴리스(v1.2.0)에서는 외부로 어떤 데이터도 보내지 않는다.
- 각 수정 후 내가 브라우저에서 확인할 수 있게 "테스트 체크리스트"를 함께 제시한다.
- 확신이 없는 원인은 "추정"이라고 표시하고, 확인 방법을 제시한다.

## 단계별 계획

### Phase 0 — 기준선 확보 (코드 수정 없음)
- 배포본(store-v1.0.1)과 작업 기준(baseline-v1.1.0)의 차이 요약 (git diff store-v1.0.1 baseline-v1.1.0 --stat)
- 위 "알려진 문제" 각각이 현재 코드에 실제로 있는지 줄 번호와 함께 확인
- Claude 수집 누락 원인 확정을 위한 측정 방법 제시: Aicus를 끈 상태에서 스크롤 위치별 [data-testid="user-message"] 개수 비교 → 스크롤에 따라 개수가 바뀌면 Claude가 화면 밖 메시지를 DOM에서 제거(가상화)하는 것
- 개선 전 성능 측정 장치 설계: "답변 1개 생성 동안 스캔 실행 횟수", "대화 10번 이동 후 활성 타이머 수"

### Phase 1 — 버그 수정 (v1.2.0)
1. 중복 패널: 최상위 프레임에서만 실행(window.top === window), 기존 #aicus-navigator 제거 후 생성
2. ChatGPT 선택자 교체 (내 측정값 기반)
3. Gemini 텍스트 추출: 숨김 라벨 제외 (내 측정값 기반)
4. Claude 수집 누락: 가상화가 원인이면 스캔 결과로 목록을 "교체"하지 않고 "누적" (안정적인 키로 병합, 화면 밖 질문 클릭 시 위치 근사 스크롤 후 재탐색)
5. escapeHtml 따옴표 처리
6. 리사이즈: height 기준으로 통일, CSS 고정 max-height 제거
7. 인터벌 누수 제거, 무효한 pushState 패치 제거(폴링 또는 navigation 이벤트로 일원화)

### Phase 2 — 구조 개선 (v1.2.0)
- 선택자 모듈화: 서비스별 설정 객체로 분리
  ```js
  const SITES = {
    claude:  { match: h => h.endsWith('claude.ai'), selectorVersion: '2026.11.1',
               userMessage: '...', assistantMessage: '...', extract: el => ... },
    chatgpt: { ... }, gemini: { ... }, copilot: { ... }
  };
  ```
  hostname if/else 분기를 이 설정 조회 하나로 교체. Copilot 선택자는 측정된 것만 남긴다.
- 옵저버: 진짜 trailing 디바운스(변화가 멈추고 N ms 후 1회), 관련 노드 판정은 질문/응답 선택자 기준으로 좁힘, 목록은 바뀐 경우에만 다시 그림
- DEBUG 플래그로 로그 정리
- Phase 0의 측정을 다시 실행해 개선 전후 수치 비교

### Phase 3 — 다음 릴리스(v1.3.0), 이번엔 연결 지점만 설계
- selfCheck: scanForQuestions에서 이미 구한 값 재사용
  - 응답 요소 ≥1 인데 질문 원시 개수 0 → 선택자 고장
  - 원시 개수 >0 인데 유효 질문 0, 또는 항목 대부분이 같은 접두어로 시작 → 추출 고장
  - 응답·질문 모두 0 → 빈 대화(정상)로 보고 무시
- 알림 폭주 방지: 변화 멈춤 후 약 3초 디바운스 / 탭당 1회 / 서버에서 서비스:모듈:버전:날짜 키로 하루 1회
- 사용자에게 툴바 배지 "!"는 띄우지 않는다. 대신 패널 안에 부드러운 안내문("이 사이트 화면이 바뀌어 일부 질문을 못 찾을 수 있어요"). 배지는 개발용(압축해제) 빌드에서만: `!('update_url' in chrome.runtime.getManifest())`
- 전송은 content script → background → Cloudflare Worker(CORS 응답). 서비스명/모듈명/버전만 전송, 대화 내용 없음.

## 테스트 체크리스트 (수정마다)
- [ ] chrome://extensions 에서 웹스토어판 Aicus 꺼짐, 개발판만 켜짐
- [ ] 확장 새로고침(↻) 후 포털 탭도 새로고침
- [ ] Claude / ChatGPT / Gemini 각각: 질문 개수가 실제와 같은가
- [ ] 질문 텍스트에 이상한 접두어가 없는가
- [ ] 새 질문을 보내면 목록에 추가되는가
- [ ] 다른 대화로 이동하면 목록이 바뀌는가
- [ ] 긴 대화에서 위/아래로 스크롤해도 목록이 줄지 않는가
- [ ] 항목 클릭 시 해당 질문으로 이동하는가
- [ ] 패널이 1개만 있는가 (`document.querySelectorAll('#aicus-navigator').length === 1`)
- [ ] 리사이즈/최소화/다크모드 정상
- [ ] chrome://extensions 의 Aicus 카드에 "오류" 버튼이 없는가

## 배포 체크
- manifest.json "version" 올림 (현재 배포본 버전보다 커야 함)
- zip에는 실행 파일만: manifest.json, content.js, popup.html, popup.js, icons/, docs/*.png
  (CLAUDE.md, README.md, .git, .github, privacy-policy.md 제외)
- 배포 후 main에 머지하고 태그(v1.2.0) 생성, push
