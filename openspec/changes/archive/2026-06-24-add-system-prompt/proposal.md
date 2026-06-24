## Why

部分模型（如 nemotron）在中文情境下受對岸語料影響，會自帶 PRC framing（例如「台灣是不可分割的一部分」）。使用者目前無法預先設定角色、習慣或立場來矯正這類框架，每次都得在對話中重述。

## What Changes

- 設定面板新增「預設 system prompt」多行輸入欄，讓使用者填入角色設定／習慣／立場提示詞。
- 該值與其他連線設定一同持久化於 `localStorage`，重新整理後保留。
- 每次請求前，若該值非空，以 `system` role 注入到 OpenAI messages 最前。空值則不注入。

## Capabilities

### New Capabilities
<!-- 無 -->

### Modified Capabilities
- `byok-config`: 新增一項可持久化的請求設定「預設 system prompt」，並規範其以 system role 注入請求的行為。

## Impact

- `src/lib/storage.ts`：`Settings` 型別與載入／預設值新增 `systemPrompt`。
- `src/RuntimeProvider.tsx`：組 OpenAI messages 時依設定注入 system 訊息。
- `src/components/SettingsDialog.tsx`：新增多行輸入欄。
- 無新依賴、無後端、無破壞性變更。
