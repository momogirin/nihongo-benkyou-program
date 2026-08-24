// "4급 한자 완전판.xlsx" 양식 그대로 한자 목록을 엑셀(xlsx)로 뽑는다.
//
// 라이브러리를 쓰지 않고 OOXML(=xml 몇 장을 zip으로 묶은 것)을 직접 만든다.
// 브라우저에는 zlib이 없으므로 zip 엔트리는 전부 "stored"(무압축)로 넣는다 —
// zip 스펙상 정식 방식이고, 엑셀/구글시트 모두 그대로 연다.
//
// 서식(폰트·크기·색·열너비)은 원본 xlsx의 styles.xml에서 실제로 쓰이던 값만
// 그대로 옮겨 적은 것이다. 원본은 폰트 19종/스타일 45종을 담고 있지만 "전체"
// 시트가 쓰는 건 아래 5종뿐이라, 쓰는 것만 남겨 파일을 가볍게 유지한다.
import { kanjiList, type Kanji, type KanjiLevel } from '../data/kanji'

export const ALL_LEVELS: KanjiLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']

// 내보낼 수 있는 열 — 원본 양식의 A~K열과 1:1 대응.
// width/styleId는 원본 값이라 임의로 바꾸지 않는다.
export interface ExcelColumn {
  id: ColumnId
  header: string
  width: number
  big: boolean // true면 24pt (원본에서 한자·예시한자 열만 크게 쓴다)
  value: (k: Kanji) => string | number | null
}

export type ColumnId =
  | 'num'
  | 'kanji'
  | 'kunKr'
  | 'kunJp'
  | 'onJp'
  | 'exampleKanji'
  | 'exampleKr'
  | 'exampleJp'
  | 'note'
  | 'exampleRefKanji'
  | 'exampleRefNum'

// 비고: onReadingOverride(음독 예외)를 원본 "비고"열과 같은 성격으로 풀어 쓴다
function noteOf(k: Kanji): string {
  if (!k.onReadingOverride || k.onReadingOverride.length === 0) return ''
  return k.onReadingOverride
    .map((o) => `${o.on}: ${o.word}(${o.reading})${o.meaningKr ? ` ${o.meaningKr}` : ''}`)
    .join(' / ')
}

export const EXCEL_COLUMNS: ExcelColumn[] = [
  { id: 'num', header: '번호', width: 3.88, big: false, value: (k) => k.num },
  { id: 'kanji', header: '한자', width: 7.63, big: true, value: (k) => k.kanji },
  { id: 'kunKr', header: '훈음', width: 8.0, big: false, value: (k) => k.kunKr },
  { id: 'kunJp', header: '훈독(일본어)', width: 8.0, big: false, value: (k) => k.kunJp },
  { id: 'onJp', header: '음독(일본어)', width: 12.63, big: false, value: (k) => k.onJp },
  { id: 'exampleKanji', header: '예시(한자)', width: 14.38, big: true, value: (k) => k.exampleKanji },
  { id: 'exampleKr', header: '예시(한국어)', width: 20.13, big: false, value: (k) => k.exampleKr },
  { id: 'exampleJp', header: '예시(일본어)', width: 12.88, big: false, value: (k) => k.exampleJp },
  { id: 'note', header: '비고', width: 12.63, big: false, value: noteOf },
  { id: 'exampleRefKanji', header: '예시 한자 참고', width: 43.63, big: false, value: (k) => k.exampleRefKanji },
  { id: 'exampleRefNum', header: '예시 한자 번호', width: 16.5, big: false, value: (k) => k.exampleRefNum },
]

