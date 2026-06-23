## Why

需要一個自用的 AI chat web app，能接自架的 vLLM（透過 Cloudflare tunnel 暴露的 OpenAI 相容端點），並讓使用者在網頁上自行帶入 baseURL / apiKey / model。經實測該端點已開啟 CORS（`access-control-allow-origin: *`），瀏覽器可直連，因此整個應用可做成**純前端、零後端**——後端唯一的傳統理由（保護 API key）在「使用者自帶 key」的情境下不存在。

## What Changes

- 新增一個純前端 SPA（React + Vite + Tailwind + shadcn/ui + assistant-ui）。
- 新增設定面板：使用者輸入 `baseURL`、`apiKey`、`model`，存入 `localStorage`。
- 新增聊天介面：assistant-ui 透過 `useLocalRuntime` + 自訂 `ChatModelAdapter`，瀏覽器直接 fetch OpenAI 相容 `/v1/chat/completions` 並串流回應。
- 新增對話紀錄：以 `localStorage` 持久化，可新建/切換/刪除對話。
- 接上 assistant-ui/tool-ui，但**預設休眠**；僅在偵測到端點支援 tool calling 時才送出 `tools` 並啟用工具 UI。（實測 `nemotron3-super` 目前未開 `--enable-auto-tool-choice`，故 v1 不依賴工具。）
- 純靜態部署（`dist/`），主目標 GitHub Pages，Vercel / Cloudflare Pages 等價可換。
- 非範圍：後端、資料庫、跨裝置同步、多人、API key 加密。

## Capabilities

### New Capabilities
- `byok-config`: 使用者自帶 LLM 連線設定（baseURL / apiKey / model）的輸入、驗證與 localStorage 持久化。
- `chat-conversation`: 瀏覽器直連 OpenAI 相容端點的串流聊天，含 assistant-ui runtime 整合與錯誤處理。
- `conversation-history`: 對話紀錄於 localStorage 的建立、切換、刪除與持久化。
- `tool-calling`: tool-ui 整合，依端點能力動態啟用/休眠的工具呼叫流程。

### Modified Capabilities
<!-- 無既有 spec，全為新增 -->

## Impact

- **新建專案**：greenfield，無既有程式碼。
- **依賴**：react, vite, tailwindcss, shadcn/ui, @assistant-ui/react, @assistant-ui/tool-ui。無後端框架、無資料庫。
- **外部端點**：OpenAI 相容 API（使用者執行期自帶 URL，浮動的 trycloudflare tunnel URL 由設定面板吸收）。
- **部署**：純靜態檔，三家（GitHub Pages / Vercel / CF Pages）部署方式一致，無平台鎖定。
- **安全取捨**：API key 以明文存於 localStorage（BYOK 純前端場景的業界常態，將以 `ponytail:` 註記為有意取捨）。
