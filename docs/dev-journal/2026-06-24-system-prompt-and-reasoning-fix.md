# 2026-06-24 — 預設 system prompt + 推論欄位修正

接續 [deploy-and-speed-stats](./2026-06-24-deploy-and-speed-stats.md)。為了讓 nemotron 這類模型穩定跳脫對岸語料框架，加了預設 system prompt；實測時順手揪出一個 adapter 的推論顯示 bug。

## 做了什麼

- **預設 system prompt**：設定面板新增多行欄位，值持久化於 localStorage；非空時每次請求以 `system` role 注入 messages 最前，留白（trim 後為空）則不注入。走 OpenSpec change `add-system-prompt`，已封存進 `byok-config` spec。
- **推論欄位修正**：adapter 原本只認 `reasoning_content`，漏了 `reasoning`，導致這台 vLLM 的思考內容消失、正文被誤標成推論。補上 `reasoning` 欄位，並把行內標記從只認 `<think>` 推廣到 `<think>`/`<thinking>` 兩種。

## 過程

### system prompt
1. 三處小改：`Settings` 加 `systemPrompt`、adapter 在 `toOpenAIMessages` 前 `unshift` system 訊息、SettingsDialog 加 textarea（用原生 `<textarea>` + Input 的 class，不為單一欄位加 shadcn 元件）。
2. 瀏覽器實測：攔截 fetch 確認非空注入、純空白不注入；設定面板渲染正常。
3. 不寫死任何文案——prompt 全由使用者填、存 localStorage（使用者明確要求）。

### 推論欄位 bug
1. 症狀：使用者回報「Reasoning 區塊裡是正文，真正的 reasoning 不見了」。
2. 直接抓真實端點的原始 SSE，看到 delta 是 `{"reasoning":"嗯"}`——這台 vLLM 用 `reasoning` 欄位，不是 `reasoning_content`。
3. adapter 只讀 `reasoning_content` → 思考被丟掉；又因 `reasoningField` 一直空，那段「無 tag 就當 reasoning」的即時 heuristic 把正文 `content` 灌進推論區。同一個根因兩個症狀。
4. 修法：`reasoning_content ?? reasoning`。一改之後 `reasoningField` 變非空 → heuristic 自動跳過 → 正文回到答案區、思考回到推論區。用真實端點驗證：reasoning 1242 字、content 325 字，各歸各位。
5. 順手把 `splitThink` 與 heuristic 的 `<think>` 字面比對改成共用 regex `THINK_OPEN`/`THINK_CLOSE`，同時吃 `<thinking>`。

## 原因 / 取捨

- **為何 system prompt 全域單欄位**：使用者場景是固定習慣（要台灣立場），不是每對話切換。每對話覆寫多一層 state，不符當前需求（YAGNI），升級路徑明確再說。
- **「OpenAI compatible」不含 reasoning**：OpenAI 官方 streaming `delta` 沒有 reasoning 欄位，o1/o3 的思考內容根本不透過 API 給。各家自訂：DeepSeek/部分 vLLM 用 `reasoning_content`、OpenRouter/這台 vLLM 用 `reasoning`、一堆本地模型塞 `content` 裡的 `<think>`。所以 adapter 得同時吃三種形狀，這次補齊。
- **沒做**：`reasoning_details`、reasoning 為物件、`<reason>` 等沒人實際串流的形狀——YAGNI，真遇到再加。

## 待辦 / 限制

- system prompt 對 reasoning 模型的 CoT 矯正力較弱（思考段是內化習慣），語料層 bias 可能仍出現在 `<think>`。建議搭配「停用思考」與較低 temperature，由使用者實測選最穩組合。
- 臨時 `trycloudflare` tunnel 對長串流不穩，實測時遇到偶發 `network error`（重試即通）；這是 tunnel 不是 app。adapter 的 reader 讀取迴圈仍未包 try/catch，中途斷線只顯示乾的 `network error`——可補但非必要。
