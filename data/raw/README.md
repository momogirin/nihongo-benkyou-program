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

새로 추가된 1340자는 exampleKanji/exampleKr/exampleJp/exampleRefKanji/exampleRefNum(예문)이 없다 (`null`) — 원본 엑셀 수준의 예문 큐레이션은 하지 않았다.

동사/형용사류 훈(예: "어지럽다") 중 일부는 위키낱말사전 원문을 그대로 가져와 사전형(-다) 그대로이고, 전통 옥편처럼 관형형(-(으)ㄹ, 예: "어지러울")으로 다듬지는 않았다 — 불규칙 활용 변환 과정에서 오히려 오류가 생길 위험이 있어 그대로 두었다.
