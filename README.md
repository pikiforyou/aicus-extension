# 🌐 Aicus - Chat Navigator

<img src="icons/icon-128.png" width="120" align="right" alt="Aicus Logo" />

**Aicus**는 ChatGPT, Claude, Gemini 대화창에서 사용자가 입력한 질문만 자동 감지하여  
사이드 패널에 리스트업하고, 클릭 한 번으로 해당 질문 위치로 점프할 수 있는 Chrome 확장 프로그램입니다.  

---

## ✨ 주요 기능
- ✅ 사용자 질문 자동 감지 (GPT, Claude, Gemini 지원)  
- ✅ 질문 리스트를 통해 **원클릭 이동**  
- ✅ 패널 드래그 & 리사이즈 & 최소화 지원
- ✅ 다크 모드 지원(새로고침 필요)
- ✅ 테마 색상 커스터마이징 가능

---

## 📸 스크린샷

| 질문 리스트 패널 | 질문 클릭 시 하이라이트 |
|------------------|--------------------------|
| ![패널 스크린샷](docs/screenshot-panel.png) | ![하이라이트 스크린샷](docs/screenshot-highlight.png) |

---

## 🚀 설치 방법

### 개발 모드에서 테스트
1. 이 레포지토리를 다운로드하거나 ZIP으로 압축 해제  
2. `chrome://extensions` 접속  
3. **개발자 모드** ON → **압축해제된 확장 프로그램 로드** → 이 폴더 선택  
4. Gemini / ChatGPT / Claude 페이지에서 동작 확인  

### Chrome Web Store (출시 후)
- [Chrome Web Store 링크]() (추후 등록 시 업데이트)

---

## 📂 폴더 구조
aicus/
├─ manifest.json
├─ content.js
├─ popup.html
├─ popup.js
├─ icons/
│ └─ icon.png
└─ README.md


---

## ⚙️ 개발 관련
- MV3 기반  
- `content.js` → DOM 감시 및 질문 리스트 관리  
- `popup.html / popup.js` → 확장 프로그램 팝업 UI  

---

## 🔒 개인정보 & 데이터 처리
- 이 확장 프로그램은 **사용자 데이터 수집을 하지 않습니다.**  
- 모든 처리는 사용자의 로컬 브라우저 메모리 내에서 이루어집니다.  
- 외부 서버와의 통신이나 로그 전송이 없습니다.  

---

## 📜 라이선스
무단 상업배포, 이용을 금합니다. 개인사용자는 언제나 ✨무료✨!!
*수정, 건의요청, PR, 기능개선은 언제나 환영합니다*

문의 : pikiforyou@gmail.com
