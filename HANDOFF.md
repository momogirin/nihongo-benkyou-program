# 작업 인계 (2026-07-22 갱신)

다음 Claude 세션이 이어서 작업할 때 참고할 현재 상태/맥락 요약. 이 파일은 매번 최신 상태로 덮어써서 유지한다(누적 히스토리 아님 — 히스토리는 git log 참고).

> **일본어 학습 기능의 "앞으로 할 일"은 이제 `ROADMAP.md`가 추적한다** — 항목별 상태·근거가 거기 있음. 아래 HANDOFF는 "지금까지 무엇을 했는가" 스냅샷.

## 2026-07-22 세션 추가분 — 가나·활용 신규 기능 + 메뉴 개편

이날 일본어 학습 기능을 대거 보강했다(ROADMAP.md의 항목들 + 로드맵 밖 신규 2개). 커밋 참조.

- **가나(히라가나·가타카나) 학습 신규**: `data/kana.json`(오십음도 청음 46·탁음 20·반탁음 5·요음 33 = 104자, 히라가나/가타카나 페어 + 헵번 romaji, 청음 46자 예시 단어) → `build-kana-data.mjs` → `src/data/kana.ts`. `KanaPage.tsx`(표=오십음도 그리드 / 학습=플래시카드 / 퀴즈=가나↔로마자 + **표기 구분(최소대립쌍)**). 최소대립쌍은 `data/kana-pairs.json`(촉음·장음·요음 22쌍, ROADMAP #9).
- **동사·형용사 활용(活用) 신규**: `data/conjugation.json`(엄선 N5/N4 동사 58·형용사 34 = 92개, 5단/1단 분류 검증) → `src/data/conjugation.ts`. 규칙 엔진 `src/lib/conjugation.ts`(五段 음편·ない형 특례·する/来る 불규칙·いい 불규칙, **동사 10형**: 사전/ます/て/ない/た/가능/의지/조건ば/사역/수동, **형용사 5형**: 사전/부정/과거/て/부사). `ConjugationPage.tsx`(활용표 학습 + 퀴즈 2모드: 활용형 만들기 / 활용형 읽기[형태 식별]). 一段 가능형=수동형 동형은 퀴즈 선택지 중복 제거로 처리. ROADMAP #6(드릴 부분 완료, 전체 vocab pos 태깅은 확장 과제로 남김).
- **한자→단어 역인덱스**(ROADMAP #8-A): `src/lib/kanjiWordIndex.ts`, 한자 전체보기 상세에 "이 한자가 쓰인 단어" 표시(신규 데이터 0건).
- **메뉴 구조 개편**: 일본어 그룹을 학습단계별 소분류로 재편 — **문자**(가나·한자) / **어휘·문법**(단어·문법·활용) / 모의고사. **오답노트는 과목 공용이라 일본어 그룹 밖 최상위로 승격**. `Sidebar.tsx`의 `JAPANESE_SECTIONS`(NavSection[] 구조) + `.nav-subsection-label` CSS.
- 새 데이터 빌드 스크립트 npm: `data:build:kana` / `data:build:kanaPairs` / `data:build:conjugation`.
- **주의**: 이 세션은 다른 세션과 **동시에 main에 push**됨(가나 커밋 1532178 위로 한자표기퀴즈·자가평가SRS·자타동사퀴즈 등이 병렬로 얹힘). 로컬 상태가 fetch로 갱신될 수 있으니, 큰 작업 전 `git fetch`로 origin 확인할 것. 특히 `storage.ts`(BackupPayload 버전)는 여러 세션이 자주 건드려 충돌 위험이 크다 — 가나 퀴즈 SRS/오답노트 연동(ROADMAP #11)이 미착수인 이유.

---

## (이하 2026-07-20 이전 스냅샷)

## 일본어 단어(vocab-*.json) 검사 + N2/N1 예문(exampleJp/exampleKr) 보완 (2026-07-20 완료)

사용자가 "일본어 단어 다시 전부 검사, 보완도 해라"고 요청 → 실제로 확인해보니 **N3/N2/N1(총 6586개)에 exampleJp/exampleKr 필드가 아예 없었음**(N5/N4만 있었음, `build-vocab-data.mjs` 헤더 주석에 "점진적 롤아웃"이라고 적혀있던 그 상태). 사용자가 "N3/N2/N1 예문 전부 생성"으로 확정 승인.

**진행 방식**: 각 급수를 80~100개 단위 청크로 나눠 서브에이전트에 병렬 위임(N2/N1 재개 시점부터는 웨이브당 3~6개, [[feedback-subagent-batch-sizing]] 기준). 각 에이전트는 (1) word/reading/meaningKr 오류 검사·수정 (2) exampleJp/exampleKr 신규 생성(사전 대조 없는 모델 생성 콘텐츠, 기존 vocab.ts 헤더 주석의 "generated, not cross-verified" 컨벤션과 동일선상) 담당. 웨이브 하나 끝날 때마다 검증→`npm run data:build:vocab`→`tsc --noEmit`→즉시 commit+push(청크 끝날 때까지 기다리지 않음).

**⚠️ 중요 — 서브에이전트가 스스로 "위임했다"/"기다리겠다"며 미완료 종료하는 사고가 반복 발생**: 지시받은 general-purpose 서브에이전트가 실제로는 하위 위임 도구가 없는데도 마치 백그라운드에 맡긴 것처럼 응답하고 파일을 실제로 Write하지 않은 채 끝난 경우가 여럿 있었음. 완료 보고를 받으면 **반드시 실제 파일을 열어 exampleJp/exampleKr이 채워졌는지 스크립트로 검증**할 것 — 보고 텍스트만 믿지 말 것.

**⚠️ 여러 서브에이전트가 같은 JSON 파일(`vocab-n1.json`)의 다른 구간을 동시에 Edit하면 파일 동기화 경합으로 일부 Edit가 조용히 유실될 수 있음** — 실제로 웨이브당 6개로 늘렸을 때(N1-1511~1700, 2041~2400 구간) 여러 에이전트가 "Write verification failed"/디스크 크기 불일치를 스스로 감지하고 재적용해서 최종적으로는 missing 0건으로 마무리한 사례가 여러 건 있었음. 에이전트에게 "완료 후 반드시 node 스크립트로 재검증하고, missing이 있으면 될 때까지 재적용하라"고 명시적으로 지시할 것 — 실제로 이 지시 덕에 전부 자체 복구됨. 웨이브 완료 후에도 **오케스트레이터가 한 번 더 전체 재검증**하는 게 안전(1511~2400 구간은 재검증 결과 실제로 결측 0건, 문제 없었음).

**완료 (2026-07-20)**: N5 718개 전체·N4 668개 전체·N3 2139개 전체·N2 1748개 전체·N1 2699개 전체 — vocab-*.json 총 7972개 항목 exampleJp/exampleKr 결측 0건. 마지막 남았던 N1-2421~2670 구간(실제 결측 190개, 이전 세션에서 TaskStop으로 일부만 반영돼 있던 상태였음)을 5개 서브에이전트에 병렬 위임(2421~2460/2461~2490+2503/2537~2580/2596~2635/2636~2670)해 마무리. 완료 후 오케스트레이터가 190개 전체 + N1 파일 전체 재검증(결측 0건, 중복 id 0건, 총 2699개 유지 확인) → `npm run data:build:vocab` → `tsc -b --noEmit` 통과 확인 → commit+push 완료(`31d37c3`). N1-2538 "夜更し"→"夜更かし"(오쿠리가나 오탈자) 추가 수정.

- 발견된 오류 수정 예시(전부 스크립트 검증 없이 모델 판단): N5 "伯父" → "伯父さん"(읽기 불일치), N5 "曲る"→"曲がる"(비표준 오쿠리가나), N5 "ラジオカセ"→"ラジカセ"(존재하지 않는 표기), N4 reading 누락 3건(うそ/いただく/あいさつする/かまう), N3 "工場" 읽기 こうば→こうじょう, N3 "唯"→"たった"(한자 자체가 해당 읽기 없음), N2 "卒直"→"率直"(오탈자), N1 "摩する"→"擦る"(word/reading/meaning 불일치) 등. 전체 수정 내역은 이 세션의 대화 로그 참고(git diff에도 남아있음).

## 주제 태그(topicTags) 추가 (2026-07-16 완료, toeic 티어만)

영어(TOEIC) 2단계(보류) 후보 중 하나. HANDOFF.md에 "주제 태그(사무/인사/여행/재무 등 — NGSL/TSL에 없어서 별도 소스나 수작업 태깅 필요)"라고 적혀있던 것 그대로, 원본 데이터셋에 없는 정보라 수작업(서브에이전트 위임) 태깅으로 진행.

- **범위**: toeic 티어(1,250개)만 — core1~3(NGSL 일반어휘 2,809개)은 the/be/and 같은 기능어·범용어 비중이 높아 주제 태그 효과가 낮다고 판단해 제외. 나중에 필요해지면 같은 패턴으로 확장 가능.
- **카테고리 12개(고정)**: office(사무)/hr(인사)/meeting(회의·발표)/marketing(마케팅)/finance(재정·회계)/contract(계약·법률)/tech(IT·기술)/manufacturing(제조·물류)/travel(여행)/dining(식당·행사)/realestate(부동산·시설)/health(의료·건강) — 토익 Part 7 지문에서 반복되는 소재 기준.
- **진행 방식**: 1,250개를 313개씩 4등분(a~d)해서 서브에이전트 4개에 병렬 위임, 각자 word/pos/meaningKr만 보고 12개 카테고리 중 명확히 관련 있는 것만(최대 2개, 없으면 빈 배열) 판단해 `data/raw/topic-tags-chunk-{a,b,c,d}.json`에 저장 → 병합 검증(1,250개 전량 매칭, 중복 0건, 잘못된 태그명 0건) → `data/english-vocab-toeic.json`에 `topicTags` 필드 반영(빈 배열은 기존 optional 필드 컨벤션대로 필드 자체 생략) → 730개 단어에 태그 적용, 520개는 태그 없음(순수 일상어/기능어/스포츠 등 — 억지로 끼워맞추지 않음, 이 프로젝트 "데이터를 지어내지 않는다" 원칙).
- `scripts/build-english-vocab-data.mjs`: `EnglishTopicTag` union 타입 + `EnglishVocabWord.topicTags?: EnglishTopicTag[]` 추가 → `npm run data:build:englishVocab` 재실행해서 `src/data/englishVocab.ts`까지 반영 완료.
- **화면 반영**: `EnglishVocabPage.tsx`의 전체보기(`browse`)에 주제 태그 필터 칩 추가(멀티셀렉트, OR 조건 — 하나라도 겹치면 표시). `hasTopicTagsInLevel` 가드로 태그가 없는 급수(core1~3)에서는 필터 UI 자체가 안 뜸(빈 필터를 보여주지 않기 위함). 학습 카드/전체보기 상세 카드의 급수·품사 칩 옆에도 주제 태그 배지 표시.
- `data/raw/topic-tags-chunk-{a,b,c,d}.json`/`topic-tags-merged.json`은 재현 가능한 원자료로 커밋에 남김(이 프로젝트가 `word-families-chunk-*.json` 등 이전에도 이런 중간 산출물을 원자료로 보존해온 관례를 따름). 순수 입력 분할본(`topic-tag-input-*.json`)은 원본에서 재생성 가능해 삭제.
- **남은 것**: core1~3 확장 여부는 미정(필요성 재논의 필요), 유의어 퀴즈/콜로케이션은 여전히 미착수.

## 한자 데이터 결측치 11자 수정 (2026-07-16) — "일본어 다했어?" 재검증

사용자가 "일본어 다했어?"라고 물어서 실제로 `data/kanji.json`(2138자)·`vocab-*.json`(7972개)·`grammar-*.json`(470개)의 핵심 필드 결측 여부를 스크립트로 직접 재검증 → **아래 "데이터 품질 감사" 섹션의 "전수 검토 완료" 서술과 달리 한자 11자에 진짜 결측치가 있었음**(그 감사는 이미 채워진 필드의 *내용 정확성*만 봤고, 필드 자체가 비어있는지는 별도로 안 살펴봤던 것으로 보임). vocab의 2건(N4-309 ごらんになる/N4-552 かまう)은 결측이 아니라 `word` 자체가 순수 히라가나라 `reading`이 원래 빈 게 맞음(정상 데이터).

- 서브에이전트로 11자를 KANJIDIC2/kanjipedia/kotobank 등 표준 소스 기준 조사 후 반영:
  - **込/枠/畑/栃/峠/匂 (6자)**: `onJp`가 빈 문자열인 게 오류가 아니라 정답이었음 확인(전부 訓読み専用 国字 — 음독 자체가 존재하지 않음, KANJIDIC2 기준 확실). **수정 안 함.**
  - **擦**: `kunKr` 없음 → "문지를 찰"로 채움.
  - **挿**: `kunKr` 없음 → "꽂을 삽"으로 채움.
  - **塡**: 예문 전체 없음 → 補塡/ほてん/보전(부족분을 메워 채움).
  - **朕**: 예문 전체 없음 → 조사 결과 두 안(①역사적 관용구 ②단독 글자) 중 사용자가 ①을 확정: 朕は国家なり/ちんはこっかなり/짐이 곧 국가다(루이 14세의 말을 일본어로 번역한 관용구, 다른 사전에도 흔히 등재됨). 朕 자체는 훈독이 없는(kunJp: "—") 옛 천황 전용 1인칭이라 현대 복합어가 없어서 이 방식을 택함.
  - **頰**: 예문 전체 없음 → 頰骨/ほおぼね/광대뼈.
- `npm run data:build`로 `src/data/kanji.ts` 재생성 완료. 이제 한자 2138자 전부 핵심 필드(kunKr/kunJp/exampleKanji/exampleJp/exampleKr) 결측 0건(onJp만 6자가 의도적으로 빈 문자열).
- **교훈**: "전수 검토했다"는 과거 기록도 실제로 스크립트로 재검증하기 전까진 100% 신뢰하지 말 것 — 그 감사가 정확히 무엇을 검증했는지(내용 오류 vs 필드 존재 여부)가 다를 수 있음.

## TTS(발음 듣기) 및 딕테이션 퀴즈 전면 제거 (2026-07-20 완료)

아래 두 섹션("딕테이션 퀴즈 추가", "TTS 전 도메인 확장")에서 구현했던 내용을 사용자 요청으로 전부 되돌림. 브라우저 내장 Web Speech API 기반이었는데, 실사용 품질/필요성 문제로 제거 결정.

- 삭제된 파일: `src/lib/tts.ts`, `src/components/SpeakerButton.tsx`.
- 제거된 사용처: `StudyPage.tsx`/`KanjiListPage.tsx`/`VocabPage.tsx`/`GrammarPage.tsx`/`WrongNotePage.tsx`의 표제어 옆 스피커 버튼, `EnglishVocabPage.tsx`의 학습·전체보기·퀴즈 프롬프트 스피커 버튼. 관련 CSS(`vocab-word-with-speaker`/`vocab-speaker-button`/`grammar-example-with-speaker`)도 `StudyPage.css`/`GrammarPage.css`에서 제거.
- **딕테이션(듣고 쓰기) 퀴즈 자체를 완전히 삭제**(TTS 발음 재생을 전제로 한 퀴즈라 TTS 제거 시 성립 불가): `EnglishVocabPage.tsx`의 `quizType`이 `'meaning' | 'derivation'` 2종으로 축소, 관련 phase(`dictationQuiz`/`dictationQuizResult`)·state·핸들러 전부 제거. `lib/englishVocabQuizGenerator.ts`의 `EnglishVocabDictationQuestion`/`generateEnglishVocabDictationQuestions`/`englishVocabDictationLevelPool` 삭제. `storage.ts`의 `EnglishVocabDictationInProgressQuiz` 타입·CRUD·`BackupPayload` 필드 삭제(과거 백업 파일에 남은 필드는 그냥 무시됨 — `BackupPayload.version`은 14 그대로 유지, 하위 호환 문제 없음). `VocabPage.css`의 `vocab-dictation-prompt`/`vocab-dictation-pos` 삭제.
- 오답노트에 이미 쌓인 딕테이션 퀴즈발 wrong note는 그대로 남아있음(별도 마이그레이션 안 함 — 재도전 시 기존 뜻맞히기 퀴즈로 자연스럽게 흡수됨).

## 홈 화면 재구성 (2026-07-16 완료)

사용자가 "홈 화면이 난잡하다"고 지적 → 기존엔 복습(SRS due)/학습 진도/마무리못한 퀴즈(이어하기)/오답 재도전, 성격이 다른 네 종류 항목이 `home-entry-grid` 하나에 같은 카드 스타일·같은 균일 그리드로 뒤섞여 있었음(영어단어 도메인까지 연동되면서 최대 17개 카드까지 늘어날 수 있는 상태였음 — 우선순위가 전혀 안 보이는 문제). Artifact로 "긴급도 우선 그룹핑 + 섹션당 압축" 시안을 먼저 보여주고 반영:
- **지금 할 일**: SRS 복습(긴급, 빨간 왼쪽 테두리)과 마무리못한 퀴즈(이어하기, 파란 테두리)를 긴급도순 세로 리스트 하나로 통합(`home-priority-list`/`home-priority-card`).
- **학습 진도**: 카드+텍스트였던 걸 프로그레스 바 형태로 압축(`home-progress-grid`/`home-progress-card`).
- **오답 재도전**: 도메인별 카드 3~4개였던 걸 알약형 칩 한 줄로 압축(`home-retry-row`/`home-retry-chip`).
- **학습 통계**/**최근 기록**: 기존 레이아웃 그대로 유지, 섹션 제목 클래스만 `home-section-title`로 통일(대문자+letter-spacing, 기존 `home-stats-title`/`home-history-title`과 시각적으로 통일).
- `HomePage.tsx`는 기존에 JSX로 직접 나열하던 카드들을 `priorityItems`/`progressItems`/`retryItems` 배열로 먼저 구성한 뒤 `.map()`으로 렌더링하는 구조로 바꿈(도메인 4개×항목 종류가 늘어날수록 JSX 반복이 심해지던 걸 정리). `home-entry-grid`/`home-entry-card` 클래스는 완전히 제거(대체됨).
- 시안: https://claude.ai/code/artifact/be2579c8-873b-4a4f-ad1b-3c4d2315df2b

## ⚠️ 배포 빌드 깨짐 발견 및 수정 (2026-07-16)

새 세션 시작 시 `npx tsc -b --noEmit`으로 베이스라인을 확인해보니, **`20e82e8`(2026-07-14 11:13, 오답노트 삭제 확인 모달을 커스텀으로 바꾼 커밋)부터 이번 세션 시작 시점(`eed89d5`)까지 GitHub Actions 배포가 16회 연속 실패 중**이었음(`gh` CLI가 없어서 GitHub REST API로 직접 확인: `curl https://api.github.com/repos/momogirin/nihongo-benkyou-program/actions/runs`). 즉 그 사이 커밋된 영어(TOEIC) 단어 기능(데이터 4,059단어+파생어 세트+화면) 전체가 **실제 라이브 사이트엔 하나도 반영 안 된 채로 하루 넘게 방치**돼 있었음. 원인 4가지, 전부 수정 완료:
1. `WrongNotePage.tsx`: `confirmTarget`(널 가능)을 `performRemove(confirmTarget: ConfirmTarget)`에 그대로 넘기던 것 — `useEffect` 안 `handleKeyDown` 콜백에서는 바깥의 `if (!confirmTarget) return` 가드가 타입 내로잉으로 이어지지 않아서 생긴 문제. `confirmTarget &&` 조건을 같은 `if`문 안으로 옮겨 해결(20e82e8, 최초 원인).
2. `types.ts`의 `SimpleQuizHistoryEntry.level`이 `KanjiLevel`로만 타입돼 있었는데 `EnglishVocabPage.tsx`가 이 인터페이스를 그대로 재사용하면서 `EnglishLevel`을 넘기고 있었음 → `level: KanjiLevel | EnglishLevel`로 확장.
3. `SrsDomain`에 `'englishVocab'`이 추가된 뒤 `statsSummary.ts`의 `getWeeklyStats()`/`getDomainAccuracies()`가 영어 도메인을 안 챙기고 있었고(타입 에러 + 실제로도 통계에서 영어가 빠짐), `HomePage.tsx`의 `DOMAIN_LABEL`에도 `englishVocab` 키가 없었음 → 둘 다 추가.
   - **주의**: 이번에 고친 건 "통계(도메인별 누적 정답률/암기 정착도) 섹션이 englishVocab을 포함해서 타입 에러 없이 렌더링되게" 하는 것까지만이었음. **2026-07-16 같은 날 이어서 나머지도 완료** — `HomePage.tsx`에 영어단어 복습(SRS)/학습 진도/마무리못한 퀴즈/오답 재도전/최근 기록 카드를 나머지 세 도메인과 나란히 추가(`onGoToEnglishVocab`/`onRetryEnglishVocab` prop 추가, `App.tsx`에서 연결 — `retryEnglishVocab`은 이미 오답노트 페이지용으로 존재해서 재사용). `studyProgress.ts`에 `getEnglishVocabStudyProgressSummary()` 추가(기존 세 도메인과 같은 패턴), `StudyProgressSummary.level` 타입을 `KanjiLevel | EnglishLevel`로 확장.
4. `npm run build`(`tsc -b && vite build`) 로컬 재현 성공 + Playwright로 실제 회귀 확인(오답노트 삭제 모달 Enter로 실제 삭제됨, 영어 단어 퀴즈 4지선다 응답 정상, 홈 통계에 영어단어 정답률 표시) — 콘솔 에러 0건. 커밋 후 push 완료, 다음 GitHub Actions 배포가 성공하는지는 사용자가 확인.

## 프로젝트 목표

JLPT 한자·단어·문법 학습 + (2026-07-14부터) 영어(TOEIC) 단어 학습 PWA. **궁극적 목표는 "학습 플랫폼"** — 학습·퀴즈·오답노트가 하나로 이어지는 흐름. 화면을 따로따로 만들지 말 것.

**가장 중요한 판단 기준(2026-07-08 사용자가 명시적으로 강조)**: UI를 예쁘게 다듬는 것보다 **실제로 공부에 도움이 되는지**가 항상 1순위. 새 기능/수정을 고를 때 이 기준으로 우선순위를 매길 것.

또 하나의 원칙: AI가 데이터를 지어내지 않고, 가능한 한 공식 데이터셋(KANJIDIC2, JMdict, elzup/jlpt-word-list, NGSL/TSL) 기반으로 `data/*.json`을 생성한다. 어쩔 수 없이 모델이 직접 쓴 필드(문법 설명/예문, 한자 유래 등)는 "생성됐지 교차검증 안 됨" 캐비어트를 코드 주석에 남겨둔다.

## 영어(TOEIC) 카테고리 추가 (2026-07-14 계획 확정, 구현 위임됨)

사용자가 "영어는 갈래가 많지만 단어 암기가 제일 실용적"이라며 영어 카테고리를 새로 추가 요청. 대상은 **토익(TOEIC) 응시자**로 명확히 함(일반 영어가 아님). 이 섹션 이후 사용자가 "전적으로 판단에 맡긴다"고 위임했으므로, 아래 계획을 기준으로 매 단계 확인 없이 진행하고 커밋+푸시할 것.

**구조 결정 (확정)**:
- 사이드바에 "일본어"의 형제 그룹으로 "영어" 신설. `Sidebar.tsx`의 기존 주석("일본어는 지금 유일한 과목 그룹, 나중에 다른 언어가 형제 그룹으로 옴")이 정확히 이 상황을 예견하고 있었음.
- 첫 하위 메뉴는 "단어" 하나만 (문법/듣기 등은 나중 확장 여지, 지금 안 만듦).
- 기존 `VocabPage`(일본어 단어: 학습/브라우즈/퀴즈, 오답노트 연동) 패턴을 그대로 미러링하는 새 페이지. 기존 `vocab`(일본어) PageId는 안 건드리고 새 PageId 추가(최소 diff).
- 오답노트는 기존처럼 도메인별 병렬 스키마로 네 번째 도메인(영어) 추가해서 편입.

**데이터 소스 (확정)**: ETS가 급수별 공식 단어 리스트를 공개하지 않아서, 대체 공식 데이터셋으로 **NGSL + TSL** 사용.
- **NGSL**(New General Service List): 케임브리지 코퍼스 기반 고빈도 일반 영단어 2,809개, 빈도 랭킹(SFI) 포함.
- **TSL**(TOEIC Service List): 토익 준비자료 코퍼스 기반 토익 특화 단어 1,250개, 빈도 랭킹 포함. NGSL과 합치면 토익 지문/시험 최대 99% 커버 주장(Browne & Culligan).
- 다운로드는 인증 없이 직접 가능 확인됨: `https://www.newgeneralservicelist.com/s/NGSL_12_stats.csv`, `https://www.newgeneralservicelist.com/s/TSL_12_stats.csv` (그 외 lemmatized/definitions 버전 등도 `/s/` 밑에 있음).
- **라이선스 주의**: TSL은 CC BY-SA 4.0(출처표시-동일조건변경허락) — 가공해서 저장소에 포함할 때 출처 표시 필요. NGSL 쪽 정확한 라이선스 문구는 실제 파일/사이트에서 재확인 필요(아직 100% 확인 못함 — 데이터 반영 시 같이 확인할 것).
- **레벨(급수) 축**: JLPT처럼 이름 붙은 급수가 없고 순수 빈도 랭킹이므로, 랭킹 구간을 잘라 급수처럼 쓸 것. **목표 점수대(700/800/900) 프레이밍은 하지 않음** — 실제 점수 상관관계가 검증된 게 아니라서 근거 없는 주장이 됨(사용자에게 이미 설명하고 동의받음).

**기능 우선순위 (사용자 확인 완료, 2026-07-14)**: 토익 시험 구조상 단어는 두 갈래로 쓰임 — Part 5(문법/어휘 빈칸, 품사 파생어 구별이 핵심)와 Part 7/리스닝(문맥 속 유의어·비즈니스 어휘). 이를 반영해 아래 순서로 구현:
- **1단계(MVP, 지금 만들 것)**: 기본 카드(단어/품사/뜻/예문) + 파생어 세트(명사/동사/형용사/부사 묶음, Part 5 대비) + 플래시카드 배치 학습(급수별, 나가기/이어하기 — 기존 패턴 재사용) + 퀴즈 2종(뜻 맞히기 + 품사 변환 빈칸형) + 오답노트/SRS 연동(기존 인프라 재사용).
- **2단계(보류, 코어 검증 후)**: 주제 태그(사무/인사/여행/재무 등 — NGSL/TSL에 없어서 별도 소스나 수작업 태깅 필요), 콜로케이션/숙어, 딕테이션(듣고 쓰기), 문맥 속 유의어 퀴즈, ~~발음 듣기(TTS, Web Speech API로 무료 구현 가능)~~ **2026-07-16 완료** — 아래 "발음 듣기(TTS) 구현" 섹션 참고. 나머지 네 항목은 여전히 미착수.
- 데이터 스키마 초안: 일본어 단어(`word/reading/meaningKr/meaningEn/exampleJp/exampleKr`)와 달리 `word`(단어)/`pos`(품사)/`meaningKr`(뜻)/`exampleEn`(예문)/`exampleKr`(예문 번역), `reading` 필드 불필요. 파생어 세트는 표제어 단위로 묶는 구조 필요(설계 시 확정).

**진행 상태(2026-07-15 기준)**: **NGSL+TSL 데이터 콘텐츠 전량(4,059단어) 완성.** core1(1000)+core2(1000)+core3(809)+toeic(1250) 전부 `pos`/`meaningKr`/`exampleEn`/`exampleKr` 채워서 `data/english-vocab-*.json` → `scripts/build-english-vocab-data.mjs` → `src/data/englishVocab.ts`까지 반영됨. 상세 출처/설계 근거는 `data/raw/README.md`의 "영어(TOEIC) 단어 데이터" 섹션 참고.

- **toeic(TSL 1,250단어) 완성 경위(2026-07-15)**: 이전 세션에서 만든 조인 중간산출물(`joined-all.json`)이 스크래치패드 한정이라 유실됨 → TSL_12_stats.csv(랭킹, latin1 인코딩 주의)와 TSL_12_definitions.xlsx(영문 정의, `/s/TSL_12_definitions.xlsx`)를 재다운로드해 재조인. **원본 데이터셋 자체 결측 확인됨**: definitions.xlsx에 정의가 없는 단어 4개(smartphone/by-law/e-book/résumé/café/entrée — 이 중 café/entrée/résumé/e-book은 xlsx 인코딩 문제가 아니라 진짜 결측)는 meaningEn을 직접 작성(사용자 확인 후 진행), stats.csv에 랭킹이 없는 단어 2개(born/criteria)는 최종 1,250개 리스트에서 제외(사용자 확인 후 진행). 50단어씩 25개 청크로 나눠 로컬 커밋하며 진행(세션 한도 대비) — 1~100은 직접 작성, 101~1250(23개 청크)은 서브에이전트에 위임. 전체 완료 후 word/num/meaningEn을 원본 조인 데이터와 전수 대조 검증(사소한 오타·공백 정리 외 왜곡 없음 확인) → `npm run data:build:englishVocab` 실행 → 로컬 커밋 25개를 그대로 두고 마지막에 한 번에 push.
- core2(601~800)·core3(NGSL 2001~2809) 완성 경위는 git log 참고(878b3e2, e00737a).

**남은 작업**:
1. ~~파생어 세트(품사 묶음, Part 5 대비) 데이터 생성~~ **2026-07-15 완료**.
   - **확정된 설계**: 새 단어를 추가하지 않고 기존 4,059단어 중 파생어 관계가 있는 표제어만 묶는 방식(사용자 확인 완료). 스키마는 각 단어 항목에 필드 2개 추가 — `wordFamilyId`(같은 어근 그룹의 공통 ID, 그룹의 기본형 word를 그대로 씀, 예: `"decide"`), `derivationPos`(그 단어가 이 세트 안에서 담당하는 품사: 동사/명사/형용사/부사). 파생어 없는 단어는 두 필드 다 생략(optional). 이번 라운드는 **데이터 생성까지만** 범위(화면 반영은 별도 단계).
   - **진행 방식**: 전체 4,059단어(id/word/pos만 추출한 목록)를 알파벳순 4등분(a~depress / depression~knee / knife~researcher / resemble~zoo)해서 서브에이전트 4개에 병렬 위임, 각자 `data/raw/word-families-chunk-{a,b,c,d}.json`에 `[{id, wordFamilyId, derivationPos}, ...]` 매핑만 저장 → 4개 청크 병합·검증(id 중복 4건 발견: `agree`/`disagree`, `depend`/`independent`처럼 접두사로 반의어를 만든 케이스를 chunk-a는 원 표제어에 흡수, chunk-b는 별도 표제어로 분리해서 판단이 갈렸음 — 언어학적으로 더 정확한 chunk-b의 분리 판단을 채택하고 chunk-a 쪽 4건 제거) → 최종 564개 세트/1,403단어를 `data/english-vocab-*.json` 4개 파일에 반영 → `scripts/build-english-vocab-data.mjs`의 `EnglishVocabWord` 인터페이스에 `wordFamilyId?`/`derivationPos?` optional 필드 추가 → `npm run data:build:englishVocab` 재실행해서 `src/data/englishVocab.ts`까지 반영 완료.
   - **다음 단계(미착수)**: 화면 반영(학습 카드에 파생어 묶음 표시 등)과 품사 변환 빈칸형 퀴즈(Part 5 유형) — 아래 4번 참고.
2. ~~`types.ts`에 페이지 상태 추가 → `EnglishVocabPage.tsx` → `Sidebar.tsx` → 퀴즈 생성기 → 오답노트 스키마~~ **2026-07-14 전부 완료** (아래 "화면/UI 구현" 참고).
3. ~~급수 배지 색상 토큰~~ **완료** — `--color-level-core1~toeic`(+tint/on-level) 추가, 브랜드 청록·JLPT 초록~빨강 스펙트럼과 안 겹치는 옛 브랜드 보라~마젠타 계열 재사용.
4. ~~품사 변환 빈칸형 퀴즈(Part 5 유형)~~ **2026-07-16 완료** — 아래 "품사 변환 빈칸형 퀴즈 구현" 섹션 참고.
5. ~~파생어 세트 학습 카드 화면 반영~~ **2026-07-16 완료** — `EnglishVocabPage.tsx`의 학습(플래시카드)/전체보기 상세 화면 둘 다에 "파생어" 필드 추가, 같은 `wordFamilyId`를 가진 다른 단어들을 `study-used-kanji-chip` 스타일(단어/한자 화면의 "쓰인 한자" 칩과 동일 패턴 재사용)로 표시. 전체보기 상세에서는 칩이 버튼이라 클릭하면 그 단어로 바로 이동(파생어 세트 절반 이상이 급수 경계를 넘나들어서 — 564세트 중 443세트가 cross-level — 클릭 시 `jumpToWord()`가 그 단어의 급수로 전환한 뒤 인덱스를 다시 찾음). 학습 카드 쪽은 학습 흐름을 안 끊기 위해 클릭 불가능한 정보 표시 칩만.
6. ~~`HomePage.tsx` 영어단어 도메인 연동~~ **2026-07-16 완료** — 위 "⚠️ 배포 빌드 깨짐" 섹션 참고. 영어(TOEIC) 카테고리의 MVP 범위(1단계) 작업이 이걸로 전부 끝남.

## 품사 변환 빈칸형 퀴즈 구현 (2026-07-16 완료)

파생어 세트(`wordFamilyId`/`derivationPos`) 데이터를 실제로 쓰는 두 번째 퀴즈 유형. `EnglishVocabPage.tsx`의 기존 "뜻 맞히기" 퀴즈와 나란히 "퀴즈 종류" 선택기로 전환하는 구조로 추가(요청 시 사용자가 "데이터 가공작업"이라고 표현한 것 = 이 생성기 구현을 가리켰음, 확인 후 진행).

- **문제 형태**: family(같은 `wordFamilyId`, 2~8개 단어)의 한 표제어를 골라 그 단어의 `exampleEn` 문장에서 그 단어를 `_____`로 가리고, 선택지는 **같은 family의 단어 전부**(품사별 파생형). 정답은 문맥에 맞는 품사 형태 고르기. 선택지 개수를 4개로 강제하지 않고 family 크기 그대로 씀(기존 UI가 이미 가변 개수 선택지를 지원 — `.vocab-quiz-choices`가 flex column이라 레이아웃 안 깨짐).
- **blank 처리**: `exampleEn`은 항상 그 단어 자신의 표제어 형태를 문장에 그대로 씀(예: "decide" 항목의 exampleEn엔 "decide"가, "decision" 항목엔 "decision"이 들어있음 — 데이터 생성 시부터 그랬음) → 정규식으로 단어 경계(`\b`) 기준 대소문자 무시 치환. 단, 전체 1,403개 파생어 단어 중 **약 15%(212개)는 exampleEn에 그 단어가 활용형(예: "decides")으로만 있어서 원형 그대로 찾지 못함** — 이런 항목은 blank 생성 실패로 조용히 제외(추측해서 자르지 않음). 급수별로 여전히 215~373문항 확보되어 콘텐츠는 충분함.
- `src/lib/englishVocabQuizGenerator.ts`: `generateEnglishVocabDerivationQuestions`/`...FromIds`/`englishVocabDerivationLevelPool` 추가. 기존 뜻맞히기 생성기와 나란한 구조(같은 파일).
- `src/lib/storage.ts`: `EnglishVocabDerivationInProgressQuiz` 타입 + CRUD 함수 세트를 기존 `EnglishVocabInProgressQuiz`와 나란히 추가(질문/정답 shape이 달라 합칠 수 없음 — 모의고사가 단어/문법과 별도 InProgressQuiz를 쓰는 것과 같은 이유). `BackupPayload` 버전 12→13. 오답노트/퀴즈기록은 기존 `EnglishVocabWrongNoteEntry`/`SimpleQuizHistoryEntry`를 그대로 재사용(퀴즈 종류를 구분하는 필드는 없음 — 단어/문법 퀴즈도 원래 그런 심플한 shape이라 일관성 유지, `source` 라벨 문자열로만 "영어 단어 품사 변환 퀴즈 · ..."처럼 구분).
- `src/pages/EnglishVocabPage.tsx`: `phase`에 `derivationQuiz`/`derivationQuizResult` 추가, 상태/함수/렌더 전부 기존 뜻맞히기 퀴즈와 나란히 중복 구현(이 레포 컨벤션). 설정 화면에 "퀴즈 종류"(뜻 맞히기/품사 변환 빈칸형) 선택기 추가, 문항수 옵션이 선택된 종류의 풀 크기를 따라가도록 수정. **주의**: 초안에서 CTA 버튼 문구를 실수로 "단어 퀴즈 풀기" → "{종류} 풀기"로 바꿨다가, 기존 화면 문구를 불필요하게 건드리는 최소 diff 위반이라 되돌림 — 뜻맞히기는 원래 문구("단어 퀴즈 풀기") 그대로, 품사 변환만 새 문구("품사 변환 퀴즈 풀기") 씀.
- `src/pages/VocabPage.css`: `.vocab-derivation-sentence`(빈칸 문장 표시), `.quiz-choice-pos`(선택지 옆 품사 라벨) 클래스 추가.
- 오답노트/SRS/퀴즈기록은 뜻맞히기와 동일하게 연동(정답 여부는 `entry.id` 기준 비교, meaningKr 기준이 아님).
- Playwright로 실제 검증: 급수 core1 기준 빈칸 문장·4~6개 선택지 렌더링, 오답→다음버튼→Enter 진행, 나가기→이어하기(진행 인덱스 정확히 보존), 결과 화면까지 20문항 전체 진행, 375px 모바일+다크모드 가로스크롤·콘솔에러 0건 확인.

### 부수 발견: Enter-다음 진행 시 다음 문제가 몰래 자동 채점되는 버그 (2026-07-16 발견+수정)

품사 변환 퀴즈의 나가기→이어하기를 검증하던 중, localStorage에 저장된 진행 인덱스가 매번 기대보다 1 앞서 있는 걸 발견. 원인 재현: 오답 제출 후 뜬 "다음" 버튼을 Enter로 누르면 `handleNextQuiz`가 다음 문제로 넘어가고, 그 직후 `useEffect`가 새 문제의 첫 선택지 버튼에 `.focus()`를 호출하는데, **아직 처리 중이던 같은 Enter 키의 keyup이 그 방금 포커스된 선택지 버튼을 네이티브로 클릭**해버려서 새 문제가 사용자 모르게 자동으로(포커스된 첫 선택지로) 채점됨 — 2026-07-13에 "다음" 버튼 자체의 자동포커스를 없애서 고쳤던 것과 완전히 같은 메커니즘이 **선택지 자동포커스 effect**에도 그대로 존재했던 것(그때는 "다음" 버튼만 고치고 이 effect는 안 건드렸음). 실제 사용자가 Enter를 빠르게 눌렀을 때 재현 가능한, 퀴즈 채점 정확도에 영향을 주는 진짜 버그로 판단해 다음 5개 파일 전부에 동일 패턴으로 수정(`skipNextFocusRef`/`skipNextChoiceFocusRef`: `handleNext`류 함수에서 true로 세팅 → 포커스 effect가 그 값을 보고 한 번만 건너뜀):
`src/components/QuizRunner.tsx`(한자), `src/pages/VocabPage.tsx`(단어), `src/pages/GrammarPage.tsx`(문법), `src/pages/MockExamPage.tsx`(모의고사), `src/pages/EnglishVocabPage.tsx`(영어단어, 뜻맞히기+품사변환 둘 다). Playwright로 4곳(한자/문법/영어단어 뜻맞히기/영어단어 품사변환) 직접 재현 후 수정 확인 — 수정 전 index가 답변 1회당 2씩 늘던 것이 수정 후 정확히 1씩만 증가.

## 화면/UI 구현 (2026-07-14 완료)

`EnglishVocabPage.tsx`를 `VocabPage.tsx`와 동일한 구조(학습 배치/나가기·이어하기, 전체보기 검색+그리드+상세카드, 퀴즈 설정+실행+결과, 오답노트/SRS 연동)로 구현. 일본어 단어와 다른 점만 반영: `reading` 없음, `pos`(품사) 필드가 급수 배지 옆에 칩으로 표시됨, 예문은 `exampleEn`/`exampleKr`. 급수 라벨은 내부 id(`core1`~`toeic`)와 화면 표시 라벨(`필수 1000`/`필수 2000`/`확장 어휘`/`토익 특화`)을 분리(`LEVEL_LABELS` 맵).

- `src/lib/englishVocabQuizGenerator.ts`: `vocabQuizGenerator.ts` 미러링(뜻 맞히기 4지선다, 레벨 뽑기/오답 재도전 ids 뽑기 둘 다).
- `src/lib/storage.ts`: 영어를 4번째 병렬 도메인으로 추가 — `EnglishVocabWrongNoteEntry`/`EnglishVocabInProgressQuiz`, `SrsDomain`에 `'englishVocab'` 추가, 학습진도/오답노트/퀴즈기록/SRS/인프로그레스 CRUD 함수 전부, `BackupPayload` 버전 11→12(새 필드 전부 optional이라 구버전 백업도 그대로 유효).
- `src/pages/WrongNotePage.tsx`: 4번째 섹션(`영어 단어`)으로 세션별 그룹핑 통합. `DetailTarget`/`ConfirmTarget` union에 `'englishVocab'` 추가, `EnglishVocabDetailCard` 컴포넌트 추가.
- `src/components/Sidebar.tsx` / `src/App.tsx`: "일본어" 옆에 "영어" 형제 그룹(하위 메뉴 "단어" 하나) 추가, `PageId`에 `'englishVocab'` 추가. 오답노트는 네 도메인을 다 아우르므로 "영어" 그룹엔 중복 추가 안 함(일본어 쪽 오답노트 메뉴 하나만 계속 씀).
- `src/styles/tokens.css` + `StudyPage.css`/`VocabPage.css`/`WrongNotePage.css`: 급수 배지/버튼/타일/오답노트 테두리에 `core1`/`core2`/`core3`/`toeic` 색상 클래스 추가.
- **아직 core2(601~800)/core3/toeic 데이터가 비어있어서**, 그 급수를 선택하면 "이 급수는 아직 콘텐츠 작업 중입니다" 빈 상태만 뜨고 시작 버튼이 비활성화됨(레이아웃은 안 깨짐, 정상 동작) — 데이터 채우면 자동으로 활성화됨.

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

## 재학습 기능 + 단어 전체보기 그리드화 (2026-07-10 구현 완료)

사용자가 "단어 전체보기 화면이 밋밋하다"(플랫 3열 리스트) + "완료된 학습도 다시 할 수 있어야 하는데 완료됐다고만 나온다" 두 가지를 지적 → 세 도메인(한자/단어/문법) 전부에 동일 구조라 같이 고침(사용자가 범위 확인 질문에 "세 도메인 전부"로 답함).

- **재학습**: `StudyPage`/`VocabPage`/`GrammarPage` 전부 `finishBatch`가 `Math.min(completedCount + batch.length, pool.length)`로 진도 저장을 클램프하도록 바꾸고(재학습으로 진도가 실제 항목 수보다 부풀려지지 않게), 급수를 다 마쳤을 때 텍스트만 뜨던 자리에 `restartBatch()`(풀 전체를 처음부터 다시 배치) 호출하는 "처음부터 다시 학습하기" 버튼 추가.
- **단어 전체보기**: `VocabPage`의 브라우즈 화면을 `KanjiListPage`(한자 전체보기)와 같은 패턴으로 재구성 — 플랫 리스트 대신 타일 그리드, 타일 클릭 시 학습 카드와 동일한 상세 뷰(뜻/영문 뜻/예문/한자 정보)를 이전/다음·←/→ 키로 넘겨볼 수 있음.
- **주의**: 이 작업을 커밋 없이 두는 바람에 사용자가 "안 고쳐졌다"고 재차 지적함 — GitHub Pages는 push된 빌드만 반영되므로, 로컬에서 Edit만 하고 끝내면 배포엔 반영 안 됨. 이 프로젝트는 작업 단위마다 바로 commit+push하는 게 원칙이니 이후로도 매 단위 작업 후 잊지 말고 push할 것.

## 브랜드색 교체(보라→네온 아주르) + 급수색 전면 활용 (2026-07-10 구현 완료)

같은 날, 위 작업 배포 확인 도중 사용자가 "전체적으로 색 좀 넣어봐, 밋밋하다. 지금 보라색도 별로다, 파란 계열로 채도 높게. N5~N1 구분색 있으면 그것도 활용해라"라고 요청 → Artifact로 2가지 방향(코발트/아주르, 이후 "쨍하지 않다"는 피드백 받고 둘 다 더 밝고 채도 높게 재조정)을 실제 화면 요소(사이드바·버튼·배지·타일)로 비교시안 제시 → 사용자가 **Option B "네온 아주르"** 확정(급수색은 안 건드리는 안).

- `tokens.css`: `--color-primary`를 보라(`#8B5CF6`)에서 `#00B2FF`(다크모드 `#3DCBFF`)로 교체. N4 배지색(`#3B82F6`, 인디고에 가까운 블루)과는 그대로 둬도 채도·톤 차이로 구분됨(Option B가 이걸 건드리지 않는 안이었음). `--color-level-n5~n1-tint`(각 급수색의 저채도 rgba 버전, 라이트 12%/다크 18%) 신규 토큰 추가.
- **급수색을 배지 밖으로 확장**: 지금까지 급수색(`--color-level-*`)은 `study-level-badge`에만 쓰였는데, 다음 요소들에도 확장 적용:
  - `study-level-btn`(한자/단어/문법 학습 설정 화면의 급수 선택 버튼) 및 `SetupScreen`/`MockExamPage`의 급수 체크박스·라디오(`option-level-*`) — 선택 시 브랜드색 대신 그 급수 자체의 색으로 테두리+배경 틴트.
  - 단어/문법/한자 전체보기 타일(`vocab-browse-tile`/`grammar-browse-tile`/`radical-tile`, KanjiListPage 한정) — 왼쪽(단어·문법) 또는 위쪽(한자, 타일이 좁아서) 4px/3px 색 띠 + 배경 틴트.
  - 오답노트(`wrong-note-item`) — 항목별 급수색 왼쪽 테두리.
- **문법 전체보기도 그리드화**: 위 단어 작업 때 미처 안 고쳤던 `GrammarPage`의 브라우즈 화면(플랫 리스트로 남아있던 유일한 곳)을 같은 타일+상세카드 패턴으로 재구성 — "이 화면만 스타일 적용 안 된 데가 있다"는 사용자 지적으로 발견.
- 색상 시안은 Artifact(`color-tone-proposal.html`)로 두 라운드 반복 확인 후 확정 — 이 레포의 "화면 단위 확인" 관례와 일치.

## 색상 대비/가독성 전면 수정 + 로고·favicon 통일 (2026-07-10, 브랜드색 교체 직후 이어서)

브랜드색 교체 직후 사용자가 실제 화면에서 여러 문제를 연달아 지적 → 전부 그날 안에 수정·배포 완료. 순서대로:

1. **버튼 흰 글자 대비 깨짐**: 버튼 fill을 밝은 primary와 통일했더니 흰 텍스트 대비가 2.4~2.9:1까지 떨어짐. **처음엔 fill을 어둡게 낮춰서 고쳤다가 "Option B 색이 왜 안 보이냐"고 강한 항의**를 받음 — 배경을 죽이는 게 아니라 텍스트 색을 바꾸는 게 맞는 방향이었음. 최종: `--color-button-fill`은 원래 쨍한 색 그대로 두고, 새 토큰 `--color-on-primary`(어두운 남색)로 텍스트만 바꿈. **교훈**: 브랜드색을 밝게 올릴 때 대비가 깨지면, 배경을 어둡게 하지 말고 그 위 텍스트 색을 바꿀 것(이 프로젝트가 과거 오렌지/보라 시절에도 이미 한 번 겪은 패턴).
2. **급수 배지(N4) 텍스트색**: N5~N1 배지 전부 어두운 텍스트(`--color-on-level`)였는데 YIQ 밝기 계산상 N4(파랑, 밝기 122/255)만 다른 넷(133~167)보다 유의미하게 어두워서 흰 텍스트가 맞음 → `--color-on-level-n4: #FFFFFF`로 그 하나만 예외 처리.
3. **가독성(회색 텍스트) 전면 점검**: 읽기·예문번역·한자칩 정보 등 "실제 학습 콘텐츠"가 라벨/타임스탬프 같은 진짜 메타정보와 똑같이 `--color-ink-muted`(회색)로 처리되고 있었음 → 콘텐츠는 전부 진하게(`--color-ink`) 뺐다가, "검은색 도배도 별로"라는 재지적을 받고 **Artifact로 "브랜드색 읽기 vs 급수색 읽기" 2안을 만들어 확정** → 읽기/예문번역/한자칩 정보는 `--color-primary-dark`(브랜드 파랑), 뜻/정답 같은 핵심 답변만 `--color-ink` 유지. 단어/한자/문법/모의고사/결과화면 전부 동일 규칙.
4. **테두리·포커스 링 가시성**: 호버 테두리·포커스 링·활성 메뉴 표시줄 등 20곳 정도가 밝은 `--color-primary`를 직접 참조해서 흰 배경 대비 3:1 미달 → 전부 `--color-primary-dark`로 교체(면적 큰 solid fill은 안 건드림, 얇은 선만).
5. **로고/favicon 통일**: 애초에 "타이틀 아이콘 맘에 안 든다"던 사이드바 "字" 로고 자체는 위 과정에서 안 건드렸다가 세션 막바지에 재확인 → Artifact로 4안 제시, "字 유지 + 브랜드색 fill"(B안) 확정. 동시에 **`public/favicon.svg`가 옛날 오렌지 브랜드(#B24F1E) 그대로 방치**돼있던 것도 발견해서 같이 수정 — 진짜 소스는 `src/assets/icon-source.svg`(favicon.svg는 `npm run icons:generate`로 여기서 재생성되는 산출물이니 직접 고치면 안 됨), 여기 안의 붓터치 추상 모양을 사이드바와 똑같은 "字" 글자로 교체하고 `npm run icons:generate`로 PNG들까지 재생성. 새 토큰 `--color-brand-mark`(다크모드에서도 안 바뀌는 고정값)를 만들어 사이드바 로고 배경이 favicon과 항상 같은 색을 쓰게 함 — `--color-primary-dark`는 텍스트용이라 다크모드에서 밝게 뒤집히므로 로고 fill엔 못 씀. `index.html`의 `theme-color`, `vite.config.ts`의 PWA manifest `theme_color`도 같은 파랑으로 교체.

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

## 프로젝트 이름 재정의 (2026-07-14, "모모링고" 확정 + 코드 반영 완료, GitHub 리포지토리 이름만 남음)

일본어 전용 앱에서 다국어(일본어+영어/TOEIC, 앞으로 더 늘어날 수 있음) 시험 준비 학습 플랫폼으로 성격이 바뀌면서, 기존 "한자 학습" 타이틀이 더 이상 안 맞음 → 사용자가 여러 후보(닉네임 배제/활용 두 갈래) 중 **"모모링고(MomoLingo)"**로 확정(사용자 닉네임 momogi/momogirin + lingo). 처음엔 "실제 반영은 나중에"라고 했다가 바로 이어서 "진행해"라고 해서 코드 쪽은 전부 반영함.

**반영 완료(2026-07-14)**:
- `index.html` `<title>`, `vite.config.ts` PWA manifest `name`/`short_name`/`description`
- `package.json`의 `name` 필드(`nihongo-benkyou-program` → `momolingo`)
- `Sidebar.tsx` 브랜드 텍스트("한자 학습" → "모모링고") + 로고 글자(`src/assets/icon-source.svg`의 "字" → "M")
- `npm run icons:generate`로 favicon/PWA 아이콘 전부 재생성

**⚠️ 아직 하면 안 됨 — `vite.config.ts`의 `base` 경로**: 처음에 `/momolingo/`로 미리 바꿨다가, 실제 GitHub 리포지토리 이름이 아직 `nihongo-benkyou-program`인 상태라 다음 배포에서 GitHub Pages가 깨진(빈) 화면을 띄우는 사고가 남 → 즉시 `base: '/nihongo-benkyou-program/'`로 되돌림. **리포지토리 이름을 실제로 바꾸기 전까지 이 값을 절대 먼저 바꾸지 말 것** — 순서는 반드시 (1) GitHub에서 리포지토리 이름을 `momolingo`로 변경 → (2) `git remote set-url origin https://github.com/momogirin/momolingo.git` → (3) 그 다음에야 `vite.config.ts`의 `base`를 `/momolingo/`로 변경+커밋. 이 세 단계는 사용자가 (1)을 완료했다고 알려준 뒤에만 진행할 것.

**아직 안 됨 — 사용자가 직접 해야 함(gh CLI가 이 환경에 없어서 Claude가 GitHub 리포지토리 이름 자체는 못 바꿈)**:
- GitHub 리포지토리 이름을 `nihongo-benkyou-program` → **정확히 `momolingo`**로 변경(Settings → Repository name). GitHub이 자동으로 이전 이름 리다이렉트를 걸어주므로 기존 링크가 완전히 죽지는 않음.
- 완료했다고 알려주면 위 "아직 하면 안 됨" 항목의 (2)(3)을 이어서 진행.

## 다음 할 일

**앞으로의 일본어 기능 구현 방향은 `ROADMAP.md`에 따로 정리되어 있음**(2026-07-22 신설).
HANDOFF.md = "지금까지 무엇을 했는가", ROADMAP.md = "앞으로 무엇을 할 것인가".
일본어 작업을 시작할 땐 ROADMAP.md의 우선순위 표를 먼저 볼 것이며, 항목을 완료하면
그 파일의 상태를 `완료`로 갱신할 것.

핵심 콘텐츠(한자 학습 2138자, 문법 470개, 단어 7972개) 전부 완료, 메뉴 구조 개편(한자 통합)·학습 플로우 변경(배치→나가기/이어하기)·카드 레이아웃 조밀화·로그인/클라우드 동기화(실제 동작 확인됨)·SRS 간격반복 복습·학습 카드 디자인 리프레시(배지+채도)까지 2026-07-09 하루에 전부 구현·검증·배포 완료. 같은 날 저녁, 사용자가 퇴근하며 "데이터 품질을 전체적으로 훑어서 개선"을 요청 → 데이터 품질 감사 항목도 완료. 그다음으로 "모의고사 ㄱ" 요청을 받아 모의고사 모드도 구현 완료. 같은 날 밤, 사용자가 "내 입력 없이도 혼자 진행할 거 생각해와"라고 하고 자리를 비움 → QA 전체 스윕 + 통계·약점 분석 대시보드까지 이어서 구현 완료(둘 다 아래 참고).

2026-07-13, 사용자가 퀴즈/오답노트 UX 관련 4가지 문제를 지적 → 전부 구현·검증·배포 완료(아래 "퀴즈 UX 수정 + 오답노트 세션별 재설계" 참고). 이어서 "이런 식으로 시스템적으로 불편한 게 몇 개 더 있다, 검토해서 리스트를 만들어봐"라는 요청을 받고 전체 화면을 훑어 10개 항목 리스트를 제시 → 사용자가 "1부터 순차적으로, 묻지 말고 쭉 진행해"라고 답해 10개 전부 순서대로 구현·검증·배포 완료(아래 "UI/편의 10항목 전수 개선" 참고). "나중에 할 수도 있는 작업 후보" 목록은 여전히 비어있음 — 새로 논의 필요.

## UI/편의 10항목 전수 개선 (2026-07-13, 구현 완료)

사용자 요청으로 앱 전체를 훑어 "시스템적으로 불편한 것 + 사용자 편의가 부족한 것" 10개를 우선순위별로 정리한 뒤, 확인 없이 순서대로 전부 구현·Playwright 검증·커밋+푸시함. 각 항목은 별도 커밋(git log에서 "1부터 순차적으로 진행" 이후 커밋들 참고).

1. **단어/문법/모의고사 퀴즈도 오답 시 자동 넘김**: 직전 세션에서 한자 퀴즈(`QuizRunner.tsx`)만 고쳤던 게 드러남 — `VocabPage`/`GrammarPage`/`MockExamPage`는 각자 퀴즈 로직을 자체 복제해서 쓰는 구조라 안 고쳐져 있었음. 세 곳 다 같은 패턴(오답이면 정지 + 다음 버튼) 적용.
   - **이 과정에서 Playwright 검증 중 진짜 버그 2개 추가 발견**: ① "다음" 버튼 자동 포커스가 같은 Enter 키의 keyup에 의해 즉시 클릭되는 문제(지난 세션 한자 퀴즈 수정 때도 있었던 것과 동일 계열, 포커스 제거로 해결) — ② `lastAdvancedIndexRef`류 가드를 새 퀴즈 시작 시 리셋 안 해서, 같은 화면에서 두 번째 퀴즈를 풀 때 특정 인덱스에서 "다음" 버튼이 먹통될 수 있었음(세 화면 다 startQuiz/resumeQuiz/retry 진입점에서 리셋하도록 수정).
2. **+3. 단어/문법/모의고사 퀴즈 나가기 버튼 + 이어하기(진행상황 저장)**: 이 셋은 원래 진행 상황이 순수 in-memory였어서 나가면(사이드바 클릭 등) 통째로 사라졌음. `storage.ts`에 `VocabInProgressQuiz`/`GrammarInProgressQuiz`/`MockExamInProgressQuiz`를 한자의 `InProgressQuiz`와 병렬 구조로 추가, 매 문제 답변마다 저장. 세 화면 다 퀴즈 중 상단 나가기 버튼 + 설정 화면에 "이어서 풀기/응시하기" 버튼. 모의고사는 시작 시각 기준 실시간 카운트다운이라 나갔다 와도 흐른 시간 그대로 반영(실제 시험처럼). `BackupPayload` 버전 10→11로 세 진행상황도 내보내기/가져오기/클라우드 동기화에 포함.
4. **오답노트 재도전이 원래 시험 유형(문제 유형)을 무시함**: "일본어 훈독 고르기"로 틀렸어도 재도전은 항상 "한국 훈음 입력" 고정이었음. `WrongNoteEntry`에 `questionType` 필드 추가(한자 퀴즈에서만 의미 있음 — 모의고사 출제 형식은 기존 6종 어디에도 안 맞아 undefined로 둠), `WrongNotePage`의 세션 헤더에 "이 유형으로 재도전" 버튼 추가. 기존 "오답만 재도전(N)" 글로벌 버튼은 그대로 유지(여러 세션이 다른 유형이면 애초에 하나로 합칠 수 없음).
5. **단어/문법 퀴즈 문항 수/순서 커스터마이징 부재**: 20문항 고정·랜덤 고정이었음(한자는 급수·유형·순서·문항수 다 선택 가능). `generateVocabQuestions`/`generateGrammarQuestions`에 order 파라미터 추가, 설정 화면에 문항 수(10/20/30/50/전체)·순서(랜덤/순차) 칩 추가(`study-level-btn` 스타일 재사용).
6. **부수 페이지만 나가기 UI가 다름**: 다른 학습/상세 화면은 전부 상단 `study-topbar`(나가기 버튼+진행률)인데 부수만 하단 이전/다음 옆에 "← 목록으로"가 있었음. 같은 패턴으로 통일.
7. **한자/단어/문법 전체보기 검색 없음**: 2138개/7972개/수백 개를 급수별 그리드 스크롤로만 찾아야 했음. 세 화면 상단에 검색창 추가(한자: 글자·훈음·훈독·음독, 단어: 단어·읽기·뜻, 문법: 문형·뜻). 필터링된 타일 클릭 시 원본 배열 기준 인덱스를 찾아 여니 상세화면 이전/다음 탐색은 그대로 전체 목록 기준.
8. **오답노트 삭제(✕) 확인 없음**: `window.confirm()`으로 항목 이름을 보여주고 확인받은 뒤에만 제거하도록 수정.
9. **다크모드 수동 토글 없음**: `prefers-color-scheme` 미디어쿼리만 따랐음. `src/lib/theme.ts` + `tokens.css`의 `:root[data-theme=...]`(미디어쿼리보다 specificity 높음) 오버라이드로 라이트/다크/시스템 3단 토글을 사이드바 하단에 추가, localStorage에 저장.
10. **키보드 단축키 안내 없음**: 숫자키/화살표/Enter/Esc 단축키가 실제로 다 동작하는데 화면에 안내가 전혀 없었음. 퀴즈 화면(입력모드: Enter로 제출, 선택모드: 숫자키+Enter)과 플래시카드형 화면(학습 카드: ←→+Enter, 목록형 상세보기: ←→+Esc)에 각각 맞는 작은 안내문 추가.

전 항목 Playwright로 실제 동작 검증 완료(콘솔 에러 0건) — 상세 검증 내용은 각 커밋 메시지 참고.

**후속 점검(같은 날, 10항목 다 끝난 뒤 사용자가 "더 할 거 없어?"라고 물어서 추가로 훑음)**:
- **홈 대시보드가 2+3번 작업의 사각지대였음**: 단어/문법/모의고사 퀴즈에 저장/이어하기를 추가했는데, 홈 화면 "마무리못한 퀴즈" 카드는 여전히 한자(`getInProgressQuiz`)만 확인하고 있어서 나머지 셋은 해당 페이지에 직접 들어가야만 이어할 수 있었음 → `HomePage.tsx`에 세 카드 추가(기존 `onGoToVocab`/`onGoToGrammar`/`onGoToMockExam` prop 재사용이라 App.tsx 변경 없이 해결). 한자 카드 제목도 "마무리못한 한자 퀴즈"로 구체화.
- 오늘 새로 추가한 UI(검색창·테마 토글·문항수 칩·나가기 버튼·오답노트 세션/모달)를 375px 모바일 폭에서 Playwright로 가로 스크롤·콘솔 에러 점검 — 전부 통과, 코드 수정 없음.

## 퀴즈 UX 수정 + 오답노트 세션별 재설계 (2026-07-13 구현 완료)

사용자 지적 4가지: (1) 오답 시 자동으로 다음 문제로 넘어가서 정답을 읽을 시간이 없음, (2) 퀴즈 도중 나가기 버튼이 없어서 저장되는지 불안, (3) 엔터를 연타하면 문제가 씹힘(공백 입력·다발 입력 방지 필요), (4) 오답노트가 그냥 플랫 리스트라 "언제 무슨 시험을 틀렸는지" 알 수 없고 클릭해도 학습 내용을 못 봄.

- **`QuizRunner.tsx`**: 정답은 기존처럼 550ms 후 자동 진행, **오답은 자동 진행을 멈추고 "다음" 버튼(클릭 또는 Enter)이 있어야 다음 문제로 넘어감**. 상단에 `quiz-topbar`(나가기 버튼 + 진행률) 추가 — 클릭 시 `QuizPage`가 설정 화면으로 돌아감(진행 상황은 `onProgress`로 매 문제마다 이미 localStorage에 저장되고 있었음 — 나가기는 그 저장된 상태를 잃지 않고 화면만 벗어나는 것).
  - **Playwright로 실제 검증 중 진짜 버그 2개 발견·수정**: ① 오답 시 "다음" 버튼을 `.focus()`로 자동 포커스했더니, 방금 오답을 제출한 그 Enter 키의 keyup이 새로 포커스된 버튼을 네이티브로 클릭해버려서 "다음"이 뜨자마자 바로 눌려버림(포커스 이동과 같은 키 이벤트가 겹쳐서 발생) → 자동 포커스 제거(윈도우 레벨 Enter 리스너가 포커스와 무관하게 이미 처리하므로 필요 없었음). ② 오답→"다음" 진행 시 `inputValue`를 `useEffect`에서만 지웠더니, 그 클리어가 아직 반영되기 전에 연속으로 Enter를 누르면 이전 문제의 입력값이 다음 문제에 재제출됨(엔터 다발 시나리오 그 자체) → `goNext()` 안에서 `setIndex`와 같은 배치로 `setInputValue('')`를 동기 처리하도록 수정. 두 버그 다 "빌드는 성공하지만 실제로 만져보면 깨지는" 유형이라 브라우저 검증 없이는 못 잡았을 것.
  - 숫자키/Enter 제출·다음 로직을 윈도우 keydown 리스너 하나로 통합(기존엔 `<input>`의 React onKeyDown과 별도 window 리스너 두 개가 있었음 — 코드가 더 단순해짐).
- **`WrongNotePage.tsx`**: 오답노트를 플랫 리스트에서 **세션(같은 `wrongAt` 타임스탬프 = 같은 퀴즈 1회) 단위 그룹**으로 재설계. 각 세션 헤더에 `yyyy-MM-dd HH:mm:ss` 시각 + "무슨 시험이었는지" 라벨(예: "한자 퀴즈 · N5 · 한국 훈음 입력", "모의고사 · N2") 표시. 항목(한자/단어/문법) 클릭 시 학습 카드(뜻/훈독/음독/유래/예문 등, `StudyPage`의 카드와 동일 필드) 모달이 뜸 — 세 도메인 다 동일하게 지원(요청은 한자만 언급했지만 일관성을 위해 단어/문법도 같이 적용).
  - **`storage.ts`**: `WrongNoteEntry`/`VocabWrongNoteEntry`/`GrammarWrongNoteEntry`에 `source?: string`(시험 라벨) 필드 추가, `addWrongNotes`/`addVocabWrongNotes`/`addGrammarWrongNotes`가 이제 `source` 파라미터를 받음. 호출부 4곳(`ResultScreen.tsx`, `VocabPage.tsx`, `GrammarPage.tsx`, `MockExamPage.tsx`) 전부 라벨 전달하도록 수정. `quizGenerator.ts`에 한자 퀴즈용 라벨 생성 헬퍼 `quizConfigLabel()` 추가.
  - 옛날 오답노트 항목(이 커밋 이전에 쌓인 것)은 `source`가 없어서 "기록 없음"으로 표시됨 — 마이그레이션 없이 optional 필드로 처리.
- Playwright로 전체 플로우 검증: 오답 시 정지·"다음" 버튼·Enter 진행, 나가기 후 localStorage 저장 확인, 공백 Enter 무시, 엔터 연타 시 정확히 1문제만 진행, 퀴즈 완주 후 오답노트에 세션 헤더(날짜+라벨)·클릭 시 학습카드 모달·Escape로 닫기까지 전부 통과. 콘솔 에러 없음.

## 모의고사 모드 (2026-07-09 구현 완료)

한자/단어/문법을 급수별로 섞은 통합 타이머 테스트. 청해·독해는 콘텐츠가 없어 제외. 사용자가 확정한 설계: 급수 1개 + 총 문항 수만 선택(3등분 자동 배분), 문항 수 비례 카운트다운 타이머(문항당 40초)로 시간 초과 시 자동제출, 오답노트/SRS는 일반 퀴즈와 동일하게 연동.

- `src/lib/mockExamGenerator.ts` — `generateMockExamQuestions(level, count)`. 기존 `QuizRunner`/`ResultScreen`/`SetupScreen`은 전부 `Kanji` 타입에 하드코딩돼 있어 재사용 불가했던 반면, `vocabQuizGenerator.ts`/`grammarQuizGenerator.ts`가 이미 "entity → meaningKr, 4지선다" 형태로 거의 동일했던 걸 착안해 한자도 같은 형태(한자 → kunKr)로 만들어 세 도메인을 `MockExamQuestion{domain, id, prompt, promptSub?, choices}` 하나의 셰이프로 통일. 세 도메인 각자 shuffle/distractor 로직을 자체 복제(기존 두 생성기도 서로 복제해서 쓰는 게 이 repo 컨벤션).
- `src/pages/MockExamPage.tsx` — 단일 파일, VocabPage/GrammarPage의 inline phase(`setup`/`running`/`result`) 패턴 그대로 미러링. `QuizRunner.css`/`ResultScreen.css`/`SetupScreen.css`를 그대로 import해서 기존 클래스 재사용(진행률/선택지 클릭·숫자키 1-4·550ms 피드백 후 자동진행 로직은 `QuizRunner.tsx`와 동일 패턴). 타이머는 실제 경과 시간(`Date.now()` 기준) 카운트다운이라 탭이 백그라운드에 있어도 정확함. 결과 화면 mount 시 한 번 도메인별로 분기해서 `addWrongNotes`/`addVocabWrongNotes`/`addGrammarWrongNotes`(오답) + `removeWrongNote`류(정답) + `recordSrsReview(domain, id, isCorrect)` 호출 — 일반 퀴즈와 완전히 같은 저장소 함수 재사용.
- `storage.ts`: `MockExamHistoryEntry`(도메인별 breakdown 포함) + `getMockExamHistory`/`addMockExamHistoryEntry`/`importMockExamHistory` 추가. `BackupPayload` 버전 9→10(`mockExamHistory` 필드 추가, optional이라 구버전 백업도 그대로 유효).
- 사이드바 "일본어" 그룹에 문법 다음·오답노트 앞으로 "모의고사" 메뉴 추가. 홈 화면 "최근 기록"에도 모의고사 항목이 다른 세 도메인과 함께 병합되어 뜸.
- Playwright로 N5·10문항 모의고사 실제 실행 검증 완료: 세 도메인 문제가 실제로 섞여 나오는 것, 타이머, 결과 화면 도메인별 브레이크다운, 오답노트/SRS/모의고사기록 localStorage 반영, 홈 화면 최근 기록 노출·클릭 이동까지 전부 확인됨. 콘솔 에러 없음.

## 데이터 품질 감사 (2026-07-09 저녁, 전수/표본 검토 완료)

사용자가 모의고사 모드보다 "기존 데이터를 손봐서 더 좋게" 만드는 걸 우선하자고 방향 전환 → 아래 순서로 검토, 발견한 오류만 수정·커밋:

- **문법 470개(N5~N1) 전수 검토**: explanation/exampleJp/exampleKr 전부 다시 읽음. N5-84 한 곳만 어색한 번역("일본어를 가르침을 받습니다" → "친구가 가르쳐 줍니다")이었고 나머지는 이미 정확했음(표준 교재 문형이라 오류 여지가 적음).
- **한자 훈음(kunKr) `generated`/`generated-uncertain` 태그 125개 전수 검토**: 奥(오)가 "속 오"로 되어 있었는데 표준 자전 훈음인 "깊을 오"로 수정(같은 한자의 exampleKr "깊은 산"도 이미 깊다는 뜻을 쓰고 있어서 교차검증됨). 나머지 124개는 정확 — `generated-uncertain`으로 남은 것들(唄/桟/拶/捗/桁 등, 대부분 일본에서 만든 国字)은 표준 훈음 자체가 불확실한 게 맞아서 안 건드림.
- **한자 유래(etymology) 2138자 전수 검토(N5 80·N4 166·N3 367·N2 367·N1 1158, 전부 다 읽음)**: 오류 0건. 심지어 학계에서 이견이 있는 글자(出/東/六/白/九 등)도 "~라는 설이 있다" 식으로 이미 잘 hedge되어 있었음.
- **한자 예문 뜻(exampleKr) `generated` 태그 1337개 중 약 330개 표본 검토**: 오류 0건.
- **단어 뜻(vocab meaningKr) 7972개 중 N5/N1/N2 약 470개 표본 검토**: 오류 0건.

**결론**: 전체 데이터셋이 이미 상당히 정확함. 이번 감사에서 실제로 고친 건 2건(문법 번역 1건, 한자 훈음 1건)뿐.

**후속: exampleKr/vocab 전수 검토 완료(2026-07-09, 같은 날 이어서)**: 위에서 표본만 봤던 나머지를 마저 전수 검토함 — 한자 exampleKr `generated` 태그 1337개 전체(표본 330개 이후 나머지)와 vocab meaningKr 7972개 전체(N5·N4 전부 + N5/N1/N2 표본 이후 나머지 + N3 전체)를 병렬 서브에이전트 5개(vocab n5+n4/n3/n2/n1 각 1개, 한자 exampleKr 1개)로 나눠 전수 검토. 발견된 오류 3건 전부 수정·반영:
- `vocab-n3.json` N3-1990 真っ赤: "새빨감"(비문법적 오타) → "새빨강"
- `vocab-n2.json` N2-1599 来日(らいにち, "일본에 옴"): "내일(일본에 옴)" → "방일(일본에 옴)" — らいにち를 "내일"이라는 무관한 동음이의 한자어와 혼동한 케이스(来日을 らいじつ로 읽으면 "훗날"에 가깝지만 이 항목의 읽기는 らいにち로 "일본 방문"만을 뜻함)
- `vocab-n1.json` N1-2203 ポーズ: meaningEn이 "pause"인데 meaningKr은 "포즈(자세)"로 되어 있어 다른 뜻(pose)을 가리키고 있었음 → "포즈(일시정지)"
- 한자 exampleKr 1337개는 이번엔 오류 0건(1337개 전부 재확인 완료). vocab N5/N4/N3는 이번에 처음 전수 검토(0건/0건/1건), N2/N1은 나머지 구간 마저 검토(1건씩).
- 수정 후 `npm run data:build:vocab`으로 `src/data/vocab.ts` 재생성 완료(한자는 변경 없어 `src/data/kanji.ts` diff 없음).

**최종 결론**: 한자 exampleKr(generated) 1337개 + vocab meaningKr 7972개 + 이전에 마친 문법 470개·한자 훈음 125개·한자 유래 2138개까지 이 프로젝트의 사람이 감수 안 한("generated" 계열) 콘텐츠는 사실상 전수 검토 완료 상태. 남은 미검토 영역은 없음.

## 통계·약점 분석 대시보드 (2026-07-10 새벽, 구현 완료)

사용자가 밤중에 자리를 비우면서 "내 입력 없이 혼자 진행할 거 생각해와" → QA 스윕(아래) 다음으로 HANDOFF에 남아있던 마지막 후보였던 이 항목을 진행. 화면 설계까지 판단이 필요한 작업이라 원래는 물어봤을 부분이지만, 그날 이미 확정된 카드형 요약 패턴(`home-entry-grid`)을 그대로 미러링하는 선에서 판단해서 진행함.

- `src/lib/statsSummary.ts` — 새 저장소 스키마 없이 기존 `storage.ts`의 퀴즈 기록/SRS 상태만 읽어서 계산(순수 함수, 부작용 없음):
  - `getWeeklyStats()`: 한자/단어/문법/모의고사 네 종류 기록을 합쳐 최근 7일(`finishedAt` 기준) 총 문항수·정답수·세션수
  - `getDomainAccuracies()`: 도메인별 누적 정답률 — 일반 퀴즈 기록 + 모의고사 기록의 도메인별 breakdown까지 합산
  - `getSrsMastery(domain)`: SRS 박스 4(30일 간격, 가장 잘 외운 상태)에 도달한 항목 수 vs 아직 복습 주기 도는 항목 수
  - `getWeakestDomain()`: 표본 5문항 미만인 도메인은 우연에 좌우되기 쉬워 제외하고, 나머지 중 정답률 최저 도메인 하나
- `HomePage.tsx`에 "학습 통계" 섹션 추가(액션 카드 그리드와 최근 기록 사이) — 이번 주 복습/도메인별 누적 정답률/도메인별 암기 정착도 카드 + 가장 약한 영역 한 줄 요약. 전부 기록이 하나도 없으면 섹션 자체가 안 뜸(`hasStats` 가드).
- Playwright로 localStorage에 여러 날짜/도메인에 걸친 가짜 퀴즈 기록·SRS 상태를 심어서 라이트/다크 모드 스크린샷으로 검증 — 숫자 계산(7일 필터링, 도메인별 합산, 정답률/%, 약점 판정)이 전부 정확히 일치하는 것까지 확인함.

## QA 스윕 (2026-07-10 새벽, 모의고사 배포 후 전체 점검)

모의고사 커밋 직후 Playwright로 전 페이지(홈/한자 4탭/단어/문법/모의고사/오답노트/계정) × 데스크톱·모바일 × 라이트·다크 조합 16개 + 실제 학습/퀴즈 인터랙션(카드 넘기기, 단어 학습→퀴즈, 부수 브라우즈) 3개를 순회하며 콘솔 에러·가로 스크롤(레이아웃 깨짐) 점검. 전부 통과, 발견된 문제 없음.

## 나중에 할 수도 있는 작업 후보 (미확정 — 필요성 자체가 아직 판단 안 됨)

- 새로 만든 그리드 화면들(단어/한자/문법 전체보기 타일)을 **모바일 폭·다크모드 조합으로 실제 띄워서 확인**은 아직 안 함(2026-07-10 색상 작업 세션 끝에 사용자에게 보고만 하고 검증은 안 한 채 마무리). 코드상 문제는 안 보이지만 실제로 본 적 없음.
- 그 외엔 특별히 정해진 후보 없음 — 다음 우선순위는 새로 논의 필요.

(청해는 콘텐츠 자체가 없어서 후보에서 제외됨 — 2026-07-09 사용자가 명시적으로 회의적 반응)

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
