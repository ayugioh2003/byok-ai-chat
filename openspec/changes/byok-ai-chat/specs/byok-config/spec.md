## ADDED Requirements

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

### Requirement: API key 明文儲存之取捨
系統 SHALL 以明文將 apiKey 存於 localStorage，並在程式碼以 `ponytail:` 註記此為 BYOK 純前端場景的有意取捨。

#### Scenario: key 寫入儲存
- **WHEN** 使用者儲存含 apiKey 的設定
- **THEN** apiKey 以明文存入 localStorage（不加密），且程式碼註記此取捨與加密升級路徑
