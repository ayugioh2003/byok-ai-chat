## 1. 設定持久化

- [x] 1.1 `src/lib/storage.ts`：`Settings` 型別新增 `systemPrompt: string`
- [x] 1.2 `loadSettings` 的正常與 catch 兩個 return 路徑都帶 `systemPrompt: s.systemPrompt ?? ""`

## 2. 請求注入

- [x] 2.1 `src/RuntimeProvider.tsx`：組 body 時，若 `s.systemPrompt.trim()` 非空，於 `toOpenAIMessages(messages)` 結果最前加入 `{ role: "system", content: s.systemPrompt }`

## 3. 設定面板 UI

- [x] 3.1 `src/components/SettingsDialog.tsx`：新增「預設 system prompt」多行輸入欄（textarea），綁定 `s.systemPrompt`
- [x] 3.2 加一行說明文字（例：角色設定／習慣／立場，留空則不送）

## 4. 驗證

- [x] 4.1 `npm run build` 通過、型別無誤
- [x] 4.2 手動測：填入立場 prompt 後送訊息，確認請求 messages 最前帶 system；清空後確認不帶
