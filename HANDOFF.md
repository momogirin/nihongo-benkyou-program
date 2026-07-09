# 작업 인계 (2026-07-09 기준, 콘텐츠 완료 + 메뉴 구조 개편)

다음 Claude 세션이 이어서 작업할 때 참고할 현재 상태/맥락 요약. 이 파일은 매번 최신 상태로 덮어써서 유지한다(누적 히스토리 아님 — 히스토리는 git log 참고).

## 프로젝트 목표

JLPT 한자·단어·문법 학습 PWA. **궁극적 목표는 "학습 플랫폼"** — 학습·퀴즈·오답노트가 하나로 이어지는 흐름. 화면을 따로따로 만들지 말 것.

**가장 중요한 판단 기준(2026-07-08 사용자가 명시적으로 강조)**: UI를 예쁘게 다듬는 것보다 **실제로 공부에 도움이 되는지**가 항상 1순위. 새 기능/수정을 고를 때 이 기준으로 우선순위를 매길 것.

또 하나의 원칙: AI가 데이터를 지어내지 않고, 가능한 한 공식 데이터셋(KANJIDIC2, JMdict, elzup/jlpt-word-list) 기반으로 `data/*.json`을 생성한다. 어쩔 수 없이 모델이 직접 쓴 필드(문법 설명/예문, 한자 유래 등)는 "생성됐지 교차검증 안 됨" 캐비어트를 코드 주석에 남겨둔다.

## 현재 구조

