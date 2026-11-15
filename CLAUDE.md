# 多益打怪 TOEIC Quest：專案說明

> 給 Claude Code 讀的專案規格。每次開工前請先讀完這份文件，並以它為準；規格要改時，先更新這份文件再改程式。

## 1. 專案概述

TOEIC Quest 是給「準備多益的大學生」用的手機網頁 App。它用 AI 出的情境題、間隔重複和遊戲化，解決「單字背了又忘、練習很無聊、撐不久」的問題。

- 一句話定位：把你答錯的題目、快忘的單字，變成每天 5 分鐘的闖關遊戲，並在你快忘記的時候自動出現。
- 目標使用者：大三的小陳，畢業或求職需要 650 分，目前約 500 分，只有零碎時間。
- 出處：2026/11/15「AI 時代青年實戰工作坊」提案。

## 2. 目前進度

- [x] 提案與說明文件
- [x] 可點擊的 demo（`reference/demo.html` 為打包檔；可讀原始碼在 `reference/demo-source.html`，只當作畫面與互動的參考）
- [x] 階段 0：規格確認（demo 與規格的差異已整理進本文件）
- [x] 階段 1：專案骨架與首頁
- [x] 階段 2：題庫、間隔重複邏輯與單元測試
- [x] 階段 3：今日關卡、提示機制、結算頁
- [x] 階段 4：Boss 關與對戰（機器人對手）
- [x] 階段 5：真人連線對戰（Supabase Realtime）
- [x] 階段 6：部署到 Vercel
- [x] 階段 7：PWA（可安裝到主畫面、離線遊玩單人模式）
- [x] 階段 8：地圖與每日分開、Boss 隨時挑戰、題庫 100 題（5 區開放）、對戰隨機性、對戰排行榜

完成一個階段就把對應項目打勾。

部署資訊：

- 正式網址：https://toeic-quest-swart.vercel.app（Vercel 專案 `toeic-quest`）
- GitHub：https://github.com/Steven-Shih-0730/toeic-quest（已連上 Vercel：push 到 `master` 自動部署正式版，其他分支產生預覽版）
- Supabase 專案：`toeic-quest`（東京，只用 Realtime，沒有資料表）
- `VITE_SHOW_DEMO_PANEL=true`（正式版與預覽版都顯示齒輪，方便工作坊展示「模擬隔天」；要隱藏時在 Vercel 改成 `false`，再 push 一次或在 Vercel 後台按 Redeploy 才會生效）
- 其他 Vercel 設定：GitHub 部署紀錄（`createDeployments`）已開啟，README 的部署狀態徽章靠它顯示
- 部署保護：正式網址公開，預覽版需登入 Vercel

## 3. 技術棧

| 項目 | 選擇 | 理由 |
| --- | --- | --- |
| 前端 | Vite + React + TypeScript | 元件化，方便拆畫面 |
| 樣式 | CSS Modules（已定案，不換） | 可直接沿用 demo 的樣式與動畫 |
| 狀態保存 | localStorage（包在 try/catch 裡） | 第一版不做登入 |
| 即時連線 | Supabase Realtime（Broadcast + Presence） | 不用自己架伺服器，第一版不需要建資料表 |
| 測試 | Vitest | 間隔重複與計分邏輯一定要有測試 |
| 部署 | Vercel | |
| PWA | vite-plugin-pwa（Workbox） | 自動產生 manifest 與 service worker |

環境變數（放在 `.env.local`，不要 commit；`.gitignore` 已排除 `node_modules`、`dist`、`.env.local`）：

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## 4. 目錄結構

