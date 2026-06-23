## ADDED Requirements

### Requirement: 工具呼叫預設休眠
系統 SHALL 預設**不**於聊天請求中送出 `tools`，使應用在不支援 tool calling 的端點（如目前的 vLLM）上正常運作。

#### Scenario: 預設不送 tools
- **WHEN** 使用者在未啟用工具的情況下送出訊息
- **THEN** 請求不含 `tools` 欄位，聊天正常串流回應，不因端點不支援而失敗

### Requirement: 顯式啟用後掛載 tool-ui
系統 SHALL 提供啟用工具的開關；啟用後才掛上 assistant-ui/tool-ui 並於請求帶上 `tools`，且程式碼接線完成、無需後續重構即可啟用。

#### Scenario: 啟用工具
- **WHEN** 使用者開啟工具開關並送出訊息
- **THEN** 請求帶上 `tools`，模型回傳的 tool call 由 tool-ui 元件渲染

#### Scenario: 端點不支援工具時的提示
- **WHEN** 啟用工具後，端點回傳工具相關錯誤（如要求 `--tool-call-parser`）
- **THEN** 系統顯示明確提示，說明該端點未開啟 tool calling，並指引這是伺服器端設定
