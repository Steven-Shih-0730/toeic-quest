# 多益打怪 TOEIC Quest

把你答錯的題目、快忘的單字，變成每天 5 分鐘的闖關遊戲，並在你快忘記的時候自動出現。

**線上試玩：https://toeic-quest-swart.vercel.app**（用手機打開效果最好）

給準備多益的大學生用的手機網頁 App：用情境題、間隔重複和遊戲化，解決「單字背了又忘、練習很無聊、撐不久」的問題。出自 2026/11/15「AI 時代青年實戰工作坊」提案。

## 功能

- **今日關卡**：每天 5 題，到期的複習字優先（標示「🔁 N 天前答錯」），第 4 題固定是實務面試官情境題。
- **間隔重複**：答錯隔天再考；連續答對 1、2、3 次後分別 3 天、7 天後複習，第 3 次算「已記住」。
- **費曼教練提示**：第一次答錯不公布答案，先給線索再選一次。
- **經驗值、Combo、連續天數**：連續答對 ×1.25，每 300 XP 升一級。
- **Boss 關**：命題教授出 5 題易混淆字陷阱題，先答對 3 題獲勝。
- **雙人對戰**：互考彼此的快忘字，答得越快分數越高。
  - 快速配對：跟機器人「阿明」打。
  - 建立房間／輸入房號：和朋友用手機連線對戰（Supabase Realtime）。對手斷線時可以改跟機器人打完。
- **展示用控制面板**（右上角 ⚙️）：模擬隔天、重設 demo、解鎖本區 Boss。
- **PWA**：可以加到手機主畫面，打開時全螢幕。載入過一次後，沒有網路也能玩今日關卡、Boss 關和機器人對戰（連線對戰需要網路）。新版部署後會自動更新。

### 加到主畫面

- **iPhone（Safari）**：打開網址 → 下方「分享」按鈕 →「加入主畫面」。
- **Android（Chrome）**：打開網址 → 右上角選單 →「安裝應用程式」或「加到主畫面」。

或掃描 `docs/` 裡的 QR code（Android、iOS 各一張，可直接印出或投影）。掃描後首頁最上方會出現安裝卡片：Android 有一鍵安裝按鈕，iPhone 會列出「分享 → 加入主畫面」的步驟。iPhone 因為 Apple 的限制，網頁無法自動跳出安裝視窗，只能顯示步驟。

題目全部原創，不使用 ETS 官方或市售題本內容。

## 技術

Vite + React + TypeScript、CSS Modules、Vitest、Supabase Realtime（只用 Broadcast 與 Presence，不建資料表、不需登入）、vite-plugin-pwa、Vercel。進度存在瀏覽器的 localStorage。

開發模式（`npm run dev`）不啟用 service worker。要在本機測試 PWA 與離線，請用 `npm run build` 再 `npm run preview`。

## 本機啟動

需要 Node.js 20 以上。

```bash
npm install
cp .env.example .env.local   # 填入 Supabase 設定（不填也能玩單人與機器人對戰）
npm run dev
```

打開終端機顯示的網址（通常是 http://localhost:5173 ）。手機與電腦在同一個 Wi-Fi 時，用 `Network:` 那一行的網址就能在手機上打開；如果打不開，請允許 Windows 防火牆讓 Node.js 使用私人網路。

其他指令：

| 指令 | 用途 |
| --- | --- |
| `npm run build` | 型別檢查並建置到 `dist/` |
| `npm run preview` | 在本機預覽建置結果 |
| `npm run test` | 執行所有單元測試 |
| `npm run test:watch` | 修改時自動重跑測試 |

## 測試

```bash
npm run test
```

測試放在 `tests/`，涵蓋：

- 間隔重複規則、到期判斷與「模擬隔天」
- 經驗值、Combo、升級、連續天數、對戰計分
- 今日關卡出題與提示流程、Boss 關
- localStorage 無法使用時不會壞掉
- 機器人對手（用假計時器）
- 連線對戰（用記憶體內的假 channel 模擬雙人、房間已滿、斷線）
- 架構規範：`src/lib/` 不得 import React；對戰畫面不得寫死機器人

## 連線對戰設定

1. 到 [supabase.com](https://supabase.com) 建立一個免費專案。不需要建資料表。
2. 在 Project Settings → API 複製 Project URL 與 publishable key（或舊版 anon key）。
3. 填進 `.env.local` 的 `VITE_SUPABASE_URL` 與 `VITE_SUPABASE_ANON_KEY`，重新執行 `npm run dev`。
4. 測試方式：
   - 開兩個瀏覽器分頁（其中一個用無痕視窗，才不會共用存檔）。
   - A 按「建立房間」，B 輸入同一個 4 位數房號。
   - 兩人都按「準備」就開始。
   - 第三個人加入同一個房號會看到「房間已滿」；關掉其中一邊，另一邊會看到「對手已離線」。

## 部署到 Vercel

1. 在 Vercel 匯入這個專案。Framework 選 Vite；Build Command 用 `npm run build`，Output Directory 用 `dist`。
2. 在 Project Settings → Environment Variables 設定：

   | 變數 | 值 |
   | --- | --- |
   | `VITE_SUPABASE_URL` | Supabase Project URL |
   | `VITE_SUPABASE_ANON_KEY` | Supabase publishable key 或 anon key |
   | `VITE_SHOW_DEMO_PANEL` | `true` 顯示展示用控制面板（目前線上版的設定，方便展示「模擬隔天」）；`false` 隱藏 |

3. `VITE_` 開頭的變數會在建置時寫進前端程式，改了之後要重新部署才會生效。這兩個 Supabase 金鑰本來就是公開給瀏覽器用的，可以放在前端。

## 專案結構

```
reference/          demo（artifact）與解開後的原始碼，只當參考
src/
  data/             題庫、初始假資料、區域
  lib/              不依賴 React 的邏輯（間隔重複、計分、出題、Boss、存檔、日期）
  lib/battle/       對戰：Opponent 介面、房主規則、機器人、Supabase 連線
  screens/          各畫面
  components/       共用元件
tests/              Vitest 單元測試
CLAUDE.md           完整規格（給 Claude Code 讀）
PROMPTS.md          分階段開發用的提示詞
```

## 這一版不做的事

帳號登入與雲端同步、AI 即時出題、好友系統與真實排行榜、付費機制、第 2～5 區題庫。