```
reference/demo.html        # artifact 做好的 demo（打包檔），不直接修改
reference/demo-source.html # demo 解開後的原始碼，開發時以這份為參考
public/icons/              # PWA 圖示 PNG（深藍底、金色圓、⚔️，用 Chrome 算圖產生）
docs/                      # 安裝用 QR code（Android、iOS 各一張）
當日報告/                  # 工作坊當日的簡報（toeic-quest-slides.html）
README.md                  # 專案介紹、本機啟動、部署
PROMPTS.md                 # 分階段開發用的提示詞
src/
  types.ts                 # 共用型別（Question、WordProgress、Player 等）
  data/questions.ts        # 題庫
  data/seed.ts             # demo 用初始假資料
  data/zones.ts            # 5 區名稱與獎章
  data/leaderboard.ts      # 對戰排行榜的捏造玩家
  lib/clock.ts             # today() 與「模擬隔天」的日期偏移
  lib/srs.ts               # 間隔重複邏輯
  lib/scoring.ts           # 經驗值、Combo、連續天數、對戰計分
  lib/stages.ts            # 關卡編號、推進、區域開放
  lib/quest.ts             # 今日關卡與地圖關卡的出題、作答流程
  lib/rating.ts            # 對戰積分與排行榜
  lib/boss.ts              # Boss 關抽題與血量／生命
  lib/storage.ts           # localStorage 讀寫
  lib/random.ts            # 洗牌與隨機抽樣（可注入亂數，方便測試）
  lib/install.ts           # PWA 安裝引導：判斷平台、standalone、「之後再說」
  lib/battle/              # 對戰：types.ts（Opponent 介面）、engine.ts（房主規則）、host.ts（房主控場與計時）、
                           #   bot.ts（機器人）、realtime.ts（房間與連線對手）、supabaseClient.ts（Supabase 連線）
  screens/                 # Home, Quest, Result, Boss, BossResult, BattleLobby, RoomView, Battle, BattleResult
  components/              # 共用元件：TopBar, DemoPanel, AdventureMap, ForgetList, Leaderboard, InstallGuide,
                           #   ProgressBar, ComboBanner, CoachHint, OptionButton, Stem, TimerRing
tests/                     # Vitest（13 個檔案）
```

## 5. 資料模型

```ts
type Tag = 'email' | 'notice' | 'meeting' | 'interviewer' | 'professor';

interface Question {
  id: string;
  word: string;          // 目標單字，例如 "reimburse"
  zh: string;            // 中文字義，例如 "報銷、償還"（快忘清單、結算頁顯示用）
  zone: number;          // 1~5，對應冒險地圖區域（每區 20 題）
  tag: Tag;
  stem: string;          // 英文題目句，空格一律以 ____ 表示，畫面上顯示成底線
  options: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
  hint: string;          // 費曼教練提示（第一次答錯時顯示，不能直接洩漏答案）
  explanation: string;   // 白話解說（中文 1~2 句）
  ctx?: string;          // 面試官情境文字（只有 interviewer 題有），顯示在 💼 情境框
}

interface WordProgress {
  word: string;
  wrongCount: number;
  correctStreak: number; // 連續答對次數，答錯歸零
  nextReview: string;    // ISO 日期 YYYY-MM-DD
  mastered: boolean;
  lastWrongAt?: string;
}

interface Player {
  id: string;            // 隨機產生的匿名 id
  name: string;          // 預設「小陳」，第一次進對戰大廳時設定
  nameConfirmed?: boolean; // 是否已在對戰大廳確認過暱稱
  level: number;
  xp: number;            // 目前等級內的經驗值，0~299
  streakDays: number;
  lastActiveDate: string; // 最後一次完成今日關卡的日期
  clearedStages: number[]; // 已完成的關卡編號 1~50，第 N 區第 M 關 = (N-1)*10 + M
  badges: string[];      // 已取得的獎章，例如 "報銷與財務達人"
  rating?: number;       // 對戰積分（6.7），沒有時視為初始值 420
}
```

衍生資料（不另外存，由上面的資料即時算出）：

