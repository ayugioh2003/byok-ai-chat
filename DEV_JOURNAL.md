# Dev Journal

## 2026-06-24 — 專案起步：純前端 BYOK AI chat

從零開始。需求：可部署到 Vercel/Cloudflare 的 AI chat web app，使用者自帶 LLM baseURL/apiKey/model，前端 React+Vite+Tailwind+shadcn+assistant-ui。

### 關鍵決策
- **純前端、零後端**。實測目標端點（自架 vLLM + Cloudflare tunnel）已開 CORS（`access-control-allow-origin: *`），瀏覽器可直連；加上 key 由使用者自帶、後端不需藏祕密 → 後端唯一理由（繞 CORS）不存在。GitHub Pages / CF Pages / Vercel 三家純靜態部署等價、零鎖定。
- assistant-ui 用 `useLocalRuntime` + 自訂 `ChatModelAdapter`，直接 fetch `/v1/chat/completions` 串流，不走需要後端的 AI SDK route 模式。
- 設定與對話紀錄存 localStorage；多對話用每對話一個 `ThreadHistoryAdapter`（localStorage 後端），切換時以 React key 重掛 runtime 觸發 load。

### 端點實測（決定架構的證據）
- CORS preflight → `*` 全放行 ✅
- `/v1/models` → 唯一 id `nemotron3-super`
- tool calling → **未開**（缺 `--enable-auto-tool-choice --tool-call-parser`），故 tool-ui 先接好但休眠

### 實作後追加
- **LLM 參數控制**：設定面板加「停用思考」開關（送 `chat_template_kwargs:{enable_thinking:false}`，實測可關掉 `<think>` 省 token）、temperature、max_tokens。
- **可折疊 reasoning**：adapter 把 reasoning 解析成 assistant-ui 的 reasoning part（支援 `reasoning_content` 欄位 + 行內 `<think>` tag），由內建的折疊 UI 渲染。此模型用 bare `</think>`、無開頭 tag，故加啟發式：思考開啟且尚未出現 `</think>` 時，把串流當 reasoning 即時流進折疊區塊。

### 已知取捨（ponytail）
- API key 明文存 localStorage（BYOK 純前端常態）。
- 對話持久化為扁平訊息串，reload 不保留分支/編輯歷史。
- tool-ui 接好但無註冊工具、預設關。
- 想要乾淨的串流 reasoning 分離 → vLLM 開 `--reasoning-parser` 走 `reasoning_content` 正規路徑。

### 結論
OpenSpec change `byok-ai-chat` 全數實作完成，瀏覽器對真實 vLLM 端到端驗證通過（串流、持久化、多對話、取消、錯誤處理、參數控制、reasoning 折疊）。
