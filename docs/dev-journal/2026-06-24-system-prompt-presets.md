# 2026-06-24 — system prompt 多組管理

接續 [system-prompt-and-reasoning-fix](./2026-06-24-system-prompt-and-reasoning-fix.md)。把單一預設 system prompt 擴成可新增／切換／修改／刪除的多組具名 preset。

## 做了什麼

- **資料模型**：`systemPrompt: string` → `systemPrompts: SystemPrompt[]`（`{id,name,content}`）+ `activeSystemPromptId`。加 `activeSystemPrompt(s)` 解析啟用中內容。舊的單一字串自動遷移成一組 preset（穩定 id `legacy`，避免存檔前每次 load 都換 id）。
- **注入**：改用 `activeSystemPrompt(s)`；未啟用或內容空白則不注入，行為與先前一致。
- **UI**：設定面板 system prompt 區改為「下拉切換（含『不啟用』）＋ ＋新增 ／ 刪除 ＋ 名稱/內容編輯」。

## 過程

- 用瀏覽器實測四個動作：新增（自動設為啟用、欄位空白）、切換（下拉更新編輯欄、儲存持久化 `activeSystemPromptId`）、修改（名稱/內容綁定）、刪除（移除並退回「不啟用」）。注入解析三態（啟用 A／啟用 B／不啟用）逐一驗證。
- 試過把下拉換成可搜尋 combobox（`@base-ui/react` 內建、無新依賴），搜尋/切換都通；但**使用者覺得不好看也不好用，回退成原生 `<select>`**。

## 原因 / 取捨

- **為何全域多組而非每對話**：使用者要在幾個固定 persona（台灣立場、程式助手…）間切換，是全域習慣集合，不是每對話獨立。每對話覆寫的升級路徑仍保留，需要再說（YAGNI）。
- **為何回退 combobox**：原生 `<select>` 對「幾組 preset」已夠用、外觀一致、零維護。搜尋是 preset 數量很多時才有價值，目前 YAGNI。
- **遷移用固定 id**：`loadSettings()` 不落盤，遷移若用隨機 id 會在存檔前每次 load 變動，故用固定 `legacy`。

## 待辦 / 限制

- preset 數量變多時可再考慮搜尋；目前刻意不做。
- system prompt 對 reasoning 模型 CoT 的矯正力限制同前篇，仍建議搭配「停用思考」。