- 快忘清單 ＝ `wrongCount > 0` 且 `mastered = false` 的 WordProgress。
- 已記住字數 ＝ `mastered = true` 的 WordProgress 數量。
- 已開放的區域 ＝ 第 1 區，以及「前一區 Boss 已通關」的區域。

題庫：100 題，5 區各 20 題（一般情境題 11、`interviewer` 3、`professor` 6），每區內容對應區域主題。目標單字全題庫不重複。

區域名稱：第 1 區 報銷與財務、第 2 區 會議與行程、第 3 區 人事與招募、第 4 區 客戶與行銷、第 5 區 出差與旅遊。

情境標籤顯示：`email` ✉️ Email、`notice` 📢 公告、`meeting` 🗓️ 會議、`interviewer` 💼 面試官挑戰、`professor` 🎓 命題教授陷阱。

## 6. 核心規則

### 6.1 間隔重複（`lib/srs.ts`）

這是提案的核心，不可簡化。

| 事件 | 結果 |
| --- | --- |
| 答錯 | `wrongCount + 1`，`correctStreak = 0`，`nextReview = 今天 + 1 天`，`lastWrongAt = 今天`（進入快忘清單） |
| 答對，且 `correctStreak` 變成 1 | `nextReview = 今天 + 3 天` |
| 答對，且 `correctStreak` 變成 2 | `nextReview = 今天 + 7 天` |
| 答對，且 `correctStreak` 變成 3 | `mastered = true`，移出快忘清單 |

- 第一次就答對的新字也要建立 WordProgress（`correctStreak = 1`，3 天後到期），但因為 `wrongCount = 0`，不會出現在快忘清單。
- 今日關卡、地圖關卡、Boss 關、對戰的作答都會更新 WordProgress。只有「提示後才答對」算答錯。
- 「今天到期」＝ `nextReview <= 今天` 且 `mastered = false`。
- 日期一律透過 `lib/clock.ts` 的 `today()` 取得，方便測試與「模擬隔天」。`today()` ＝ 真實日期 ＋ 模擬偏移天數（偏移存在 localStorage）。

### 6.2 今日關卡（每日複習）與地圖關卡

今日關卡和冒險地圖分開：今日關卡負責每天複習與連續天數，地圖關卡負責推進進度，一天可以打很多關。

共同的出題規則（固定 5 題）：

- 第 4 題固定是 `interviewer` 情境題，且不能和到期題重複。
- 其餘從題目範圍內的一般情境題（email／notice／meeting）補，優先順序：
  1. 新題（還沒有 WordProgress）
  2. 還沒記住、也還沒到期的字，下次複習日最近的優先（答對照常更新進度，等於提早複習）
  3. 已記住的字
- 作答紀錄寫入時機：一次答對時記為答對；第一次答錯時立刻記為答錯（之後不論第二次對錯都不再改）。

今日關卡：

- 先放到期的複習字，最多 2 題（任何區域的字都算），標示「🔁 N 天前答錯」，N 由 `lastWrongAt` 算出，N = 1 時顯示「🔁 昨天答錯」；從沒答錯過的到期字顯示「🔁 複習時間到」。
- 題目範圍：所有已開放的區域。
- 完成時更新連續天數（6.4），不推進地圖。同一天可以重玩。
- 首頁按鈕副標題：今天已完成時顯示「今天已完成，可再練一次」；有到期字時顯示「N 個快忘字到期」；否則顯示「5 題・約 3 分鐘」。

地圖關卡：

- 每區第 1～9 關。點地圖上的節點進入，題目範圍是該區，不放到期題。
- 依序解鎖：下一個未完成的關卡可以玩；已完成的關卡可以重玩（不再推進）。
- 5 題作答完畢就算通過，該關加入 `clearedStages`；不影響連續天數。
- 提示機制、經驗值與 Combo 與今日關卡相同。

### 6.3 蘇格拉底式提示（今日關卡與地圖關卡）