- **사이드바 메뉴 순서(2026-07-09 개편)**: 홈 / 한자·단어·문법·오답노트 / 백업. 예전엔 한자 관련 기능(학습/퀴즈/오답노트/부수)이 사이드바에 따로따로 있고 단어/문법만 자체적으로 학습+퀴즈+브라우즈를 갖는 불일치 구조였는데, "화면 따로따로 만들지 말 것"이라는 프로젝트 목표에 맞춰 한자도 하나의 메뉴로 통합함. 오답노트는 세 도메인을 다 아우르므로 계속 최상위 메뉴로 유지.
- **한자**: `KanjiPage`(`src/pages/KanjiPage.tsx`) — 상단 탭(학습/퀴즈/부수)으로 기존 `StudyPage`/`QuizPage`/`RadicalsPage` 컴포넌트를 그대로 감싸서 전환하는 얇은 래퍼. 각 컴포넌트 내부 로직은 거의 안 건드림(단, 아래 학습 플로우 변경 참고). study content는 N5~N1 2138자 전부 완료. 부수는 급수 구분 없이 214개 전체를 획수별로 브라우즈+상세 카드로 보는 단일 뷰.
  - `StudyPage`에서 "학습 완료→퀴즈 풀기"를 누르면 `KanjiPage`가 내부적으로 퀴즈 설정을 만들어 퀴즈 탭으로 전환하고, 홈/오답노트에서 오는 `onStartQuiz`/`onResumeQuiz`(퀴즈 설정을 갖고 바로 퀴즈 탭으로 진입)도 그대로 `KanjiPage`가 받아서 처리함 — `App.tsx`의 페이지 상태는 `PageId`에서 `'study'/'quiz'/'radicals'`가 사라지고 `'kanji'` 하나로 합쳐짐.
  - 탭 4개: 학습/퀴즈/부수/**전체보기**(`KanjiListPage.tsx`, 2026-07-09 추가). `RadicalsPage`와 완전히 같은 패턴 — 2138자를 급수별로 그룹핑한 브라우즈 그리드, 타일 클릭 시 부수 페이지와 같은 상세 카드(학습 카드와 동일 필드)로 prev/next 넘기며 볼 수 있음. 학습 진도와 무관하게 그냥 전부 훑어보는 용도(오답노트/퀴즈 기록에 영향 없음).
- **학습 플로우(한자 학습/문법/단어 전부, 2026-07-09 변경)**: "한 번에 N개씩" 배치 크기 입력을 없애고, 시작하면 해당 급수의 남은 항목 전부를 훑는 방식으로 바뀜. 대신 학습 화면 상단에 "나가기" 버튼이 생겨서 언제든 중단할 수 있고, 나간 시점의 카드부터 "이어하기"로 재개됨(진행 중이던 카드를 건너뛰지 않고 그대로 다시 보여줌). 처음엔 한자/문법만 바꿨다가, 같은 날 단어(`VocabPage`)도 동일하게 통일함 — 세 도메인이 같은 패턴을 씀.
- **단어(단어 2138→7972단어, N5~N1 전부)**: `VocabPage` — 학습/브라우즈/퀴즈, 오답노트 연동됨. 단어에 쓰인 한자 정보를 학습 카드에 자동으로 보여줌
- **문법(N5~N1 전부, 총 470개: N5 85·N4 59·N3 71·N2 125·N1 130)**: `GrammarPage` — 학습/브라우즈/퀴즈, 오답노트 연동됨. 예문에 쓰인 한자 정보를 자동으로 보여줌
- 한자/단어/문법 공통: `usedKanji` 헬퍼(`src/lib/kanjiUsage.ts`)로 텍스트에서 kanjiList와 대조해 쓰인 한자를 뽑아냄. 칩 스타일은 `StudyPage.css`의 `study-used-kanji*` 클래스(원래 GrammarPage 전용이었다가 공용으로 이동)
- **오답노트/퀴즈기록/학습진도**: 세 도메인(한자/단어/문법) 각각 **병렬 스키마**로 관리(통합 스키마 아님) — 통합 퀴즈 계획이 없어서 지금은 통합해도 이득이 없고 마이그레이션 리스크만 커서 이렇게 결정함. 홈 화면엔 세 도메인 다 모아서 보여줌(최근 기록은 날짜순 병합).
- **계정**(구 "백업", 2026-07-09 이름 변경): 로그인이 이제 주된 용도라 이름을 바꿈. 파일 export/import도 그대로 유지(현재 버전 9 — SRS 상태 추가로 8→9). localStorage 기반 — 아래 "로그인/계정 동기화" 항목 참고.
- **학습 카드 레이아웃(2026-07-09 변경)**: 카드와 이전/다음 버튼 사이를 전체 화면 높이로 센터링하던 걸 없애고(짧은 카드일 때 간격이 과하게 벌어지는 문제), 버튼 영역의 구분선(border-top)도 제거해서 더 조밀하게 붙어 보이도록 함(`StudyPage.css`). 한자 학습/문법/부수/단어 학습 카드 전부 공용으로 영향받음.
- **학습 카드 디자인 리프레시(2026-07-09)**: 사용자가 인스타 J-POP 단어 계정 스크린샷을 보여주며 "밋밋하다"고 지적 → Artifact로 시안을 먼저 보여주고 확정 후 반영, 그 뒤로도 몇 차례 더 반복됨. 순서대로:
  1. 구조 A안(급수·부수 배지+구분선+예문 볼드) + 팔레트 B안(틴트 대신 solid fill) 확정 → `study-top`/`study-level-badge`/`study-radical-chip`/`study-fields-core`+`study-fields-sub`(구분선)/`study-example-reading`(볼드) 클래스 추가(`StudyPage.css`). 한자 학습(`StudyPage.tsx`)·한자 전체보기(`KanjiListPage.tsx`)는 전부 적용, 단어/문법/부수는 그 도메인에 안 맞는 구조라 급수(+부수) 배지만.
  2. 배지에 `--color-button-fill`(짙은 테라코타)을 썼다가 "초고추장색"이라는 항의 — 흰 글자 대비 때문에 어두운 색을 쓴 건데, 배지처럼 작은 면적에선 칙칙해 보임. `--color-primary`(쨍한 오렌지) 그대로 쓰고 글자를 어둡게 하는 쪽으로 뒤집음(새 토큰 `--color-on-primary`, 이후 3번에서 다시 제거됨).
  3. "N5~N1 공식/통상 색 찾아서 적용해라" → JLPT 자체엔 공식 색상 규정 없음(Japan Foundation 어디에도 언급 없음), 다만 CEFR(N5≈A1~N1≈C1) 자가진단표의 초록→빨강 관행을 차용해 급수별 색 5개 추가(`--color-level-n5~n1`, `--color-on-level`). 모든 학습카드 급수 배지가 이 색을 씀(`study-level-badge-{level}` 클래스, `.toLowerCase()`로 매핑).
  4. 급수색 적용 후 "N2랑 브랜드 오렌지가 겹쳐 보인다" → 원인은 N2(hue 21°)와 브랜드 오렌지(hue 16°)가 사실상 같은 색이었던 것. 급수색을 피해 다니는 대신 **브랜드색 자체를 보라(hue 262°, `--color-primary: #8B5CF6` 등)로 교체** — 급수 스펙트럼(초록 142°~빨강 354°)이 안 쓰는 빈 구간. `tokens.css` 토큰 값만 바꿔서 버튼/사이드바 active/선택 배경 등 14개 파일이 전부 자동 반영됨(개별 파일 수정 없음).
  이 과정 전체에서 매 단계 Artifact로 실제 데이터(心/日 등) 기반 시안을 먼저 보여주고 확정받은 뒤 코드 반영 — 이 레포의 화면 단위 확인 방식과 일치.
- **SRS(간격반복 복습, 2026-07-09 구현 완료)**: 라이트너 방식. `src/lib/storage.ts`의 `recordSrsReview(domain, itemId, correct)`가 한자(`ResultScreen.tsx`)/단어(`VocabPage.tsx`)/문법(`GrammarPage.tsx`) 퀴즈 채점 직후 호출됨 — **퀴즈로 실제 테스트했을 때만** 갱신되고, 학습(flashcard)만 보는 건 카운트 안 됨. 맞히면 박스가 하나 올라가고(0→1→2→3→4, 간격 1/3/7/14/30일) 다음 복습일이 멀어짐, 틀리면 박스 0 + `dueAt`이 즉시(지금)로 리셋되어 바로 "오늘의 복습" 대상이 됨. `getDueSrsIds(domain, allIds)`로 지금 복습해야 할 항목을 뽑고, `HomePage.tsx`가 도메인별로 "N자/개 복습할 시간이에요" 카드를 보여줌 — 클릭하면 기존 오답 재도전과 똑같은 경로(`onStartQuiz`/`onRetryVocab`/`onRetryGrammar`)로 그 항목들만 퀴즈가 시작됨(새 배관 없이 기존 걸 재사용). SRS 상태도 `BackupPayload`에 포함되어 파일 백업/클라우드 동기화 양쪽에 다 실림(`updatedAt` 기준 최신 우선 병합). Playwright로 실제 퀴즈 10문제 풀어서 정답/오답별 박스·dueAt이 정확히 갈리는 것과 홈 카드 반영까지 검증 완료.

## 로그인/계정 동기화 (2026-07-09 구현 완료 + 실제 로그인 성공 확인됨)

사용자가 Firebase 프로젝트(`momogi-9bce4`)를 만들고 위 설정을 전부 마쳐서 **실제 배포 사이트에서 Google 로그인 동작 확인 완료**. 처음엔 `auth/unauthorized-domain` 에러로 팝업이 뜨자마자 닫혔는데(에러 메시지가 뭉뚱그려져 있어서 처음엔 "팝업 차단"으로 오인) — `useCloudSync.ts`의 `describeAuthError()`가 실제 Firebase 에러 코드를 보여주도록 고친 뒤 원인 특정, Authentication → Settings → 승인된 도메인에 `momogirin.github.io` 추가로 해결됨. **7단계 중 이 도메인 승인이 가장 빠뜨리기 쉬운 단계**라는 걸 기록해둠.

**왜 이 방식인가**: GitHub Pages는 정적 배포(`.github/workflows/deploy.yml`, 서버 없음)라 로그인 인증도 사용자별 서버 데이터 저장도 그 자체로는 안 됨. 자체 백엔드를 새로 짜는 대신, 프론트는 GitHub Pages에 그대로 두고 **Firebase(Auth+Firestore)를 클라이언트에서 직접 호출**하는 방식을 택함 — 무료 티어로 충분하고 별도 서버 호스팅이 필요 없어 개인 프로젝트 규모에 가장 현실적.

**구현된 것** (`npm install firebase` 완료):
- `src/lib/firebase.ts` — `VITE_FIREBASE_*` 4개 env var로 초기화. **env var가 하나라도 없으면 `isFirebaseConfigured=false`가 되고 로그인 기능 전체가 조용히 꺼짐**(기존 로컬 전용 동작은 그대로 유지) — 그래서 아래 Firebase 프로젝트 설정을 안 해도 앱은 정상 빌드/동작함.
- `src/lib/storage.ts`의 `buildBackupPayload()`/`applyBackupPayload()`/`isBackupPayload()` — 기존 BackupPage의 export/import 로직을 그대로 뽑아내 공용화(진도는 max, 오답노트/기록은 최신 항목 우선으로 병합 — 원래 있던 로직 그대로라 안전).
- `src/lib/useCloudSync.ts` — Google 로그인/로그아웃, 로그인 시 자동 pull→merge→push, 5분마다 + 탭이 백그라운드로 갈 때 자동 재동기화, `syncNow()` 수동 트리거. Firestore 문서 경로는 `users/{uid}` 하나에 `BackupPayload` 전체를 저장(파일 백업과 완전히 같은 포맷).
- `src/pages/BackupPage.tsx` — 상단에 "계정 동기화" 섹션 추가(로그인 버튼/로그인 상태/마지막 동기화 시각/수동 동기화·로그아웃). 기존 "내보내기/가져오기"는 그대로 아래에 유지(로그인 없이 기기 옮길 때 여전히 유효).
- `.github/workflows/deploy.yml` — 빌드 스텝에 `VITE_FIREBASE_*` 4개를 GitHub Secrets에서 주입하도록 추가.
- `firestore.rules` — 사용자 본인 문서(`users/{uid}`)만 읽고 쓸 수 있게 제한하는 규칙. Firebase 콘솔 Rules 탭에 그대로 붙여넣으면 됨(CLI 불필요).
- `.env.example` — 로컬 개발용 env var 템플릿(`.env.local`로 복사해서 채우기, `.gitignore`에 이미 등록됨).

**사용자가 직접 해야 하는 것** (여기부터는 Claude가 대신 못 함 — Google/Firebase 계정 필요):
1. [Firebase 콘솔](https://console.firebase.google.com)에서 새 프로젝트 생성 (무료 Spark 플랜으로 충분).
2. **Authentication** → 로그인 방법에서 **Google** 제공업체 사용 설정.
3. **Firestore Database** 생성(프로덕션 모드) → **규칙** 탭에 이 리포지토리의 `firestore.rules` 내용을 그대로 붙여넣고 게시.
4. 프로젝트 설정(⚙️) → 일반 → "내 앱"에서 웹 앱 추가 → 나오는 설정값 중 `apiKey`/`authDomain`/`projectId`/`appId` 4개를 확인.
5. **로컬 개발 확인용**: `.env.example`을 `.env.local`로 복사하고 4번 값을 채운 뒤 `npm run dev`로 로그인 버튼이 뜨는지 확인.
6. **실제 배포용**: GitHub 리포지토리 Settings → Secrets and variables → Actions에 `VITE_FIREBASE_API_KEY`/`VITE_FIREBASE_AUTH_DOMAIN`/`VITE_FIREBASE_PROJECT_ID`/`VITE_FIREBASE_APP_ID` 4개를 같은 값으로 등록(그래야 GitHub Pages 빌드에도 적용됨).
7. Authentication → Settings → 승인된 도메인에 GitHub Pages 도메인(`<사용자명>.github.io`)이 자동으로 없다면 추가.

이 7단계를 안 하면(또는 부분적으로만 하면) 앱은 그냥 로그인 없이 지금처럼 동작함 — 망가지지 않음.

## 다음 할 일

핵심 콘텐츠(한자 학습 2138자, 문법 470개, 단어 7972개) 전부 완료, 메뉴 구조 개편(한자 통합)·학습 플로우 변경(배치→나가기/이어하기)·카드 레이아웃 조밀화·로그인/클라우드 동기화(실제 동작 확인됨)·SRS 간격반복 복습·학습 카드 디자인 리프레시(배지+채도)까지 2026-07-09 하루에 전부 구현·검증·배포 완료.

다음 우선순위는 미정. 아래 "나중에 할 수도 있는 작업 후보" 중에서 고르거나 새로 논의 필요.

## 나중에 할 수도 있는 작업 후보 (미확정 — 필요성 자체가 아직 판단 안 됨)

- 청해(리스닝, TTS 기반)
- 모의고사 모드
- 통계·약점 분석 대시보드 (SRS 데이터가 이제 있으니 "이번 주 복습 몇 개 했는지" 같은 것도 가능해짐)

(위 셋은 브레인스토밍만 하고 아직 아무것도 착수 안 함)

## 작업 방식 관련 참고 (중요)

- 매 작업 단위마다 확인 없이 바로 commit+push (momogirin 계정)
- Edit 후 `tsc`/`lint`/`build`를 스스로 돌리지 말 것 — 대신 실제 브라우저로 검증(아래 참고)
- **UI 작업은 반드시 실제 브라우저로 검증할 것.** 이 환경엔 chromium-cli가 없지만, playwright 패키지가 npx 전역 캐시에 있음:
  ```
  NODE_PATH="<npx 캐시 경로, grep -rl playwright /c/Users/*/AppData/Local/npm-cache/_npx/*/package.json 로 찾기>" node script.cjs
  ```
  스크립트는 `.cjs`(CommonJS, `require('playwright')`)로 작성 — ESM `import`는 NODE_PATH를 안 따름.
- `npm run dev` 여러 번 띄우면 포트가 5173→5174→...로 밀림. **5173은 사용자 본인이 띄운 별도 프로그램이니 절대 건드리지 말 것.** 나머지 남은 dev 서버 정리할 땐 Bash의 `taskkill //F`가 이 환경에서 안 먹는 이슈가 있으니 PowerShell `Stop-Process -Id <pid> -Force` 사용.
- 데이터 스크립트는 항상 "파싱→캐시→diff 확인→적용" 순서로.
- 새 화면/기능은 기존 페이지(VocabPage↔GrammarPage처럼)의 구조를 그대로 미러링해서 만들 것 — 이 레포는 도메인별 병렬 구조가 확립된 패턴.
