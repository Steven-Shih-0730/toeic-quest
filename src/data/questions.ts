// 題庫（全部原創）。從 reference/demo-source.html 搬過來並轉成 CLAUDE.md 第 5 節的格式。
// 第 1 區：一般情境題 15 題、面試官題 4 題、命題教授陷阱題 6 題。

import type { Question } from '../types';

export const QUESTIONS: Question[] = [
  // ───────── 一般情境題 ─────────
  {
    id: 'z1-reimburse', word: 'reimburse', zh: '報銷、償還', zone: 1, tag: 'email',
    stem: 'Please submit your receipts by Friday so that the accounting team can ____ you for your travel expenses.',
    options: ['reimburse', 'reinforce', 'remind', 'replace'], answer: 0,
    hint: 're-（回來）＋ burse（錢包，和 purse 同源）：把錢放回你的錢包。',
    explanation: 'reimburse 是「報銷」。你先自掏腰包墊錢，公司之後把錢還給你。',
  },
  {
    id: 'z1-invoice', word: 'invoice', zh: '請款單、發票', zone: 1, tag: 'email',
    stem: "We have attached the ____ for last month's consulting services; payment is due within 30 days.",
    options: ['invitation', 'invoice', 'inventory', 'investment'], answer: 1,
    hint: '句子後半提到 payment is due：這是廠商寄來「請你付錢」的那張單子。',
    explanation: 'invoice 是「請款單」。賣方寄給買方，上面列出該付多少錢、何時要付。',
  },
  {
    id: 'z1-itinerary', word: 'itinerary', zh: '行程表', zone: 1, tag: 'email',
    stem: 'The travel agency will e-mail you a detailed ____ listing your flights and hotel reservations.',
    options: ['inventory', 'identity', 'incentive', 'itinerary'], answer: 3,
    hint: '字根 itiner- 是「旅程」。想像一張寫著幾點起飛、住哪間飯店的表。',
    explanation: 'itinerary 是「行程表」。出差前拿到的航班與住宿安排就是它。',
  },
  {
    id: 'z1-deadline', word: 'deadline', zh: '截止期限', zone: 1, tag: 'notice',
    stem: 'All employees must complete the online safety training before the ____ of March 31.',
    options: ['outline', 'headline', 'deadline', 'guideline'], answer: 2,
    hint: 'dead（死）＋ line（線）：過了這條線就來不及了。',
    explanation: 'deadline 是「截止期限」。後面接日期，表示最晚要在那天前完成。',
  },
  {
    id: 'z1-postpone', word: 'postpone', zh: '延期', zone: 1, tag: 'meeting',
    stem: "Due to the director's absence, the budget meeting has been ____ until next Tuesday.",
    options: ['postponed', 'proposed', 'promoted', 'possessed'], answer: 0,
    hint: 'post-（之後）＋ pone（放）：把事情往後放。注意句中的 until。',
    explanation: 'postpone 是「延期」。常見搭配 postpone … until＋新的時間。',
  },
  {
    id: 'z1-attendee', word: 'attendee', zh: '出席者', zone: 1, tag: 'notice',
    stem: 'Each ____ will receive a name badge and a conference program at the registration desk.',
    options: ['attendance', 'attendant', 'attendee', 'attention'], answer: 2,
    hint: '字尾 -ee 指「人」，像 employee、interviewee。領名牌的是誰？',
    explanation: 'attendee 是「出席者」。attendance 是出席這件事，attendant 是服務人員。',
  },
  {
    id: 'z1-budget', word: 'budget', zh: '預算', zone: 1, tag: 'meeting',
    stem: 'The marketing team was asked to reduce costs because the project had gone over ____.',
    options: ['budget', 'capacity', 'average', 'deadline'], answer: 0,
    hint: '線索在 reduce costs：錢花得比原本規劃的還多。',
    explanation: 'budget 是「預算」。go over budget 就是「超出預算」。',
  },
  {
    id: 'z1-candidate', word: 'candidate', zh: '應徵者、候選人', zone: 1, tag: 'email',
    stem: 'After reviewing over fifty résumés, the hiring committee selected three ____ for final interviews.',
    options: ['colleagues', 'consumers', 'candidates', 'contractors'], answer: 2,
    hint: '看履歷、進面試——還在被挑選、尚未錄取的人叫什麼？',
    explanation: 'candidate 是「應徵者」。錄取之後才會變成 colleague（同事）。',
  },
  {
    id: 'z1-negotiate', word: 'negotiate', zh: '協商、談判', zone: 1, tag: 'meeting',
    stem: 'Our purchasing manager will meet the supplier next week to ____ a lower price for bulk orders.',
    options: ['navigate', 'negotiate', 'nominate', 'notify'], answer: 1,
    hint: '雙方坐下來「談條件」，談到彼此都能接受的價格。',
    explanation: 'negotiate 是「協商」。negotiate a price / a contract 都是多益常見搭配。',
  },
  {
    id: 'z1-warranty', word: 'warranty', zh: '保固', zone: 1, tag: 'notice',
    stem: 'All laptops purchased this month come with a two-year ____ covering parts and repairs.',
    options: ['warranty', 'warning', 'warehouse', 'withdrawal'], answer: 0,
    hint: '買電子產品時，壞掉可以免費維修的那份保障。',
    explanation: 'warranty 是「保固」。two-year warranty 就是兩年保固。',
  },
  {
    id: 'z1-agenda', word: 'agenda', zh: '議程', zone: 1, tag: 'meeting',
    stem: 'Please review the attached ____ before the meeting so that we can cover every item on time.',
    options: ['agency', 'agreement', 'appendix', 'agenda'], answer: 3,
    hint: '開會前發的那張清單，寫著今天要討論哪幾個 item。',
    explanation: 'agenda 是「議程」。item on the agenda 就是議程上的討論事項。',
  },
  {
    id: 'z1-renovation', word: 'renovation', zh: '整修', zone: 1, tag: 'notice',
    stem: 'The third-floor cafeteria will be closed for ____ from Monday through Friday next week.',
    options: ['renovation', 'reservation', 'recreation', 'resignation'], answer: 0,
    hint: 're-（再）＋ nov（新，和 new 同源）：讓空間重新變新。',
    explanation: 'renovation 是「整修」。closed for renovation 是公告常見說法。',
  },
  {
    id: 'z1-shipment', word: 'shipment', zh: '出貨、貨件', zone: 1, tag: 'email',
    stem: 'We apologize for the delay; your ____ is expected to arrive at the warehouse by Thursday.',
    options: ['statement', 'shipment', 'settlement', 'supplement'], answer: 1,
    hint: 'ship 當動詞是「運送」。會「抵達倉庫」的是什麼？',
    explanation: 'shipment 是「貨件」。ship（運送）加上 -ment 變成名詞。',
  },
  {
    id: 'z1-approve', word: 'approve', zh: '核准', zone: 1, tag: 'meeting',
    stem: "The board of directors is expected to ____ the merger proposal at tomorrow's session.",
    options: ['approach', 'appoint', 'approve', 'appeal'], answer: 2,
    hint: '董事會對一份提案能做的事：點頭說「可以」。',
    explanation: 'approve 是「核准」。approve a proposal / a budget 是固定搭配。',
  },
  {
    id: 'z1-reminder', word: 'reminder', zh: '提醒', zone: 1, tag: 'notice',
    stem: 'This is a friendly ____ that parking permits must be renewed by the end of the month.',
    options: ['remainder', 'reminder', 'receipt', 'refund'], answer: 1,
    hint: 'remind（提醒）＋ -er。小心長得很像的 remainder 是「剩下的部分」。',
    explanation: 'reminder 是「提醒通知」。a friendly reminder 是公告常見的開頭。',
  },

  // ───────── 面試官情境題 ─────────
  {
    id: 'z1-apologize', word: 'apologize', zh: '道歉', zone: 1, tag: 'interviewer',
    ctx: '客戶來信：「我們訂的投影機送到時鏡頭已經裂了，這讓人無法接受。」你要回信，哪個字最適合？',
    stem: 'We sincerely ____ for the inconvenience and will send a replacement immediately.',
    options: ['apologize', 'appreciate', 'announce', 'approve'], answer: 0,
    hint: '客戶正在生氣。回信的第一步是感謝，還是說對不起？',
    explanation: 'apologize for＋事情，是客訴回信的標準開場；appreciate 是「感謝」。',
  },
  {
    id: 'z1-available', word: 'available', zh: '有空的', zone: 1, tag: 'interviewer',
    ctx: '主管傳訊息問你下週哪個時段可以開專案會議。你要回覆，哪個字最適合？',
    stem: 'I am ____ on Wednesday afternoon if that works for your schedule.',
    options: ['avoidable', 'valuable', 'available', 'variable'], answer: 2,
    hint: '想說「我那個時段有空」。字根 avail 是「可用」。',
    explanation: 'available 用在人身上是「有空」，用在東西上是「有貨、可取得」。',
  },
  {
    id: 'z1-extension', word: 'extension', zh: '延長、展期', zone: 1, tag: 'interviewer',
    ctx: '你來不及在週五前交出報告，要寫信請主管多給兩天。哪個字最適合？',
    stem: 'Would it be possible to request a two-day ____ on the report deadline?',
    options: ['expansion', 'extension', 'exception', 'expression'], answer: 1,
    hint: '你想把期限「拉長」：ex-（向外）＋ tend（伸展）。expansion 是規模變大。',
    explanation: 'extension 是「延期、展延」。request an extension 是請求寬限的禮貌說法。',
  },
  {
    id: 'z1-confirm', word: 'confirm', zh: '確認', zone: 1, tag: 'interviewer',
    ctx: '客戶來信預約下週一早上拜訪。你要回信告訴對方時間沒問題，哪個字最適合？',
    stem: 'I am writing to ____ your appointment at 10 a.m. next Monday.',
    options: ['conform', 'confine', 'consult', 'confirm'], answer: 3,
    hint: 'firm 是「穩固」。把一件已經約好的事變得更確定。',
    explanation: 'confirm 是「確認」。conform 是「遵守、符合」，只差一個字母別選錯。',
  },

  // ───────── 命題教授陷阱題 ─────────
  {
    id: 'z1-affect', word: 'affect', zh: '影響（動詞）', zone: 1, tag: 'professor',
    stem: 'The new overtime policy will not ____ employees who work part-time.',
    options: ['effect', 'affect', 'effort', 'afford'], answer: 1,
    hint: '這格在 will not 後面，需要動詞。口訣：A 開頭是 Action（動作）。',
    explanation: 'affect 是動詞「影響」；effect 通常是名詞「效果」，例如 have an effect on。',
  },
  {
    id: 'z1-lend', word: 'lend', zh: '借出', zone: 1, tag: 'professor',
    stem: 'Could you ____ me your laptop charger until the afternoon meeting ends?',
    options: ['rent', 'owe', 'borrow', 'lend'], answer: 3,
    hint: '東西是從「你」流向「我」。借出去和借進來是不同的字。',
    explanation: 'lend 是「借出」（lend me＋東西）；borrow 是「借入」（borrow＋東西＋from you）。',
  },
  {
    id: 'z1-compliment', word: 'compliment', zh: '稱讚', zone: 1, tag: 'professor',
    stem: 'The client paid our design team a ____ on the clarity of the presentation slides.',
    options: ['complement', 'compliment', 'compartment', 'commitment'], answer: 1,
    hint: '兩個字只差一個母音。有 i 的那個：I like it！（我稱讚你）',
    explanation: 'compliment 是「稱讚」，pay someone a compliment；complement 是「補足、相輔相成」。',
  },
  {
    id: 'z1-raise', word: 'raise', zh: '調高（及物）', zone: 1, tag: 'professor',
    stem: 'The landlord has decided to ____ the office rent by five percent starting in January.',
    options: ['raise', 'rise', 'arise', 'arouse'], answer: 0,
    hint: '空格後面有受詞 the office rent。哪一個字後面「需要」接東西？',
    explanation: 'raise 是及物動詞（raise＋東西）；rise 是自己上升，例如 Prices rise。',
  },
  {
    id: 'z1-principal', word: 'principal', zh: '主要的', zone: 1, tag: 'professor',
    stem: 'Cost reduction was the ____ reason for moving the factory overseas.',
    options: ['principle', 'practical', 'principal', 'particular'], answer: 2,
    hint: '這格修飾 reason，需要形容詞「主要的」。另一個長得像的字只能當名詞。',
    explanation: 'principal 是「主要的」；principle 是名詞「原則」。the principal reason 是主要原因。',
  },
  {
    id: 'z1-personnel', word: 'personnel', zh: '人事、全體員工', zone: 1, tag: 'professor',
    stem: 'Please contact the ____ department if you have questions about your employment contract.',
    options: ['personal', 'personable', 'personnel', 'personality'], answer: 2,
    hint: '跟僱用合約有關的部門。兩個 n、重音在最後的那個字，指的是「一群員工」。',
    explanation: 'personnel 是「人事、員工」；personal 是「個人的」。personnel department 就是人事部。',
  },
];

export function findByWord(word: string): Question | undefined {
  return QUESTIONS.find((q) => q.word === word);
}