// ---- xml helpers ----

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function colName(n: number): string {
  let s = ''
  while (n > 0) {
    const r = (n - 1) % 26
    s = String.fromCharCode(65 + r) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

// styleId — 아래 styles.xml의 cellXfs 순서와 반드시 일치해야 한다
// (0번은 기본 서식으로 비워 둔다 — 엑셀이 요구하는 자리)
const S_HEAD = 1 // Noto Sans JP 10pt Bold 흰색 / 남색(#2F4F8F) / 가운데
const S_BODY = 2 // Noto Sans JP 10pt / #F9F9F9 / 가운데
const S_BIG = 3 // Noto Sans JP 24pt / #F9F9F9 / 가운데

// 원본 xlsx에서 실제 쓰이던 서식만 추린 styles.xml
const STYLES_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<numFmts count="0"/>' +
  '<fonts count="4">' +
  '<font><sz val="10.0"/><color rgb="FF000000"/><name val="Noto Sans JP"/></font>' +
  '<font><b/><sz val="10.0"/><color rgb="FFFFFFFF"/><name val="Noto Sans JP"/></font>' +
  '<font><sz val="10.0"/><color rgb="FF000000"/><name val="Noto Sans JP"/></font>' +
  '<font><sz val="24.0"/><color rgb="FF000000"/><name val="Noto Sans JP"/></font>' +
  '</fonts>' +
  '<fills count="4">' +
  '<fill><patternFill patternType="none"/></fill>' +
  '<fill><patternFill patternType="gray125"/></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FF2F4F8F"/><bgColor rgb="FF2F4F8F"/></patternFill></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FFF9F9F9"/><bgColor rgb="FFF9F9F9"/></patternFill></fill>' +
  '</fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf borderId="0" fillId="0" fontId="0" numFmtId="0"/></cellStyleXfs>' +
  '<cellXfs count="4">' +
  '<xf borderId="0" fillId="0" fontId="0" numFmtId="0" xfId="0"/>' +
  '<xf borderId="0" fillId="2" fontId="1" numFmtId="0" xfId="0" applyAlignment="1" applyFill="1" applyFont="1"><alignment horizontal="center" vertical="center"/></xf>' +
  '<xf borderId="0" fillId="3" fontId="2" numFmtId="0" xfId="0" applyAlignment="1" applyFill="1" applyFont="1"><alignment horizontal="center" vertical="center"/></xf>' +
  '<xf borderId="0" fillId="3" fontId="3" numFmtId="0" xfId="0" applyAlignment="1" applyFill="1" applyFont="1"><alignment horizontal="center" vertical="center"/></xf>' +
  '</cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  '</styleSheet>'

// ---- sheet ----

// inlineStr로 쓴다 — sharedStrings를 따로 만들지 않아도 되고(파트 1장 절약),
// 이 정도 규모(최대 2138행)에서는 파일 크기 차이가 문제되지 않는다.
function buildSheet(rows: Kanji[], cols: ExcelColumn[]): string {
  const colsXml =
    '<cols>' +
    cols
      .map((c, i) => `<col customWidth="1" min="${i + 1}" max="${i + 1}" width="${c.width}"/>`)
      .join('') +
    '</cols>'

  const header =
    '<row r="1">' +
    cols
      .map(
        (c, i) =>
          `<c r="${colName(i + 1)}1" s="${S_HEAD}" t="inlineStr"><is><t xml:space="preserve">${esc(c.header)}</t></is></c>`,
      )
      .join('') +
    '</row>'

  const body = rows
    .map((k, ri) => {
      const r = ri + 2
      const cells = cols
        .map((c, ci) => {
          const ref = `${colName(ci + 1)}${r}`
          const s = c.big ? S_BIG : S_BODY
          const v = c.value(k)
          if (v === null || v === undefined || v === '') return `<c r="${ref}" s="${s}"/>`
          if (typeof v === 'number') return `<c r="${ref}" s="${s}"><v>${v}</v></c>`
          return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`
        })
        .join('')
      return `<row r="${r}">${cells}</row>`
    })
    .join('')

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    // 1행 틀고정 — 2000행짜리 목록을 스크롤할 때 머리글이 계속 보이게
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    '<sheetFormatPr defaultColWidth="12.63" defaultRowHeight="15.75"/>' +
    colsXml +
    `<sheetData>${header}${body}</sheetData>` +
    '</worksheet>'
  )
}

// ---- zip (stored / 무압축) ----

// Blob에 그대로 넘길 수 있는 바이트 배열 — TextEncoder/new Uint8Array()가
// 만드는 건 항상 일반 ArrayBuffer라 이렇게 좁혀 준다(SharedArrayBuffer 아님)
type Bytes = Uint8Array<ArrayBuffer>

const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c >>> 0
  }
  return t
})()

function crc32(buf: Bytes): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

interface ZipEntry {
  name: string
  data: Bytes
}

function zipStored(entries: ZipEntry[]): Blob {
  const enc = new TextEncoder()
  const locals: Bytes[] = []
  const centrals: Bytes[] = []
  let offset = 0

  // 고정 타임스탬프 — 같은 조건이면 같은 파일이 나오도록
  const dosTime = 0
  const dosDate = ((2026 - 1980) << 9) | (1 << 5) | 1

  for (const e of entries) {
    const nameBuf = enc.encode(e.name)
    const crc = crc32(e.data)

    const lfh = new Uint8Array(30 + nameBuf.length)
    const lv = new DataView(lfh.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(6, 0x0800, true) // UTF-8 파일명
    lv.setUint16(8, 0, true) // stored
    lv.setUint16(10, dosTime, true)
    lv.setUint16(12, dosDate, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, e.data.length, true)
    lv.setUint32(22, e.data.length, true)
    lv.setUint16(26, nameBuf.length, true)
    lfh.set(nameBuf, 30)
    locals.push(lfh, e.data)

    const cdh = new Uint8Array(46 + nameBuf.length)
    const cv = new DataView(cdh.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0x0800, true)
    cv.setUint16(10, 0, true)
    cv.setUint16(12, dosTime, true)
    cv.setUint16(14, dosDate, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, e.data.length, true)
    cv.setUint32(24, e.data.length, true)
    cv.setUint16(28, nameBuf.length, true)
    cv.setUint32(42, offset, true)
    cdh.set(nameBuf, 46)
    centrals.push(cdh)

    offset += lfh.length + e.data.length
  }

  const centralSize = centrals.reduce((n, c) => n + c.length, 0)
  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, entries.length, true)
  ev.setUint16(10, entries.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)

  return new Blob([...locals, ...centrals, eocd], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

// ---- public API ----

export interface ExportOptions {
  levels: KanjiLevel[]
  columnIds: ColumnId[]
  // true면 급수를 한 시트에 합치고, false면 급수별 시트로 나눈다
  merged: boolean
}

export function kanjiForLevels(levels: KanjiLevel[]): Kanji[] {
  const order = new Map(ALL_LEVELS.map((l, i) => [l, i]))
  return kanjiList
    .filter((k) => levels.includes(k.level))
    .sort((a, b) => (order.get(a.level)! - order.get(b.level)!) || a.num - b.num)
}

export function buildKanjiWorkbook(opts: ExportOptions): Blob {
  const cols = EXCEL_COLUMNS.filter((c) => opts.columnIds.includes(c.id))
  if (cols.length === 0) throw new Error('열을 하나 이상 선택하세요')
  if (opts.levels.length === 0) throw new Error('급수를 하나 이상 선택하세요')

  const levels = ALL_LEVELS.filter((l) => opts.levels.includes(l))
  const sheets: { name: string; rows: Kanji[] }[] = opts.merged
    ? [{ name: '전체', rows: kanjiForLevels(levels) }]
    : levels.map((l) => ({ name: l, rows: kanjiForLevels([l]) }))

  const enc = new TextEncoder()
  const entries: ZipEntry[] = []

  entries.push({
    name: '[Content_Types].xml',
    data: enc.encode(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default ContentType="application/xml" Extension="xml"/>' +
        '<Default ContentType="application/vnd.openxmlformats-package.relationships+xml" Extension="rels"/>' +
        sheets
          .map(
            (_, i) =>
              `<Override ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml" PartName="/xl/worksheets/sheet${i + 1}.xml"/>`,
          )
          .join('') +
        '<Override ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml" PartName="/xl/styles.xml"/>' +
        '<Override ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml" PartName="/xl/workbook.xml"/>' +
        '</Types>',
    ),
  })

  entries.push({
    name: '_rels/.rels',
    data: enc.encode(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>',
    ),
  })

  entries.push({
    name: 'xl/workbook.xml',
    data: enc.encode(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
        sheets
          .map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 2}"/>`)
          .join('') +
        '</sheets></workbook>',
    ),
  })

  entries.push({
    name: 'xl/_rels/workbook.xml.rels',
    data: enc.encode(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        sheets
          .map(
            (_, i) =>
              `<Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
          )
          .join('') +
        '</Relationships>',
    ),
  })

  entries.push({ name: 'xl/styles.xml', data: enc.encode(STYLES_XML) })

  sheets.forEach((s, i) => {
    entries.push({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      data: enc.encode(buildSheet(s.rows, cols)),
    })
  })

  return zipStored(entries)
}

// 파일명: 선택한 급수를 그대로 드러낸다 (전체 5급수면 "전체")
export function buildFileName(levels: KanjiLevel[]): string {
  const picked = ALL_LEVELS.filter((l) => levels.includes(l))
  const scope = picked.length === ALL_LEVELS.length ? '전체' : picked.join('·')
  return `JLPT 한자 ${scope}.xlsx`
}
