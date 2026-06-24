## Context

App 為純前端 BYOK 聊天，請求在 `src/RuntimeProvider.tsx` 的 adapter 內組成 OpenAI messages 後直連串流。設定集中存於 `localStorage` 的 `chat:settings`，由 `src/lib/storage.ts` 的 `Settings` 型別管理。本變更只新增一項全域設定與一次訊息注入，無後端、無新依賴。

## Goals / Non-Goals

**Goals:**
- 使用者可預設一段角色／習慣／立場提示詞，全域套用於所有對話。
- 提示詞以標準 `system` role 注入，相容 OpenAI／vLLM 端點。

**Non-Goals:**
- 不做每對話各自覆寫的 system prompt（YAGNI；全域習慣即可，要再加）。
- 不保證能「根除」模型語料層 bias —— 見風險。
- 不內建預設範本文案；欄位留空，由使用者自填。

## Decisions

- **存全域單欄位 `systemPrompt: string`**，與既有設定並列於 `Settings`。理由：使用者場景是固定習慣，非每次切換；每對話覆寫會多一層 state，不符當前需求。
- **以 `system` role 注入，而非塞進第一則 user 訊息**。理由：目標端點（OpenAI 相容 / vLLM）皆吃標準 system role，語意正確且模型對齊較佳。
- **空值（trim 後為空）不注入**。理由：避免送出無意義的空 system 訊息，並讓未設定時行為與現狀完全一致。
- **注入點在 `toOpenAIMessages` 結果最前 `unshift`**。理由：單一改動點，最短 diff。

## Risks / Trade-offs

- [system prompt 對 reasoning 模型的 CoT（`<think>`）矯正力較弱，語料層 bias 可能仍出現在思考內容] → 文件說明此為已知限制；建議搭配既有「停用思考」開關與較低 temperature 一起使用，由使用者實測選最穩組合。
- [全域套用，不同對話無法用不同 persona] → 接受；需要時再擴為每對話覆寫（升級路徑明確）。
