# 2026-06-24 — 純前端 BYOK AI chat 從零到可用

## 做了什麼

從空目錄起一個 AI chat web app：使用者自帶 OpenAI 相容端點（baseURL / apiKey / model），瀏覽器直連並串流，對話與設定存 localStorage，純靜態可部署到 GitHub Pages / Cloudflare Pages / Vercel。技術棧 React + Vite + Tailwind v4 + shadcn/ui + assistant-ui。

最終跑通：串流聊天、多對話建立/切換/刪除、reload 持久化、取消、錯誤顯示、LLM 參數控制（停用思考 / temperature / max_tokens）、可折疊 reasoning。對真實 vLLM 端點（`nemotron3-super`）瀏覽器端到端驗證通過。

## 過程

1. **explore**：釐清需求，發現核心張力是「純前端 vs 要不要後端」其實由 CORS 決定。
2. **實測端點**（決定架構的關鍵）：
   - CORS preflight → `access-control-allow-origin: *`，瀏覽器可直連。
   - `/v1/models` → 唯一 id `nemotron3-super`。
   - tool calling → 被拒，缺 `--enable-auto-tool-choice --tool-call-parser`。
3. **propose**：OpenSpec change `byok-ai-chat`，4 個 capability + design + tasks。
4. **implement**：Vite 專案 → Tailwind v4 → shadcn init → `npx assistant-ui add thread` → 寫 storage / runtime adapter / 設定面板 / sidebar。
5. **追加**：使用者要求「少 thinking、能調參數」「thinking 內容可折疊」，加了參數控制與 reasoning 解析。
6. **archive**：補 spec、折進 `openspec/specs/`、歸檔。

## 發生了什麼問題、原因、怎麼解

- **決定零後端**
  原因：key 由使用者自帶（後端不需藏祕密）+ vLLM 已開 CORS（後端不需繞 CORS）→ 後端唯一理由消失。
  解法：assistant-ui 用 `useLocalRuntime` + 自訂 `ChatModelAdapter` 直接 fetch 串流，不走需要後端的 AI SDK route。

- **Context7 查 assistant-ui 文件額度用盡**
  解法：改用 `gh api` 抓 repo raw 的 `local-runtime.mdx` / `tool-ui.mdx`，拿到 `useLocalRuntime` / `ChatModelAdapter` 的當前 API 與串流範例（yield 累積內容、非 delta）。

- **`npm create vite` 不能在非空目錄跑**（已有 .git / openspec）
  解法：scaffold 到暫存夾再把檔案搬進根目錄。

- **TS 6 棄用 `baseUrl`**（build 報 TS5101）
  解法：移除 `baseUrl`，只留 `paths`（現代 TS 以 tsconfig 位置解析）。

- **shadcn 用 base-ui，assistant-ui 產的元件用 radix 慣例 → tooltip 型別衝突**
  現象：`tooltip-icon-button.tsx` 用 `<TooltipProvider delayDuration={0}>`，但 base-ui 的 prop 是 `delay`。
  解法：改成 `delay={0}`。

- **`context.tools` 是 `Record<string, Tool>`，不是陣列**
  現象：`context.tools?.length` 型別錯、且直接丟給 OpenAI 格式不對。
  解法：`Object.entries` 轉成 `{type:"function", function:{name,description,parameters}}` 陣列；目前無註冊工具故 useTools 恆 false（dormant）。

- **thinking 太多，浪費時間與 token**
  實測三種關法：`chat_template_kwargs:{enable_thinking:false}` ✅、`/no_think` 前綴 ❌、`reasoning_effort:low` ⚠（沒 `<think>` 但仍廢話）。
  解法：設定面板加「停用思考」開關送 A 方案，另加 temperature / max_tokens。

- **reasoning 想折疊隱藏**
  發現：assistant-ui 的 Thread 本來就內建可折疊 reasoning UI（`reasoning.tsx`），缺的是 adapter 沒吐出 reasoning part。
  麻煩點：此模型把思考用**行內、且開頭 tag 缺失的 bare `</think>`** 塞在 `content`，不是獨立 `reasoning_content` 欄位 → 串流期間在 `</think>` 出現前無法分辨，會先閃成答案文字再折疊。
  解法：(1) `splitThink` 解析 `<think>...</think>`（含只有結尾 tag 的情況）；(2) 同時支援 `reasoning_content` 欄位；(3) 啟發式——思考開啟且尚未出現 `</think>` 時，把串流當 reasoning 即時流進折疊區塊。瀏覽器驗證：思考即時進區塊、結束自動收合、點擊展開；空思考不冒空區塊。

- **瀏覽器自動化偶發焦點異常 / chrome-extension URL 錯誤**
  解法：改用 read_page 取 ref + form_input 灌值、點 send 按鈕的 ref，避開鍵盤 focus 問題。

## 後續 / 待辦

- tool-ui 已接好但無註冊工具、預設關；要用需 vLLM 開 tool calling + 用 `useAssistantTool` 註冊。純前端可做「瀏覽器內運算 + CORS-friendly API」類工具；需藏密鑰/碰內網的工具才要 proxy。
- 想要乾淨的串流 reasoning 分離 → vLLM 開 `--reasoning-parser`，走 `reasoning_content` 正規路徑、可移除上面的啟發式。

## 取捨（ponytail）

- API key 明文存 localStorage（BYOK 純前端常態）。
- 對話持久化為扁平訊息串，reload 不保留分支/編輯歷史。
- bundle 904KB 未 code-split（本地單頁工具無妨）。