- 第一次答錯：不公布答案，費曼教練顯示 `hint`，讓玩家再選一次，並顯示「📌 已加入快忘清單，明天再考你」。
- 第二次答錯：公布正解與 `explanation`，並記為答錯。
- 第一次答錯、第二次答對：記為答錯（仍要進快忘清單），但給一半經驗值。

### 6.4 經驗值與 Combo（`lib/scoring.ts`）

- 一次答對 +10 XP；提示後答對 +5 XP。
- 連續答對 2 題以上（只算一次就答對的）：Combo 加成 ×1.25，並顯示橫幅「連續答對 N 題！經驗值 × 1.25」。
- 每 300 XP 升一級，多出來的經驗值帶到下一級。
- 所有 XP 與對戰分數的小數一律用 `Math.round`（例如 10 × 1.25 = 12.5 → 13）。
- 連續天數：
  - 完成今日關卡時，若 `lastActiveDate` 不是今天，`streakDays + 1`，並把 `lastActiveDate` 設為今天（同一天只加一次）。
  - 若 `lastActiveDate` 早於昨天，`streakDays` 歸零（在載入與「模擬隔天」時檢查）。
- 其他獎勵：對戰勝 +30、平手 +20、落敗 +10 XP；Boss 首次通關 +50 XP。

### 6.5 Boss 關

- 每區第 10 關。**已開放區域的 Boss 隨時都可以挑戰**，不需要先完成第 1～9 關。
- 從該區 6 題 `professor` 陷阱題（易混淆字）中隨機抽 5 題。
- 命題教授 3 格血，玩家 3 條命：答對一題扣教授一格血，答錯一題扣自己一條命。先答對 3 題就獲勝，先答錯 3 題就失敗，當下立即結束。
- Boss 關沒有提示，第一次答錯就算錯，直接公布正解與 `explanation`。Boss 關不給每題 XP。
- 答錯的字照 6.1 寫進快忘清單。
- 獲勝：該區第 10 關加入 `clearedStages`，取得該區獎章（例如第 1 區「報銷與財務達人」）。首次通關才有 +50 XP，再次通關只顯示「徽章已收藏」。
- 打倒後該區通關、解鎖下一區；結果頁顯示「第 N+1 區已解鎖！」（第 5 區除外）。

### 6.6 對戰計分（機器人與真人共用）

- 5 題，每題 10 秒。
- 答對得分 = `Math.round(ceil(剩餘秒數) × 10 × Combo 加成)`；答錯或超時 0 分。Combo 加成同 6.4（連續答對 2 題以上 ×1.25）。
- 題目優先從雙方的快忘清單抽，並標示「出自你的快忘清單」或「出自○○的快忘清單」；每場都要有隨機性：
  - 用整份快忘清單，不限今天到期。到期的字優先，但同一組內隨機挑選。
  - 我的字最多 3 題、對手的字補到 5 題，兩邊不夠時從整個題庫隨機補，標示「🎲 隨機題」。
  - 5 題選好後打亂出題順序。
  - 機器人阿明（Lv.4）的快忘清單：每場從題庫隨機抽 8 個字。
  - 機器人每題在 2～6 秒內隨機作答，答對率 70%。
  - 選項順序不打亂（連線時雙方必須看到相同順序；第一版不改訊息格式）。
- 雙方都作答或時間到後，公布答案 2 秒再進下一題。
- 對戰中答錯或超時的字，也要照 6.1 寫進自己的快忘清單。
- 畫面下方顯示計分說明：「得分＝剩餘秒數 × 10，連續答對再 × 1.25」。

### 6.7 對戰排行榜（`lib/rating.ts`）

