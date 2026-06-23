## Context

Greenfield 純前端專案。目標端點為自架 vLLM（OpenAI 相容），透過 Cloudflare quick tunnel 暴露為 HTTPS。探索階段已對實際端點做過驗證，結論直接決定了架構：

- **CORS 驗證**：對 `https://<tunnel>.trycloudflare.com/v1/chat/completions` 發 OPTIONS preflight，回應 `access-control-allow-origin: *`、`access-control-allow-methods: ... POST ...`、`access-control-max-age: 600`。→ 瀏覽器可直連，**不需 proxy**。
- **Model 驗證**：`/v1/models` 回傳唯一 id `nemotron3-super`。
- **Tool calling 驗證**：送出帶 `tools` + `tool_choice:"auto"` 的請求被拒：`"auto" tool choice requires --enable-auto-tool-choice and --tool-call-parser to be set`；改強制指定 function 亦要求 `--tool-call-parser`。→ 此端點目前**未開 tool calling**，屬伺服器 ops 設定，非 app 可控。

約束：tunnel URL 為浮動值（重啟即變）；無後端可用；使用者自帶 key。

## Goals / Non-Goals

**Goals:**
- 純前端 SPA，零後端，純靜態部署到 GitHub Pages（Vercel / CF Pages 等價）。
- 使用者在 UI 自帶 baseURL / apiKey / model，瀏覽器直連並串流。
- 對話紀錄存 localStorage，可多對話切換。
- tool-ui 接好但在端點不支援時自動休眠，不阻擋 v1。

**Non-Goals:**
- 後端 / serverless function（CORS 已通，無存在理由）。
- 資料庫、跨裝置同步、多人協作、帳號系統。
- API key 加密儲存。

## Decisions

### D1：純前端，不放後端
瀏覽器直接 fetch LLM 端點。**理由**：實測 CORS 全放行；key 由使用者自帶，後端無需保護祕密。後端唯一價值（繞 CORS）不存在。
**替代方案**：放一支 serverless 啞 proxy——否決，因 (a) 無 CORS 問題，(b) 會在 Vercel/CF 間產生平台鎖定，(c) GitHub Pages 直接出局。
**升級路徑**：若日後要接「未開 CORS 的端點」，再加一支無狀態轉發 function（`ponytail:` 註記升級點），不影響現有程式。

### D2：assistant-ui 用 `useLocalRuntime` + 自訂 ChatModelAdapter
不走 `@assistant-ui/react-ai-sdk` 的後端 route 模式，改用 `useLocalRuntime` 包一個自訂 adapter，adapter 內直接 `fetch(baseURL + "/v1/chat/completions", { stream: true })` 並解析 SSE。
**理由**：後端 route 模式需要伺服器；本專案無後端。LocalRuntime 是 assistant-ui 官方為「前端自管 model 呼叫」設計的路徑。
**替代方案**：直接用 Vercel AI SDK 的 `useChat` 指向後端 `/api/chat`——否決，需後端。

### D3：設定與對話紀錄存 localStorage
`byok-config` 存連線設定；`conversation-history` 以 key 前綴存對話陣列。
**理由**：純前端、單裝置自用，localStorage 是最懶且足夠的持久層。
**取捨**：明文 key（見 R1）；無跨裝置同步（非 goal）。

### D4：tool-ui 預設休眠，能力偵測後啟用
聊天請求預設**不送** `tools`。提供「啟用工具」開關（或啟動時對端點做一次能力探測），僅在確認端點支援 tool calling 時才掛上 tool-ui 並送 `tools`。
**理由**：實測目標端點未開 tool calling；硬送 `tools` 會直接 400。先接好程式碼、預設關閉，端點哪天開了即可亮起，app 不需重做。
**替代方案**：v1 完全不碰 tool-ui——否決，之後要重接；或 v1 強制工具——否決，現況直接壞掉。

### D5：部署 = 純靜態 `dist/`
Vite build 產物丟任一靜態主機。預設 GitHub Pages，需處理 base path 與 SPA fallback（`404.html` 技巧或 HashRouter）。
**理由**：三家部署一致、零鎖定，符合「不想被綁死」。

## Risks / Trade-offs

- **R1：API key 明文存 localStorage（XSS 可竊）** → 緩解：BYOK 純前端場景的業界常態（各家 BYOK chat 皆如此）；以 `ponytail:` 註記為有意取捨；不引入第三方 script 以縮小 XSS 面。需加密請使用者明確要求。
- **R2：tunnel URL 浮動，重啟即失效** → 緩解：設定面板讓使用者隨時重貼 URL；不把 URL 寫死在程式內。
- **R3：tool calling 端點未開，tool-ui 無法實跑** → 緩解：D4 休眠設計；於 UI 明示「需端點支援」。屬 ops 設定，文件註明 vLLM 啟動需 `--enable-auto-tool-choice --tool-call-parser <parser>`。
- **R4：CORS 全放行 (`*`) 是 tunnel 後端的設定** → 若使用者改接其他未開 CORS 的端點，瀏覽器直連會失敗 → 緩解：UI 對 CORS/network 錯誤給明確提示，並指向 D1 的 proxy 升級路徑。
- **R5：不同 OpenAI 相容端點的 SSE / 欄位細節有差異** → 緩解：adapter 只依賴標準 `choices[].delta.content` 串流欄位，容錯解析未知欄位。

## Open Questions

- GitHub Pages 路由用 `HashRouter` 還是 `404.html` rewrite？（傾向 HashRouter，最懶、無伺服器設定。）
- 能力偵測要「啟動主動探測一次」還是「純手動開關」？（傾向手動開關，省一次請求，YAGNI。）
