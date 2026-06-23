# 2026-06-24 — 部署上線 + 回應速度量測

接續 [kickoff](./2026-06-24-byok-ai-chat-kickoff.md)。核心功能跑通後，做了兩件事：部署到 GitHub Pages、加上回應速度量測。

## 做了什麼

- **GitHub Pages 上線**：在 `ayugioh2003` 帳號建公開 repo、加 Actions workflow 自動 build + deploy。線上：https://ayugioh2003.github.io/byok-ai-chat/
- **回應速度量測**：每次回應顯示輸入/輸出 token 數、輸出速度、TTFT、輸入 prefill 速度（概估），可開關。

## 過程

### 部署
1. 推前先掃 secret：`git grep` 確認 API key / 真實 tunnel URL **沒有**進版控（design.md 用 `<tunnel>` 佔位符的習慣救了一命）。
2. `gh repo create ... --public --source=. --push`（Pages 免費帳號需公開 repo）。
3. `.github/workflows/deploy.yml`：build → `upload-pages-artifact` → `deploy-pages`，觸發於 push main。
4. `gh api -X POST .../pages -f build_type=workflow` 啟用 Pages（Actions 來源）。
5. 驗證：線上 HTTP 200、`<title>` 正確、JS/CSS 資產在 `/byok-ai-chat/` 子路徑下 200 → 證明 `base: './'` 的相對路徑策略正確。

### 速度量測
- **token 來源**：實測端點支援 `stream_options.include_usage`，回傳精準 `prompt_tokens` / `completion_tokens` → 不用自己數 token。
- **計時**：adapter 量 `tStart`（送出前）、`tFirst`（首個 content/reasoning token）、`tEnd`（串流結束）。
- **指標**：輸出 tok/s = completion ÷ (tEnd−tFirst)；TTFT = tFirst−tStart；輸入 tok/s ≈ prompt ÷ TTFT。
- **不污染對話**：走獨立的 external store（`useSyncExternalStore`），不寫進訊息 content、不進 context、不持久化。

### UI 反覆打磨（依使用者回饋）
1. 一開始是 top 純文字一行 → 改成圓角膠囊 + 圖示，輸出 tok/s 放大強調。
2. 加「顯示測速」設定開關 + 膠囊上的 ✕ 一鍵隱藏（持久化）。
3. 加回輸入 tok/s（標 `~` 概估）+ 每個指標 hover tooltip（shadcn Tooltip）。
4. 使用者回饋「`218/s` 看不懂、版面亂、別把 output tok/s 拉出來」→ 重排成輸入/輸出對齊兩排（label｜token｜tok/s 三欄固定寬右對齊）、補滿單位、移除特別放大的數字。
5. tooltip 往下開會蓋到自己下排 → 把 bar 從 `top-3` 下移到 `top-16` 留空間。

## 原因 / 取捨

- **為何端到端計時**：純前端拿不到伺服器內部 prefill/decode 時間，只能量「使用者實際體驗」。**輸出 tok/s 最可信**（量測窗口長、token 精準）；**TTFT 含網路+排隊**（當體驗延遲看）；**輸入 tok/s 是 token÷TTFT 概估**，標 `~` 提醒不準。Cloudflare tunnel 會加延遲、可能緩衝 SSE，是額外干擾源。
- **為何 external store 不進訊息**：測速是 perf readout，不該污染對話內容、更不該回灌進下一次請求的 context。
- **為何公開 repo**：GitHub Pages 免費帳號限定。已確認無 secret 才推。

## 後續 / 待辦

- tooltip 往下開仍會蓋到 bar 自己下排；更根本的解是 `side="left"` 往左開（目前用下移 bar 緩解）。
- 想要更準的伺服器端 timing → 需端點回 timestamp（OpenAI 標準 API 不給；vLLM `/metrics` 是聚合值）。
- speed-stats 需求已補進 live spec（`chat-conversation`、`byok-config`）；原 `byok-ai-chat` change 已封存故未再改動。