- 對戰積分：勝 +30、平手 +10、落敗 −10，最低 0；初始 420。打機器人與真人都算（含斷線改打機器人）。
- 對戰大廳顯示「🏆 對戰排行榜」單一總榜前 10 名：捏造的 15 位玩家（`data/leaderboard.ts`，固定積分）加上自己，依積分排序。
- 自己在前 10 名時以金框標示；不在前 10 名時，榜單下方另外顯示「你：第 N 名・積分 X」。
- 對戰結果頁顯示積分變化，例如「對戰積分 420 → 450（+30）」。
- 排行榜是假資料，不做雲端同步。

## 7. 畫面清單

所有畫面共用頂部列：非首頁時左邊有「← 首頁」，中間是該頁標題，右邊是 ⚙️。

| 畫面 | 標題 | 重點 |
| --- | --- | --- |
| Home | 多益打怪 TOEIC Quest | 名字、日期、等級、經驗值條（xp / 300）、連續天數、已記住字數、冒險地圖、今日關卡（含副標題）與雙人對戰按鈕、快忘清單（依到期日排序，標示今天／明天／N 天後；清單空時顯示「🎉 清單清空了！」） |
| Quest | 今日關卡／第 N 區 第 M 關 | 題號與進度條、本關累計 XP、等級條、情境標籤、🔁 標示、面試官 💼 情境框、4 選項（A～D）、費曼教練提示、Combo 橫幅、「已加入快忘清單」提示、下一題／看結算按鈕 |
| Result | 關卡結算 | 答對數（含提示後答對）、獲得 XP、連續天數（今日關卡，+1 時有彈跳動畫）或「第 N 區 第 M 關 通過」（地圖關卡，附「下一關」按鈕）、等級條、複仇成功、新加入快忘清單、寢室排行榜（假資料）、「返回首頁」與「👥 去對戰」按鈕 |
| Boss | Boss 關：命題教授 | 教授頭像與 3 格血條、玩家 3 條命、教授台詞、陷阱題 |
| BossResult | Boss 關結果 | 勝：🏅 通關畫面、獎章名稱、首次通關獎勵文字、下一區解鎖提示；敗：教授剩餘血量、「答錯的字已加入快忘清單」；都有「返回首頁」與「再戰教授」按鈕 |
| BattleLobby | 雙人對戰 | 第一次進入時跳出暱稱輸入框；「快速配對（機器人）」（配對中… 2 秒 → 找到對手：阿明 Lv.4 → 2 秒後開始）、「取消配對」；「建立房間」、「輸入房號加入」；對戰排行榜前 10 名（6.7） |
| Battle | 雙人對戰 | 雙方頭像與狀態（作答中／思考中／已作答 ✓／答對 +N）、10 秒計時圈、左右直立分數條、題目來源標籤、選項對錯顏色、Combo 橫幅、計分說明文字 |
| BattleResult | 對戰結果 | 勝負（🏆 你贏了／🤝 平手／😵 惜敗）、雙方分數、獲得 XP、對戰積分變化、本場出現的你的快忘字（✓ 這次答對／✗ 還要再練）、「返回首頁」與「再戰一場」按鈕 |

冒險地圖：

- 每個已開放的區域一張卡片，標示「進行中 N / 10」或「👑 已通關」。
- 第 1～9 關節點有三種狀態：
  - 已完成：綠底 ✓，可以點進去重玩
  - 下一關：黃色閃爍、標示「下一關」，可以點進去
  - 上鎖：🔒（要先完成前一關）
- Boss（第 10 關）要醒目：節點比一般關卡大、紫底金框並持續發光，標示「Boss」；卡片下方另有一顆全寬的「🎓 挑戰命題教授」按鈕。隨時可以點。通關後節點變 👑、按鈕改為「👑 再戰命題教授」。
- 未開放的區域顯示 🔒、區名與「打倒第 N 區 Boss 解鎖」。

展示用控制面板（右上角齒輪）：

