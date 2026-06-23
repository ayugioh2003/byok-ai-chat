# BYOK AI Chat

純前端 AI 聊天 web app。使用者自帶 OpenAI 相容端點（baseURL / apiKey / model），瀏覽器直連並串流。無後端、無資料庫，設定與對話紀錄都存在瀏覽器的 localStorage。

技術棧：React + Vite + Tailwind v4 + shadcn/ui + [assistant-ui](https://www.assistant-ui.com)。

## 開發

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # 產出 dist/（純靜態）
```

開啟後點「設定」填入：

- **Base URL** — `https://your-host` 或 `https://your-host/v1`
- **API Key** — 端點的金鑰（可留空）
- **Model** — 例如 `nemotron3-super`

> 端點必須開啟 CORS，瀏覽器才能直連。官方雲端（OpenAI / OpenRouter）與自架 vLLM（預設開 CORS）皆可。

## 部署（純靜態，三家等價）

`npm run build` 後把 `dist/` 丟到任一靜態主機即可。`vite.config.ts` 已設 `base: './'`，可在任意子路徑下運作（GitHub Pages 專案頁也行）。單一路由、無 client router，不需 SPA fallback。

- **GitHub Pages**：把 `dist/` push 到 `gh-pages` 分支，或用 actions 部署。
- **Cloudflare Pages / Vercel**：build command `npm run build`，output 目錄 `dist`。

## 工具呼叫（tool calling）

UI 已接上 assistant-ui 的工具渲染，但**預設休眠**——預設不送 `tools`，沒工具也能正常聊天。設定面板的「啟用工具呼叫」開關只在端點支援時才有意義。

目前沒有註冊任何工具（dormant）；要實際使用，需先用 `useAssistantTool` / `makeAssistantTool` 註冊工具，**並**讓端點支援 tool calling。vLLM 須以下列參數啟動：

```sh
vllm serve <model> --enable-auto-tool-choice --tool-call-parser <parser>
```

（`<parser>` 視模型而定，例如 `hermes`、`llama3_json`。未開啟時，啟用工具會收到 `requires --tool-call-parser` 的 400/錯誤，app 會把訊息顯示出來。）

## 已知取捨

- API key 以**明文**存 localStorage（BYOK 純前端常態）。
- 對話紀錄持久化為扁平訊息串，reload 後不保留分支/編輯歷史。
