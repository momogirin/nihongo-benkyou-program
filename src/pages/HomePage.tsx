import { useMemo, useState } from 'react'
import { kanjiList, type KanjiLevel } from '../data/kanji'
import { vocabList } from '../data/vocab'
import { grammarList } from '../data/grammar'
import { englishVocabList } from '../data/englishVocab'
import { kanaList } from '../data/kana'
import { conjugationList } from '../lib/conjugation'
import { vocabConjugationEntries } from '../lib/vocabConjugation'
import { kanjiIdsQuizConfig } from '../lib/quizGenerator'
import {
  getConjugationQuizHistory,
  getConjugationWrongNotes,
  getKanaQuizHistory,
  getDueSrsIds,
  getEnglishVocabInProgressQuiz,
  getEnglishVocabQuizHistory,
  getEnglishVocabWrongNotes,
  getGrammarInProgressQuiz,
  getGrammarQuizHistory,
  getGrammarWrongNotes,
  getInProgressQuiz,
  getKanaWrongNotes,
  getMockExamHistory,
  getMockExamInProgressQuiz,
  getQuizHistory,
  getVocabInProgressQuiz,
  getVocabQuizHistory,
  getVocabWrongNotes,
  getSetupPrefs,
  getWrongNotes,
  removeQuizHistoryEntry,
  setSetupPrefs,
  clearInProgressQuiz,
  clearVocabInProgressQuiz,
  clearGrammarInProgressQuiz,
  clearMockExamInProgressQuiz,
  clearEnglishVocabInProgressQuiz,
  type QuizHistoryDomain,
} from '../lib/storage'
import { pushLocalStateAfterDelete } from '../lib/useCloudSync'
import {
  getEnglishVocabStudyProgressSummary,
  getGrammarStudyProgressSummary,
  getLevelProgress,
  getStudyProgressSummary,
  getVocabStudyProgressSummary,
} from '../lib/studyProgress'
import {
  getDomainAccuracies,
  getDomainLevelAccuracies,
  getSrsMastery,
  getWeakestDomainLevel,
  getWeeklyStats,
} from '../lib/statsSummary'
import type { QuizConfig } from '../types'
import './HomePage.css'

// 가나·활용은 통계/정답률 도메인 집계 대상이 아니라 실제로 이 라벨로 렌더되지는
// 않지만, SrsDomain 유니온에 포함돼 타입상 키가 필요함
const GOAL_LEVELS: KanjiLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']

const DOMAIN_LABEL = {
  kanji: '한자',
  vocab: '단어',
  grammar: '문법',
  englishVocab: '영어단어',
  kana: '가나',
  conjugation: '활용',
} as const

// 활용 SRS due/오답노트를 조회할 전체 id 집합 — 활용 퀴즈의 allEntries()와 동일
// 구성(엄선 + 급수별 태깅 어휘). id는 서로 겹치지 않음(엄선 CJ-*, 어휘 N5-* 등)
const ALL_CONJUGATION_IDS = [
  ...conjugationList.map((e) => e.id),
  ...(['N5', 'N4', 'N3', 'N2', 'N1'] as const).flatMap((l) => vocabConjugationEntries(l).map((e) => e.id)),
]

interface Props {
  onStartQuiz: (config: QuizConfig) => void
  onResumeQuiz: () => void
  onGoToStudy: () => void
  onGoToVocab: () => void
  onGoToGrammar: () => void
  onGoToMockExam: () => void
  onGoToEnglishVocab: () => void
  onGoToKana: () => void
  onGoToConjugation: () => void
  onRetryVocab: (ids: string[]) => void
  onRetryGrammar: (ids: string[]) => void
  onRetryEnglishVocab: (ids: string[]) => void
}

// 오답 재도전/학습 배치/기록 재시도는 전부 levels 없이 kanjiIds로 직접 지정하니,
// 이 경우엔 급수 대신 글자 수를 보여준다
function configSummary(config: QuizConfig): string {
  if (config.kanjiIds) return `한자 ${config.kanjiIds.length}자`
  return config.levels.length === 5 ? '전체 급수' : config.levels.join('·')
}

