한자_통합_N5N4N3.xlsx 파일을 이 폴더에 넣어주세요.

시트 구성: 한자 학습 / N5 / N4 / N3 / 부수
scripts/build-data.ts (예정)가 이 파일을 읽어 src/data/kanji.ts, src/data/radicals.ts를 생성합니다.

## 급수(N5~N1) 분류 및 데이터 확장 기록

원래 798자(N5/N4/N3만)였던 데이터를 상용한자(常用漢字) 전체 2136자로 확장했다. 각 필드의 출처는 `kunKrSource`에 기록되어 있다.

- **급수(level)**: `davidluzgouveia/kanji-data`(GitHub, tanos.co.uk/Jonathan Waller 리스트 기반, KANJIDIC2 확장)의 `jlpt_new` 필드로 재분류. 이 필드가 없는 한자는 N1(그 외 상용한자, 이 리스트 자체의 정의)로 분류했다 — 단 구JLPT 4급(舊4級)이 있는 分(분)만 N5로 남겨뒀다(구4급→N5는 이견이 없는 대응이라서). 구JLPT 1급/2급은 신JLPT 여러 급에 걸쳐 있어 깔끔한 1:1 대응이 없으므로, 처음엔 구1급→N2·구2급→N3로 임의 환산했었지만 원본 798자 처리 때 쓴 기준(丈·坊 등, 사례별 판단)과 신규 1340자 처리 때 쓴 공식이 서로 달라 N2/N3가 367자를 넘겨버리는 불일치가 있었다. 지금은 分을 제외한 모든 구JLPT-only 한자를 N1로 통일해서, 급수별 글자 수(N5 80·N4 166·N3 367·N2 367)가 참조 리스트의 급수당 글자 수와 정확히 일치한다.
- **일본어 읽기(kunJp/onJp)**: 위 데이터셋의 `readings_kun`/`readings_on`을 정리(훈독은 오쿠리가나 어간만, 음독은 가타카나로 변환)해서 생성했다.
- **한국식 훈음(kunKr)**: 다음 우선순위로 채웠다.
  1. `kunKrSource: "curated"` — 원본 엑셀에 있던 798자 (수작업 정리본, 예문 포함)
  2. `kunKrSource: "wiktionary"` — 한국어 위키낱말사전(ko.wiktionary.org)의 `{{한자풀이|훈=...|음=...}}` 템플릿에서 직접 추출 (1135자)
  3. `kunKrSource: "wiktionary-traditional"` — 신자체 한자라 위키낱말사전에 훈음 항목이 없는 경우, 구자체(전통 한자)로 재조회해서 추출 (80자)
  4. `kunKrSource: "generated"` / `"generated-uncertain"` — 두 방법 다 실패한 125자는 모델이 직접 생성. 음(소리)은 Unihan/강희자전 기반 `suminb/hanja` 테이블로 검증했지만, 훈(뜻)은 출처 없이 생성한 것이라 틀릴 수 있다. 그중 卸·唄·寮·拶·捗·桁·桟·酪·酵·詮 10자는 전통 옥편에서도 훈이 갈리거나 특히 불확실해 `"generated-uncertain"`로 별도 표시했다.

새로 추가된 1340자는 원래 exampleKanji/exampleKr/exampleJp/exampleRefKanji/exampleRefNum(예문)이 전부 없었다. 2026-07-07, 그중 1337자는 `scripts/parse-jmdict-examples.mjs`/`apply-jmdict-examples.mjs`로 JMdict.xml에서 해당 한자가 쓰인 단어 중 우선순위 태그(ichi1/news1/spec1 > gai1 > nfXX > 그 외)가 가장 높고 2음절에 가까운 것을 뽑아 `exampleKanji`/`exampleJp`를 채웠다. 塡·朕·頰 3자만 JMdict에 마땅한 예문이 없어 여전히 전부 `null`이다.

`exampleKr`(한국어 뜻)은 JMdict엔 영어 뜻만 있어서 원칙상 사람이 채워야 했지만, 2026-07-07에 사용자가 직접 "번역해서라도 채워라"고 승인해서 모델이 exampleJp/exampleKanji를 보고 직접 번역했다 (1337건, `exampleKrSource: "generated"`로 표시 — 원본 798자의 `exampleKrSource: "curated"`와 구분됨). 사전 대조 없이 모델이 번역한 값이라 개별 오역 가능성은 있다.

동사/형용사류 훈(예: "어지럽다") 중 일부는 위키낱말사전 원문을 그대로 가져와 사전형(-다) 그대로이고, 전통 옥편처럼 관형형(-(으)ㄹ, 예: "어지러울")으로 다듬지는 않았다 — 불규칙 활용 변환 과정에서 오히려 오류가 생길 위험이 있어 그대로 두었다.

## 부수(部首) 데이터 (data/radicals.json → src/data/radicals.ts)

