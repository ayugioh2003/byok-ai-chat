## ADDED Requirements

### Requirement: 預設 system prompt 設定與注入
系統 SHALL 提供一項可持久化於 `localStorage` 的「預設 system prompt」設定，並在該值非空時，於每次請求前以 `system` role 注入到送往端點的 messages 最前。空值代表不注入任何 system 訊息。

#### Scenario: 填入並儲存預設 prompt
- **WHEN** 使用者在設定面板的「預設 system prompt」欄填入文字並按儲存
- **THEN** 該文字寫入 localStorage，重新整理後設定面板自動帶回原值

#### Scenario: 非空時注入 system 訊息
- **WHEN** 已設定非空的預設 system prompt 的使用者送出訊息
- **THEN** 送往端點的 messages 最前多一則 `{ role: "system", content: <該值> }`，其後接續對話訊息

#### Scenario: 留空時不注入
- **WHEN** 預設 system prompt 為空（或僅空白）的使用者送出訊息
- **THEN** 送往端點的 messages 不含任何 system 訊息，行為與未設定時一致