- 顯示目前 Demo 日期。
- 按鈕：「⏭ 模擬隔天」、「🔄 重設 demo」、「🔓 解鎖下一區」（把目前最前面的區域設為 Boss 已通關；5 區都開放時停用）、「關閉」。
- 「模擬隔天」後在首頁顯示 toast：新日期、今天到期的字，以及連續天數是否歸零。
- 「重設 demo」後顯示 toast 說明已還原初始資料。
- 正式版用環境變數 `VITE_SHOW_DEMO_PANEL` 隱藏。

動畫：答對變綠＋彈跳、答錯變紅＋抖動、Combo 橫幅從左滑入、下一關節點閃爍、Boss 節點發光、卡片淡入上升；需尊重 `prefers-reduced-motion`。

PWA（階段 7）：

- 可以「加到主畫面」，打開時全螢幕顯示（`display: standalone`）、直式（`orientation: portrait`）。
- manifest：名稱「多益打怪 TOEIC Quest」、短名稱「多益打怪」、語言 `zh-Hant`、主題色與背景色 `#0f1b3d`。
- 圖示：深藍底、金色圓、⚔️。尺寸 192、512、512 maskable（重點在中間 80% 安全區）、iPhone 用 180（apple-touch-icon）。
- 離線：
  - 第一次載入後，程式、樣式、圖示都快取起來，沒有網路也能打開並玩今日關卡、Boss 關、機器人對戰。
  - Google Fonts 用 cache-first 快取，沒網路時沒快取到就退回系統字型。
  - 連線對戰需要網路，Supabase 的連線不經過 service worker。
- 更新：新版部署後自動更新（`registerType: 'autoUpdate'`），下次打開就是新版，不跳詢問。
- 開發模式（`npm run dev`）不啟用 service worker，避免快取干擾開發。
- 安裝引導（首頁最上方的卡片）：
  - 已經從主畫面打開（standalone）時不顯示。
  - Android：攔截 `beforeinstallprompt`，顯示「📲 安裝到主畫面」按鈕，按下直接跳出系統安裝視窗；瀏覽器不支援時改顯示「⋮ → 安裝應用程式」步驟。
  - iPhone／iPad：Apple 不允許網頁觸發安裝，顯示「分享 → 加入主畫面 → 新增」步驟。
  - 網址帶 `?install=android` 或 `?install=ios` 時一定顯示，並以參數決定顯示哪個平台；沒有參數時依裝置判斷，只在手機上顯示。
  - 「之後再說」會記在 localStorage，不再自動顯示（網址帶參數時仍會顯示）。
- 安裝用 QR code：`docs/qrcode-android.png`、`docs/qrcode-ios.png`，分別指向正式網址加上 `?install=android`、`?install=ios`。

初始假資料（`seed.ts`，日期以重設當下的 `today()` 為基準）：小陳 Lv.3、本級 240 XP、連續 6 天、對戰積分 420、`lastActiveDate` = 昨天、`clearedStages` = [1..6]；快忘清單 reimburse、invoice（今天到期）、itinerary（明天到期）、deadline（3 天後到期）。初始沒有已記住的字（已記住 0 字）。

## 8. 真人連線對戰設計（Supabase Realtime）

第一版只用 Broadcast 和 Presence，不建資料表、不做登入。

### 8.0 Opponent 介面（機器人與真人共用同一個 Battle 畫面）

Battle 畫面只依賴 `lib/battle/types.ts` 的 `Opponent` 介面：收事件、顯示、回報自己的作答，不自己出題或算分。

```ts
interface PlayerInfo { id: string; name: string; level: number; avatar: string }

type BattleEvent =                       // 與 8.2 的訊息一一對應
  | { type: 'start'; questionIds: string[]; sourceOf: Record<string, string> }
  | { type: 'question'; index: number; startAt: number }
  | { type: 'opponentAnswered'; index: number }
  | { type: 'reveal'; index: number; scores: Record<string, number> }
  | { type: 'end'; scores: Record<string, number> }
  | { type: 'opponentLeft' };

interface Opponent {
  readonly profile: PlayerInfo;
  start(me: PlayerInfo & { dueWords: string[] }): void;
  answer(index: number, choice: number, remainingMs: number): void;
  subscribe(listener: (e: BattleEvent) => void): () => void;
  dispose(): void;
}
```

