// 일본어 활용 규칙 엔진 — 결정론적 문법 규칙(五段 音便, 未然形/連用形,
// する/来る 불규칙, い/な형용사)으로 사전형에서 활용형을 만든다. 규칙 정확성은
// scripts 검증 세트로 확인함(생성 콘텐츠 없음).
import { conjugationList, type ConjugationEntry, type ConjugationType } from '../data/conjugation'

export type VerbForm = 'dict' | 'masu' | 'te' | 'nai' | 'ta'
export type AdjForm = 'dict' | 'negative' | 'past' | 'te'

// 五段 어미(う단) → 각 활용 어간/꼴
const GODAN_MASU: Record<string, string> = { う: 'い', く: 'き', ぐ: 'ぎ', す: 'し', つ: 'ち', ぬ: 'に', ぶ: 'び', む: 'み', る: 'り' }
const GODAN_NAI: Record<string, string> = { う: 'わ', く: 'か', ぐ: 'が', す: 'さ', つ: 'た', ぬ: 'な', ぶ: 'ば', む: 'ま', る: 'ら' }
const GODAN_TE: Record<string, string> = { う: 'って', く: 'いて', ぐ: 'いで', す: 'して', つ: 'って', ぬ: 'んで', ぶ: 'んで', む: 'んで', る: 'って' }
const GODAN_TA: Record<string, string> = { う: 'った', く: 'いた', ぐ: 'いだ', す: 'した', つ: 'った', ぬ: 'んだ', ぶ: 'んだ', む: 'んだ', る: 'った' }

// str: 사전형(단어 또는 읽기, 어미가 かな). 五段은 어미 かな로 열을 판정.
function conjGodan(str: string, form: VerbForm): string {
  if (form === 'dict') return str
  const last = str.slice(-1)
  const stem = str.slice(0, -1)
  // 行く는 て/た형이 음편 예외(いって/いった)
  const isIku = str === 'いく' || str.endsWith('行く')
  if (form === 'masu') return stem + GODAN_MASU[last] + 'ます'
  if (form === 'nai') return stem + GODAN_NAI[last] + 'ない'
  if (form === 'te') return isIku ? stem + 'って' : stem + GODAN_TE[last]
  return isIku ? stem + 'った' : stem + GODAN_TA[last] // ta
}

function conjIchidan(str: string, form: VerbForm): string {
  const stem = str.slice(0, -1) // remove る
  return { dict: str, masu: stem + 'ます', te: stem + 'て', ta: stem + 'た', nai: stem + 'ない' }[form]
}

// する 및 복합동사(勉強する 등): 끝의 する만 활용
function conjSuru(str: string, form: VerbForm): string {
  const stem = str.slice(0, -2)
  return { dict: str, masu: stem + 'します', te: stem + 'して', ta: stem + 'した', nai: stem + 'しない' }[form]
}

// 来る/くる: 읽기는 き/こ로 모음 변화, 한자표기는 来 유지
function conjKuru(str: string, form: VerbForm): string {
  if (form === 'dict') return str
  if (str.endsWith('くる')) {
    const p = str.slice(0, -2)
    return p + { masu: 'きます', te: 'きて', ta: 'きた', nai: 'こない' }[form]
  }
  const stem = str.slice(0, -1) // 来る -> 来
  return { masu: stem + 'ます', te: stem + 'て', ta: stem + 'た', nai: stem + 'ない' }[form]
}

// い형용사. いい/よい는 어간 よ로 불규칙
function conjIadj(str: string, form: AdjForm): string {
  if (form === 'dict') return str
  if (str === 'いい' || str === 'よい') {
    return { negative: 'よくない', past: 'よかった', te: 'よくて' }[form]
  }
  const stem = str.slice(0, -1) // remove 끝 い
  return { negative: stem + 'くない', past: stem + 'かった', te: stem + 'くて' }[form]
}

// な형용사(사전형은 な 없이 저장)
function conjNaadj(str: string, form: AdjForm): string {
  return { dict: str, negative: str + 'じゃない', past: str + 'だった', te: str + 'で' }[form]
}

function conjVerb(str: string, type: ConjugationType, form: VerbForm): string {
  if (type === 'godan') return conjGodan(str, form)
  if (type === 'ichidan') return conjIchidan(str, form)
  if (type === 'suru') return conjSuru(str, form)
  if (type === 'kuru') return conjKuru(str, form)
  return str
}

export function isAdjective(type: ConjugationType): boolean {
  return type === 'iadj' || type === 'naadj'
}

export const VERB_FORMS: { key: VerbForm; label: string; hint: string }[] = [
  { key: 'dict', label: '사전형', hint: '기본형' },
  { key: 'masu', label: 'ます형', hint: '정중형' },
  { key: 'te', label: 'て형', hint: '연결·진행' },
  { key: 'nai', label: 'ない형', hint: '부정' },
  { key: 'ta', label: 'た형', hint: '과거' },
]

export const ADJ_FORMS: { key: AdjForm; label: string; hint: string }[] = [
  { key: 'dict', label: '사전형', hint: '기본형' },
  { key: 'negative', label: '부정형', hint: '~하지 않다' },
  { key: 'past', label: '과거형', hint: '~했다' },
  { key: 'te', label: 'て형', hint: '연결' },
]

export interface ConjugatedForm {
  key: string
  label: string
  hint: string
  word: string
  reading: string
}

// 한 항목의 모든 활용형(단어 표기 + 읽기)을 반환. 동사/형용사에 따라 폼 집합이 다름.
export function conjugate(entry: ConjugationEntry): ConjugatedForm[] {
  if (isAdjective(entry.type)) {
    const fn = entry.type === 'iadj' ? conjIadj : conjNaadj
    return ADJ_FORMS.map(({ key, label, hint }) => ({
      key,
      label,
      hint,
      word: fn(entry.word, key),
      reading: fn(entry.reading, key),
    }))
  }
  return VERB_FORMS.map(({ key, label, hint }) => ({
    key,
    label,
    hint,
    word: conjVerb(entry.word, entry.type, key),
    reading: conjVerb(entry.reading, entry.type, key),
  }))
}

export const TYPE_LABELS: Record<ConjugationType, string> = {
  godan: '5단동사',
  ichidan: '1단동사',
  suru: 'する동사',
  kuru: 'くる동사',
  iadj: 'い형용사',
  naadj: 'な형용사',
}

export { conjugationList, type ConjugationEntry, type ConjugationType }