강희부수(康熙部首) 214개 전체. `number`/`strokeCount`/`radical`은 강희자전 표준 순서(위키백과 Kangxi radical 문서로 대조)라 고정값으로 신뢰도 높음.

`meaningKr`(한국식 훈음)은 세 경로로 채워진다 (build-radical-data.mjs가 빌드 시점에 처리):
1. `meaningKrSource: "kanji-data"` — 해당 부수 글자가 기존 상용한자 데이터(kanji.json)에도 독립된 한자로 존재하면, 그 항목의 `kunKr`을 그대로 가져다 씀 (122자) — 같은 글자가 화면마다 다른 훈음으로 보이는 걸 방지.
2. `meaningKrSource: "wiktionary"` — 위 매칭이 안 되는 92자 중 91자는 ko.wiktionary.org의 `{{한자풀이|부수풀이=...}}`(부수로 쓰일 때의 공식 명칭, 우선) 또는 `{{ko-hanja|...}}`(표제자로서의 훈/음) 템플릿에서 가져와 교차 검증함 (`scripts/fetch-radical-meanings.mjs`로 조회 → `data/cache/radical-meanings-wiktionary.json` 캐시 → `scripts/apply-radical-meanings.mjs`로 반영, 2026-07-07). 이 중 34자는 모델이 원래 생성했던 값과 실제로 달라 교체됐다.
3. `meaningKrSource: "generated-uncertain"` — 위키낱말사전에도 대응 항목이 없는 1자(尸, "주검 시")만 여전히 모델이 생성한 훈음이라 교차 검증되지 않았다. 획수 그룹별 배열 순서(1획 6자 · 2획 23자 · 3획 31자 · … 17획 1자, 합계 214)는 위키백과 목록과 대조해 확인했다.

## 학습(단어장) 콘텐츠 (data/study-n5.json → src/data/studyContent.ts)

"학습" 화면(급수 진도 학습 + 한자별 부수/유래 카드)용 데이터. N5(80자)부터 시작, 급수별로 `data/study-{level}.json` 파일을 추가하면 빌드 스크립트가 자동으로 합침.

- `radicalNumber`(이 한자에 쓰인 강희부수 번호): [yagays/kanjivg-radical](https://github.com/yagays/kanjivg-radical)의 `kanji2element.json`(KanjiVG 획 분해 데이터)에서 구성요소를 가져온 뒤, 그중 214개 강희부수 중 하나에 해당하는 걸 골라 매핑했다. 헷갈리는 경우(来·南·書·年·聞·毎 등)는 japandict.com에서 실제 사전 부수 표기를 대조해 확정함 — 예: 来는 木이 아니라 人部, 南은 十이 아니라 干部, 書는 曰이 아니라 日部.
- `etymology`(유래·어원 설명): 모델이 직접 작성했고 다른 출처로 교차검증하지 않았다. N5 한자는 대부분 상형자/지사자로 비교적 정설이 확립된 기초 한자라 리스크가 낮지만, 東·六·九처럼 자형 유래에 이견이 있는 경우는 "~라는 설도 있음" 식으로 단정하지 않는 표현을 썼다. N4 이하로 내려갈수록(형성자 비중이 높아지고 유래가 더 불확실해짐) 같은 방식으로 신뢰도가 떨어질 수 있으니, 이후 급수 추가 시 표현 수위를 더 보수적으로 조정할 것.

## 어휘(단어) 데이터 (data/vocab-{level}.json → src/data/vocab.ts)

JLPT 급수별 단어(N5~N1). `word`/`reading`/`level`/`meaningEn`은 [elzup/jlpt-word-list](https://github.com/elzup/jlpt-word-list)(GitHub, `chyyran/jlpt-anki-decks` → `jamsinclair/open-anki-jlpt-decks`를 거쳐 결국 한자 급수와 같은 tanos.co.uk/Jonathan Waller 계열로 귀결)의 `src/{level}.csv`에서 그대로 가져왔다 (N5 718 · N4 668 · N3 2139 · N2 1748 · N1 2699, 총 7972단어). 이 리스트도 한자 급수 리스트처럼 JLPT 공식 리스트가 아닌 민간 정리본이라 이견이 있을 수 있음은 동일.

`meaningKr`은 소스에 한국어 뜻이 없어서(영어 뜻만 있음) 모델이 `word`(일본어 단어) 자체를 보고 직접 번역했다 — exampleKr과 마찬가지로 사용자가 "번역해서라도 채워라"고 승인한 건. 사전 대조 없이 번역한 값이라 개별 오역 가능성이 있다. `meaningEn`은 원본 영어 뜻을 그대로 보존해서, 나중에 `meaningKr`을 검증/재번역할 때 대조할 수 있게 남겨뒀다.

2026-07-07 기준 **N5만 완료**. N4~N1은 `data/cache/vocab-raw.json`(전체 7972단어 원본 파싱 결과)에 이미 있으니, 같은 방식(단어별로 `meaningKr` 번역 → `data/vocab-{level}.json` 생성)으로 이어서 채우면 된다.