- `lib/battle/engine.ts`：房主規則（選題、計分、Combo），純函式、不碰計時器。
- `lib/battle/bot.ts`：`BotOpponent` 在本機當房主；可從「第 N 題、目前分數」接手（斷線改打機器人用）。
- `lib/battle/realtime.ts`（階段 5）：`RealtimeOpponent`，房主跑 engine，加入者只轉送房主訊息。

### 8.1 流程

1. 房主按「建立房間」，產生 4 位數房號，加入 channel `battle:<房號>`。
2. 對手輸入房號加入；用 Presence 確認人數，第 3 個人進來時顯示「房間已滿」並離開。
3. 兩人都按「準備」後，各自用 `ready` 送出自己的快忘清單（到期單字）。
4. 房主負責出題與控場（authoritative host）：選出 5 題後送 `start`。
5. 每題由房主送 `question`（含開始時間），雙方作答後送 `answer`。
6. 雙方都作答或時間到，房主送 `reveal`，2 秒後送下一題；5 題後送 `end`。
7. 對手斷線（Presence leave）：顯示「對手已離線」，並提供「改跟機器人打完」。改打機器人時沿用目前題號與雙方分數；當題對手若未作答以 0 分計，機器人從下一題開始接手對手的位置。

### 8.2 訊息格式

```ts
type BattleMsg =
  | { type: 'ready';    playerId: string; name: string; level: number; dueWords: string[] }
  | { type: 'start';    questionIds: string[]; sourceOf: Record<string, string> } // questionId → 出自誰的快忘清單
  | { type: 'question'; index: number; startAt: number }                       // startAt：房主的 Date.now()
  | { type: 'answer';   playerId: string; index: number; choice: number; remainingMs: number }
  | { type: 'reveal';   index: number; scores: Record<string, number> }
  | { type: 'end';      scores: Record<string, number> };
```

- 實作備註：
  - 所有訊息走同一個 Broadcast 事件 `msg`；Presence 的 key 與連線用的 playerId 是 `player.id` 加隨機尾碼（同一個瀏覽器開兩個分頁也能測）。
  - 房間成員依加入時間排序，前 2 位入座，第 3 位以後顯示「房間已滿」並離開。
  - 房主送出 `start` 後等 1.5 秒才送第 1 題，讓對方畫面先準備好；對戰畫面建立前收到的訊息會先暫存。
  - 環境變數 `VITE_SUPABASE_ANON_KEY` 可以填新版 publishable key（`sb_publishable_…`）。
- 剩餘時間由作答者自己計算並回報（第一版可接受時鐘誤差）。
- 分數以房主計算的 `reveal.scores` 為準，雙方畫面都顯示這個值。
- 對戰中答錯的字，也要寫進各自的快忘清單。

## 9. 開發規範

- 介面文字一律繁體中文，題目為英文。
- 題目一律原創，不得使用 ETS 官方題目或市售題本內容。
- 手機直式優先（寬 390px 為基準），桌機置中顯示。
- `lib/` 裡的邏輯不得依賴 React，必須有 Vitest 測試。
- 每完成一個階段：執行 `npm run test` 與 `npm run build` 都要通過，更新第 2 節進度，再 commit。
- 不確定規格時先問，不要自行假設；規格衝突時以本文件為準。

## 10. 這一版不做的事

- 帳號登入與雲端同步進度
- 真正的 AI 即時出題（題庫先寫死）
- 長期運行的考量：這一版定位為 demo，不處理題庫長期耗盡、存檔版本遷移等問題
- 好友系統、真實排行榜（排行榜先用假資料，不放進資料模型）
- 付費機制
- 推播通知（例如「你的快忘字到期了」）
