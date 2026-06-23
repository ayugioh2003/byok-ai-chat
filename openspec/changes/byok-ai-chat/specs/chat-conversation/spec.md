## ADDED Requirements

### Requirement: 瀏覽器直連串流聊天
系統 SHALL 透過 assistant-ui 的 `useLocalRuntime` + 自訂 `ChatModelAdapter`，由瀏覽器直接對 `baseURL + /v1/chat/completions` 發出串流請求，並即時渲染回應。

#### Scenario: 送出並串流接收
- **WHEN** 使用者送出一則訊息
- **THEN** 系統以串流方式逐段顯示模型回應，無需等待完整回應結束

#### Scenario: 多輪對話帶入歷史
- **WHEN** 使用者在同一對話中送出後續訊息
- **THEN** 請求帶上先前訊息作為上下文，模型回應延續對話

### Requirement: 標準 OpenAI 相容欄位解析
系統 SHALL 僅依賴標準 OpenAI 相容串流欄位（`choices[].delta.content`），並容錯忽略未知欄位，以相容不同 OpenAI 相容端點。

#### Scenario: 解析標準串流片段
- **WHEN** 端點回傳含 `choices[].delta.content` 的 SSE 片段
- **THEN** 系統累加 content 並更新畫面，遇到不認得的欄位不報錯

### Requirement: 連線與 CORS 錯誤處理
當請求因網路、CORS 或 HTTP 錯誤失敗時，系統 SHALL 顯示明確、可行動的錯誤訊息，而非靜默失敗。

#### Scenario: CORS 或網路失敗
- **WHEN** 對端點的請求因 CORS 被擋或網路不可達而失敗
- **THEN** 系統顯示錯誤提示，指出可能為端點未開 CORS 或 URL 失效，並建議檢查設定

#### Scenario: 端點回傳錯誤狀態
- **WHEN** 端點回傳非 2xx（如 401 金鑰錯誤、400 參數錯誤）
- **THEN** 系統顯示該錯誤訊息，協助使用者判斷是 key、model 還是參數問題
