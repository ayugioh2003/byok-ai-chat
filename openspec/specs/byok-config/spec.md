# byok-config Specification

## Purpose
TBD - created by archiving change byok-ai-chat. Update Purpose after archive.
## Requirements
### Requirement: 連線設定輸入與持久化
系統 SHALL 提供設定面板，讓使用者輸入 `baseURL`、`apiKey`、`model` 三項，並將其持久化於 `localStorage`，重新整理後仍保留。

#### Scenario: 首次填入並儲存
- **WHEN** 使用者在設定面板填入 baseURL、apiKey、model 並按儲存
- **THEN** 三項值寫入 localStorage，且聊天功能變為可用

#### Scenario: 重新整理後保留
- **WHEN** 已儲存設定的使用者重新整理頁面
- **THEN** 設定面板自動帶回先前的 baseURL、apiKey、model

#### Scenario: 更新浮動的 tunnel URL
- **WHEN** 端點 URL 改變、使用者在設定面板貼上新的 baseURL 並儲存
- **THEN** 後續請求改用新 URL，無需修改程式或重新部署

### Requirement: 未設定前的引導
當必要設定缺失時，系統 SHALL 阻擋聊天送出並引導使用者前往設定。

#### Scenario: 缺少設定時送出
- **WHEN** 使用者在未填妥 baseURL 或 model 的情況下嘗試送出訊息
- **THEN** 系統不發出請求，並提示需先完成連線設定

### Requirement: 推論與生成參數設定
系統 SHALL 提供可調整、並持久化於 localStorage 的請求參數：停用思考（reasoning）開關、temperature、max_tokens。空值代表不送該參數、沿用端點預設。

#### Scenario: 停用思考
- **WHEN** 使用者開啟「停用思考」並送出訊息
- **THEN** 請求帶上 `chat_template_kwargs: { enable_thinking: false }`，模型跳過思考階段直接作答

#### Scenario: 設定 temperature 與 max_tokens
- **WHEN** 使用者填入 temperature 或 max_tokens 並儲存
- **THEN** 後續請求帶上對應參數；留空的欄位則不送出

#### Scenario: 顯示測速開關
- **WHEN** 使用者切換「顯示測速」並儲存
- **THEN** 設定持久化，控制速度指標列是否顯示（預設開）

### Requirement: API key 明文儲存之取捨
系統 SHALL 以明文將 apiKey 存於 localStorage，並在程式碼以 `ponytail:` 註記此為 BYOK 純前端場景的有意取捨。

#### Scenario: key 寫入儲存
- **WHEN** 使用者儲存含 apiKey 的設定
- **THEN** apiKey 以明文存入 localStorage（不加密），且程式碼註記此取捨與加密升級路徑

### Requirement: system prompt 多組管理與注入
系統 SHALL 提供可持久化於 `localStorage` 的多組具名 system prompt（每組含名稱與內容），並支援新增、切換、修改、刪除。系統 SHALL 記錄目前「啟用中」的一組；當啟用中的內容非空時，於每次請求前以 `system` role 注入到送往端點的 messages 最前。未啟用任何組、或啟用中內容為空（或僅空白）時，不注入任何 system 訊息。舊版單一字串設定 SHALL 自動遷移為一組 preset。

#### Scenario: 新增與切換
- **WHEN** 使用者新增一組 prompt，或從清單切換啟用中的組別並儲存
- **THEN** 組別與「啟用中」選擇寫入 localStorage，重新整理後保留

#### Scenario: 修改與刪除
- **WHEN** 使用者修改某組的名稱／內容、或刪除某組並儲存
- **THEN** 變更持久化；刪除啟用中的組後，回到「未啟用」狀態

#### Scenario: 啟用中且非空時注入
- **WHEN** 啟用中的組別內容非空，使用者送出訊息
- **THEN** 送往端點的 messages 最前多一則 `{ role: "system", content: <啟用中內容> }`，其後接續對話訊息

#### Scenario: 未啟用或空內容時不注入
- **WHEN** 未啟用任何組，或啟用中內容為空（或僅空白），使用者送出訊息
- **THEN** 送往端點的 messages 不含任何 system 訊息，行為與未設定時一致