function countLabel(count: QuizConfig['count']): string {
  return count === 'all' ? '전체' : `${count}문항`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function HomePage({
  onStartQuiz,
  onResumeQuiz,
  onGoToStudy,
  onGoToVocab,
  onGoToGrammar,
  onGoToMockExam,
  onGoToEnglishVocab,
  onGoToKana,
  onGoToConjugation,
  onRetryVocab,
  onRetryGrammar,
  onRetryEnglishVocab,
}: Props) {
  // 목표 급수 — "지금 내가 준비하는 급수"를 하나 정해두면 도메인별로 흩어진 진도를
  // 홈에서 합산해 보여준다. 급수 단위 완료 여부를 알 방법이 이것 말고는 없었다
  // (화면 5개를 각각 들어가 확인해야 했음).
  const [goalLevel, setGoalLevel] = useState<KanjiLevel>(() => {
    const saved = getSetupPrefs<{ goalLevel: KanjiLevel }>('home')?.goalLevel
    return saved && GOAL_LEVELS.includes(saved) ? saved : 'N5'
  })
  const levelProgress = useMemo(() => getLevelProgress(goalLevel), [goalLevel])

  function changeGoalLevel(level: KanjiLevel) {
    setGoalLevel(level)
    setSetupPrefs<{ goalLevel: KanjiLevel }>('home', { goalLevel: level })
  }

  // 이 화면은 localStorage 스냅샷을 마운트 시점에 memo해 둔다. 폐기(x) 후에는
  // 다시 읽어야 목록에서 사라지므로, 이 값을 올려 아래 memo들을 갱신한다.
  const [discardCount, setDiscardCount] = useState(0)
  const [discardError, setDiscardError] = useState<string | null>(null)

  // 폐기는 로컬에서 지운 뒤 클라우드에 지금 상태를 바로 push한다. 일반 동기화는
  // pull→병합(union)이라 push하지 않으면 다음 동기화 때 되살아난다.
  function discard(remove: () => void) {
    remove()
    setDiscardCount((v) => v + 1)
    void pushLocalStateAfterDelete().catch((err) => {
      // 로컬 삭제는 이미 끝났고 화면에도 반영됐다. 클라우드 반영만 실패한
      // 상황이라 조용히 넘기지 않고 사용자에게 알린다.
      console.error(err)
      setDiscardError('폐기한 항목을 계정에 반영하지 못했습니다 — 다른 기기에서 다시 나타날 수 있습니다')
    })
  }

  // discardCount는 이 memo들의 "입력값"은 아니지만, 폐기 후 localStorage를
  // 다시 읽게 하는 트리거다(린터는 이걸 불필요한 의존성으로 본다 — 의도된 것)
  /* eslint-disable react-hooks/exhaustive-deps */
  const history = useMemo(() => getQuizHistory(), [discardCount])
  const vocabHistory = useMemo(() => getVocabQuizHistory(), [discardCount])
  const grammarHistory = useMemo(() => getGrammarQuizHistory(), [discardCount])
  const mockExamHistory = useMemo(() => getMockExamHistory(), [discardCount])
  const englishVocabHistory = useMemo(() => getEnglishVocabQuizHistory(), [discardCount])
  const conjugationHistory = useMemo(() => getConjugationQuizHistory(), [discardCount])
  const kanaHistory = useMemo(() => getKanaQuizHistory(), [discardCount])
  /* eslint-enable react-hooks/exhaustive-deps */

  // merge all three domains' quiz history into one chronological feed —
  // vocab/grammar entries don't carry a replayable config like kanji's, so
  // clicking one just navigates to that domain's page instead of an exact re-run
  const mergedHistory = useMemo(() => {
    const kanjiItems = history.map((e) => ({
      id: e.id,
      domain: 'kanji' as QuizHistoryDomain,
      finishedAt: e.finishedAt,
      correct: e.correct,
      total: e.total,
      label: `${configSummary(e.config)} · ${countLabel(e.config.count)}`,
      onClick: () => onStartQuiz(e.config),
    }))
    const vocabItems = vocabHistory.map((e) => ({
      id: e.id,
      domain: 'vocab' as QuizHistoryDomain,
      finishedAt: e.finishedAt,
      correct: e.correct,
      total: e.total,
      label: `단어 ${e.level} · ${e.total}문항`,
      onClick: onGoToVocab,
    }))
    const grammarItems = grammarHistory.map((e) => ({
      id: e.id,
      domain: 'grammar' as QuizHistoryDomain,
      finishedAt: e.finishedAt,
      correct: e.correct,
      total: e.total,
      label: `문법 ${e.level} · ${e.total}문항`,
      onClick: onGoToGrammar,
    }))
    const mockExamItems = mockExamHistory.map((e) => ({
      id: e.id,
      domain: 'mockExam' as QuizHistoryDomain,
      finishedAt: e.finishedAt,
      correct: e.correct,
      total: e.total,
      label: `모의고사 ${e.level} · ${e.total}문항`,
      onClick: onGoToMockExam,
    }))
    const englishVocabItems = englishVocabHistory.map((e) => ({
      id: e.id,
      domain: 'englishVocab' as QuizHistoryDomain,
      finishedAt: e.finishedAt,
      correct: e.correct,
      total: e.total,
      label: `영어단어 ${e.level} · ${e.total}문항`,
      onClick: onGoToEnglishVocab,
    }))
    const conjugationItems = conjugationHistory.map((e) => ({
      id: e.id,
      domain: 'conjugation' as QuizHistoryDomain,
      finishedAt: e.finishedAt,
      correct: e.correct,
      total: e.total,
      label: `활용 ${e.source} · ${e.mode} · ${e.total}문항`,
      onClick: onGoToConjugation,
    }))
    const kanaItems = kanaHistory.map((e) => ({
      id: e.id,
      domain: 'kana' as QuizHistoryDomain,
      finishedAt: e.finishedAt,
      correct: e.correct,
      total: e.total,
      label: `가나 ${e.mode} · ${e.total}문항`,
      onClick: onGoToKana,
    }))
    return [
      ...kanjiItems,
      ...vocabItems,
      ...grammarItems,
      ...mockExamItems,
      ...englishVocabItems,
      ...conjugationItems,
      ...kanaItems,
    ]
      .sort((a, b) => b.finishedAt.localeCompare(a.finishedAt))
      .slice(0, 20)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, vocabHistory, grammarHistory, mockExamHistory, englishVocabHistory, conjugationHistory, kanaHistory])

  /* eslint-disable react-hooks/exhaustive-deps */
  const inProgress = useMemo(() => getInProgressQuiz(), [discardCount])
  const vocabInProgress = useMemo(() => getVocabInProgressQuiz(), [discardCount])
  const grammarInProgress = useMemo(() => getGrammarInProgressQuiz(), [discardCount])
  const mockExamInProgress = useMemo(() => getMockExamInProgressQuiz(), [discardCount])
  const englishVocabInProgress = useMemo(() => getEnglishVocabInProgressQuiz(), [discardCount])
  /* eslint-enable react-hooks/exhaustive-deps */
  const studyProgress = useMemo(() => getStudyProgressSummary(), [])
  const vocabStudyProgress = useMemo(() => getVocabStudyProgressSummary(), [])
  const grammarStudyProgress = useMemo(() => getGrammarStudyProgressSummary(), [])
  const englishVocabStudyProgress = useMemo(() => getEnglishVocabStudyProgressSummary(), [])

  const wrongNoteIds = useMemo(() => {
    const validIds = new Set(kanjiList.map((k) => k.id))
    return getWrongNotes()
      .map((n) => n.kanjiId)
      .filter((id) => validIds.has(id))
  }, [])

  const vocabWrongIds = useMemo(() => {
    const validIds = new Set(vocabList.map((w) => w.id))
    return getVocabWrongNotes()
      .map((n) => n.vocabId)
      .filter((id) => validIds.has(id))
  }, [])

  const grammarWrongIds = useMemo(() => {
    const validIds = new Set(grammarList.map((g) => g.id))
    return getGrammarWrongNotes()
      .map((n) => n.grammarId)
      .filter((id) => validIds.has(id))
  }, [])

  const englishVocabWrongIds = useMemo(() => {
    const validIds = new Set(englishVocabList.map((w) => w.id))
    return getEnglishVocabWrongNotes()
      .map((n) => n.englishVocabId)
      .filter((id) => validIds.has(id))
  }, [])

  const kanaWrongIds = useMemo(() => {
    const validIds = new Set(kanaList.map((k) => k.id))
    return getKanaWrongNotes()
      .map((n) => n.kanaId)
      .filter((id) => validIds.has(id))
  }, [])

  const conjugationWrongIds = useMemo(() => {
    const validIds = new Set(ALL_CONJUGATION_IDS)
    return getConjugationWrongNotes()
      .map((n) => n.conjugationId)
      .filter((id) => validIds.has(id))
  }, [])

  // SRS(간격반복 복습) — 퀴즈에서 한 번이라도 다뤄진 항목 중 복습 시점이 된 것.
  // 오답노트(항상 틀린 것)와 달리 "지금이 다시 볼 타이밍"이라는 시간 축 정보라 별도 카드로 둠
  const dueKanjiIds = useMemo(() => getDueSrsIds('kanji', kanjiList.map((k) => k.id)), [])
  const dueVocabIds = useMemo(() => getDueSrsIds('vocab', vocabList.map((w) => w.id)), [])
  const dueGrammarIds = useMemo(() => getDueSrsIds('grammar', grammarList.map((g) => g.id)), [])
  const dueEnglishVocabIds = useMemo(
    () => getDueSrsIds('englishVocab', englishVocabList.map((w) => w.id)),
    [],
  )
  const dueKanaIds = useMemo(() => getDueSrsIds('kana', kanaList.map((k) => k.id)), [])
  const dueConjugationIds = useMemo(() => getDueSrsIds('conjugation', ALL_CONJUGATION_IDS), [])

  // 학습 통계 — 진도/오답과 달리 "얼마나 잘 하고 있는지"를 보여주는 요약이라
  // 액션 카드 그리드와는 별도 섹션으로 둠
  const weeklyStats = useMemo(() => getWeeklyStats(), [])
  const domainAccuracies = useMemo(() => getDomainAccuracies(), [])
  // 도메인 단위보다 세밀한 (도메인, 급수) 약점 — "가장 약한 급수"를 콕 집어 안내
  const domainLevelAccuracies = useMemo(() => getDomainLevelAccuracies(), [])
  const weakestDomainLevel = useMemo(
    () => getWeakestDomainLevel(domainLevelAccuracies),
    [domainLevelAccuracies],
  )
  // 약점 카드 클릭 시 해당 도메인으로 이동(급수는 그 화면에서 선택). 급수별 약점을
  // 계산하는 도메인은 kanji/vocab/grammar/englishVocab 넷뿐이라 이들만 매핑
  const weakestNav: Partial<Record<keyof typeof DOMAIN_LABEL, () => void>> = {
    kanji: onGoToStudy,
    vocab: onGoToVocab,
    grammar: onGoToGrammar,
    englishVocab: onGoToEnglishVocab,
  }
  const srsMasteryByDomain = useMemo(
    () => ({
      kanji: getSrsMastery('kanji'),
      vocab: getSrsMastery('vocab'),
      grammar: getSrsMastery('grammar'),
      englishVocab: getSrsMastery('englishVocab'),
    }),
    [],
  )
  const hasStats = weeklyStats.total > 0 || domainAccuracies.some((a) => a.total > 0)

  const hasAnyEntry =
    studyProgress ||
    vocabStudyProgress ||
    grammarStudyProgress ||
    englishVocabStudyProgress ||
    inProgress ||
    vocabInProgress ||
    grammarInProgress ||
    englishVocabInProgress ||
    mockExamInProgress ||
    wrongNoteIds.length > 0 ||
    vocabWrongIds.length > 0 ||
    grammarWrongIds.length > 0 ||
    englishVocabWrongIds.length > 0 ||
    kanaWrongIds.length > 0 ||
    conjugationWrongIds.length > 0 ||
    dueKanjiIds.length > 0 ||
    dueVocabIds.length > 0 ||
    dueGrammarIds.length > 0 ||
    dueEnglishVocabIds.length > 0 ||
    dueKanaIds.length > 0 ||
    dueConjugationIds.length > 0
  // 목표 급수 카드 — 학습 기록이 하나도 없어도(첫 진입) 보여준다. 오히려 그때가
  // "N5는 뭘 얼마나 해야 하나"를 알려줘야 하는 시점이라, 예전의 안내 문구 한 줄보다
  // 이 카드가 그 역할을 한다.
  const goalSection = (
    <section className="home-section">
      <div className="home-goal-header">
        <h2 className="home-section-title">목표 급수</h2>
        <div className="home-goal-levels">
          {GOAL_LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              className={`home-goal-level${l === goalLevel ? ' active' : ''}`}
              onClick={() => changeGoalLevel(l)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="home-goal-card">
        <div className="home-goal-total">
          <span className="home-goal-total-label">
            {goalLevel} 전체 진행률
            {levelProgress.total > 0 && levelProgress.completed >= levelProgress.total && ' · 학습 완료'}
          </span>
          <span className="home-goal-total-value">
            {levelProgress.total > 0 ? Math.round((levelProgress.completed / levelProgress.total) * 100) : 0}%
          </span>
        </div>
        <span className="home-progress-bar">
          <span
            className="home-progress-bar-fill"
            style={{
              width: `${levelProgress.total > 0 ? Math.round((levelProgress.completed / levelProgress.total) * 100) : 0}%`,
            }}
          />
        </span>
        <p className="home-goal-total-detail">
          {levelProgress.completed}/{levelProgress.total} 학습함 · 정착 {levelProgress.mastered}개
        </p>

        <div className="home-goal-domains">
          {levelProgress.domains.map((d) => {
            const rate = d.total > 0 ? d.completed / d.total : 0
            const nav = weakestNav[d.domain]
            return (
              <button
                key={d.domain}
                type="button"
                className="home-goal-domain"
                onClick={nav}
              >
                <span className="home-goal-domain-label">{d.label}</span>
                <span className="home-progress-bar">
                  <span className="home-progress-bar-fill" style={{ width: `${Math.round(rate * 100)}%` }} />
                </span>
                <span className="home-goal-domain-detail">
                  {d.completed}/{d.total} · 정착 {d.mastered}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )

  if (!hasAnyEntry && mergedHistory.length === 0) {
    return (
      <div className="page">
        <h1>홈</h1>
        {goalSection}
        <p className="page-placeholder">사이드바에서 학습할 영역을 골라 시작하세요.</p>
      </div>
    )
  }

  // "지금 할 일" — 복습(SRS due, 긴급)과 이어하기(마무리 못한 퀴즈, 재개)를
  // 긴급도순으로 한 리스트에 합침. 학습 진도/오답 재도전은 참고 정보라 아래
  // 별도 섹션으로 분리(카드 그리드 하나에 성격이 다른 항목이 다 섞여있으면
  // "지금 뭘 해야 하는지"가 안 보인다는 지적 반영, 2026-07-16)
  const priorityItems = [
    dueKanjiIds.length > 0 && {
      key: 'due-kanji',
      urgent: true,
      title: '한자 복습',
      detail: `${dueKanjiIds.length}자 복습할 시간이에요`,
      onClick: () => onStartQuiz(kanjiIdsQuizConfig(dueKanjiIds)),
      // 복습 알림은 SRS 일정에서 파생된 값이라 폐기 대상이 아니다
      onDiscard: null,
    },
    dueVocabIds.length > 0 && {
      key: 'due-vocab',
      urgent: true,
      title: '단어 복습',
      detail: `${dueVocabIds.length}개 복습할 시간이에요`,
      onClick: () => onRetryVocab(dueVocabIds),
      onDiscard: null,
    },
    dueGrammarIds.length > 0 && {
      key: 'due-grammar',
      urgent: true,
      title: '문법 복습',
      detail: `${dueGrammarIds.length}개 복습할 시간이에요`,
      onClick: () => onRetryGrammar(dueGrammarIds),
      onDiscard: null,
    },
    dueEnglishVocabIds.length > 0 && {
      key: 'due-english',
      urgent: true,
      title: '영어단어 복습',
      detail: `${dueEnglishVocabIds.length}개 복습할 시간이에요`,
      onClick: () => onRetryEnglishVocab(dueEnglishVocabIds),
      onDiscard: null,
    },
    dueKanaIds.length > 0 && {
      key: 'due-kana',
      urgent: true,
      title: '가나 복습',
      detail: `${dueKanaIds.length}자 복습할 시간이에요`,
      onClick: onGoToKana,
      onDiscard: null,
    },
    dueConjugationIds.length > 0 && {
      key: 'due-conjugation',
      urgent: true,
      title: '활용 복습',
      detail: `${dueConjugationIds.length}개 복습할 시간이에요`,
      onClick: onGoToConjugation,
      onDiscard: null,
    },
    inProgress && {
      key: 'resume-kanji',
      urgent: false,
      title: '마무리못한 한자 퀴즈',
      detail: `${configSummary(inProgress.config)} · ${inProgress.index}/${inProgress.questions.length} 진행 중`,
      onClick: onResumeQuiz,
      onDiscard: () => discard(clearInProgressQuiz),
    },
    vocabInProgress && {
      key: 'resume-vocab',
      urgent: false,
      title: '마무리못한 단어 퀴즈',
      detail: `${vocabInProgress.level} · ${vocabInProgress.index}/${vocabInProgress.questions.length} 진행 중`,
      onClick: onGoToVocab,
      onDiscard: () => discard(clearVocabInProgressQuiz),
    },
    grammarInProgress && {
      key: 'resume-grammar',
      urgent: false,
      title: '마무리못한 문법 퀴즈',
      detail: `${grammarInProgress.level} · ${grammarInProgress.index}/${grammarInProgress.questions.length} 진행 중`,
      onClick: onGoToGrammar,
      onDiscard: () => discard(clearGrammarInProgressQuiz),
    },
    mockExamInProgress && {
      key: 'resume-mockExam',
      urgent: false,
      title: '마무리못한 모의고사',
      detail: `${mockExamInProgress.level} · ${mockExamInProgress.index}/${mockExamInProgress.questions.length} 진행 중`,
      onClick: onGoToMockExam,
      onDiscard: () => discard(clearMockExamInProgressQuiz),
    },
    englishVocabInProgress && {
      key: 'resume-english',
      urgent: false,
      title: '마무리못한 영어단어 퀴즈',
      detail: `${englishVocabInProgress.level} · ${englishVocabInProgress.index}/${englishVocabInProgress.questions.length} 진행 중`,
      onClick: onGoToEnglishVocab,
      onDiscard: () => discard(clearEnglishVocabInProgressQuiz),
    },
  ].filter((item): item is Exclude<typeof item, false | null> => Boolean(item))

  const progressItems = [
    studyProgress && {
      key: 'progress-kanji',
      title: '한자 학습',
      // "학습함(카드 넘김)"과 별개로, 실제 외운(SRS 박스4 도달) 수를 병기해 진도를 정직하게
      detail: `${studyProgress.level} · ${studyProgress.completed}/${studyProgress.total}자 · 정착 ${srsMasteryByDomain.kanji.mastered}자`,
      rate: studyProgress.completed / studyProgress.total,
      onClick: onGoToStudy,
    },
    vocabStudyProgress && {
      key: 'progress-vocab',
      title: '단어 학습',
      detail: `${vocabStudyProgress.level} · ${vocabStudyProgress.completed}/${vocabStudyProgress.total}개 · 정착 ${srsMasteryByDomain.vocab.mastered}개`,
      rate: vocabStudyProgress.completed / vocabStudyProgress.total,
      onClick: onGoToVocab,
    },
    grammarStudyProgress && {
      key: 'progress-grammar',
      title: '문법 학습',
      detail: `${grammarStudyProgress.level} · ${grammarStudyProgress.completed}/${grammarStudyProgress.total}개 · 정착 ${srsMasteryByDomain.grammar.mastered}개`,
      rate: grammarStudyProgress.completed / grammarStudyProgress.total,
      onClick: onGoToGrammar,
    },
    englishVocabStudyProgress && {
      key: 'progress-english',
      title: '영어단어 학습',
      detail: `${englishVocabStudyProgress.level} · ${englishVocabStudyProgress.completed}/${englishVocabStudyProgress.total}개 · 정착 ${srsMasteryByDomain.englishVocab.mastered}개`,
      rate: englishVocabStudyProgress.completed / englishVocabStudyProgress.total,
      onClick: onGoToEnglishVocab,
    },
  ].filter((item): item is Exclude<typeof item, false | null> => Boolean(item))

  const retryItems = [
    wrongNoteIds.length > 0 && {
      key: 'retry-kanji',
      title: '한자',
      count: wrongNoteIds.length,
      unit: '자',
      onClick: () => onStartQuiz(kanjiIdsQuizConfig(wrongNoteIds)),
    },
    vocabWrongIds.length > 0 && {
      key: 'retry-vocab',
      title: '단어',
      count: vocabWrongIds.length,
      unit: '개',
      onClick: () => onRetryVocab(vocabWrongIds),
    },
    grammarWrongIds.length > 0 && {
      key: 'retry-grammar',
      title: '문법',
      count: grammarWrongIds.length,
      unit: '개',
      onClick: () => onRetryGrammar(grammarWrongIds),
    },
    englishVocabWrongIds.length > 0 && {
      key: 'retry-english',
      title: '영어단어',
      count: englishVocabWrongIds.length,
      unit: '개',
      onClick: () => onRetryEnglishVocab(englishVocabWrongIds),
    },
    kanaWrongIds.length > 0 && {
      key: 'retry-kana',
      title: '가나',
      count: kanaWrongIds.length,
      unit: '자',
      onClick: onGoToKana,
    },
    conjugationWrongIds.length > 0 && {
      key: 'retry-conjugation',
      title: '활용',
      count: conjugationWrongIds.length,
      unit: '개',
      onClick: onGoToConjugation,
    },
  ].filter((item): item is Exclude<typeof item, false | null> => Boolean(item))

  return (
    <div className="page">
      <h1>홈</h1>

      {discardError && (
        <p className="home-discard-error" role="status">
          {discardError}
        </p>
      )}

      {goalSection}

      {priorityItems.length > 0 && (
        <section className="home-section">
          <h2 className="home-section-title">지금 할 일</h2>
          <div className="home-priority-list">
            {priorityItems.map((item) => (
              <div key={item.key} className={`home-priority-row${item.urgent ? ' urgent' : ''}`}>
                <button type="button" className="home-priority-card" onClick={item.onClick}>
                  <span className="home-priority-body">
                    <span className="home-priority-title">{item.title}</span>
                    <span className="home-priority-detail">{item.detail}</span>
                  </span>
                  <span className="home-priority-chip">{item.urgent ? '시작' : '이어하기'} →</span>
                </button>
                {/* 폐기 자리는 항목마다 항상 예약해 둔다(복습 항목은 비활성) —
                    있고 없고에 따라 카드 폭이 흔들리지 않게 */}
                <button
                  type="button"
                  className={`home-discard-button${item.onDiscard ? '' : ' placeholder'}`}
                  aria-label={`${item.title} 폐기`}
                  aria-hidden={!item.onDiscard}
                  tabIndex={item.onDiscard ? undefined : -1}
                  title="폐기"
                  disabled={!item.onDiscard}
                  onClick={item.onDiscard ?? undefined}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {progressItems.length > 0 && (
        <section className="home-section">
          <h2 className="home-section-title">학습 진도</h2>
          <div className="home-progress-grid">
            {progressItems.map((item) => (
              <button key={item.key} type="button" className="home-progress-card" onClick={item.onClick}>
                <span className="home-progress-title">{item.title}</span>
                <span className="home-progress-bar">
                  <span className="home-progress-bar-fill" style={{ width: `${Math.round(item.rate * 100)}%` }} />
                </span>
                <span className="home-progress-detail">{item.detail}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {retryItems.length > 0 && (
        <section className="home-section">
          <h2 className="home-section-title">오답 재도전</h2>
          <div className="home-retry-row">
            {retryItems.map((item) => (
              <button key={item.key} type="button" className="home-retry-chip" onClick={item.onClick}>
                {item.title} <span className="home-retry-count">{item.count}{item.unit}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {hasStats && (
        <section className="home-section">
          <h2 className="home-section-title">학습 통계</h2>
          <div className="home-stats-grid">
            <div className="home-stats-card">
              <span className="home-stats-label">이번 주 복습</span>
              <span className="home-stats-value">{weeklyStats.total}문항</span>
              <span className="home-stats-sub">
                {weeklyStats.sessionCount}회
                {weeklyStats.total > 0 && ` · 정답률 ${Math.round((weeklyStats.correct / weeklyStats.total) * 100)}%`}
              </span>
            </div>
            {domainAccuracies
              .filter((a) => a.total > 0)
              .map((a) => (
                <div className="home-stats-card" key={a.domain}>
                  <span className="home-stats-label">{DOMAIN_LABEL[a.domain]} 누적 정답률</span>
                  <span className="home-stats-value">{a.rate}%</span>
                  <span className="home-stats-sub">
                    {a.correct}/{a.total}문항
                  </span>
                </div>
              ))}
            {(['kanji', 'vocab', 'grammar', 'englishVocab'] as const)
              .filter((domain) => srsMasteryByDomain[domain].mastered + srsMasteryByDomain[domain].reviewing > 0)
              .map((domain) => {
                const { mastered, reviewing } = srsMasteryByDomain[domain]
                return (
                  <div className="home-stats-card" key={domain}>
                    <span className="home-stats-label">{DOMAIN_LABEL[domain]} 암기 정착도</span>
                    <span className="home-stats-value">
                      {mastered}/{mastered + reviewing}
                    </span>
                    <span className="home-stats-sub">완전히 외운 항목 (나머지 {reviewing}개는 복습 주기 도는 중)</span>
                  </div>
                )
              })}
          </div>
          {weakestDomainLevel && (
            <button
              type="button"
              className="home-stats-weak"
              onClick={weakestNav[weakestDomainLevel.domain]}
            >
              <span>
                가장 약한 영역: <strong>{DOMAIN_LABEL[weakestDomainLevel.domain]} {weakestDomainLevel.level}</strong> — 누적
                정답률 {weakestDomainLevel.rate}% ({weakestDomainLevel.correct}/{weakestDomainLevel.total}문항)
              </span>
              <span className="home-stats-weak-chip">복습하러 가기 →</span>
            </button>
          )}
        </section>
      )}

      {mergedHistory.length > 0 && (
        <section className="home-section">
          <h2 className="home-section-title">최근 기록</h2>
          <ul className="home-history-list">
            {mergedHistory.map((entry) => (
              <li key={`${entry.domain}:${entry.id}`} className="home-history-row">
                <button type="button" className="home-history-item" onClick={entry.onClick}>
                  <span className="home-history-main">
                    <span className="home-history-summary">{entry.label}</span>
                    <span className="home-history-date">{formatDate(entry.finishedAt)}</span>
                  </span>
                  <span className="home-history-score">
                    {entry.correct}/{entry.total}
                  </span>
                </button>
                <button
                  type="button"
                  className="home-discard-button"
                  aria-label={`${entry.label} 기록 폐기`}
                  title="폐기"
                  onClick={() => discard(() => removeQuizHistoryEntry(entry.domain, entry.id))}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
