## ADDED Requirements

### Requirement: 對話紀錄持久化
系統 SHALL 將對話訊息持久化於 `localStorage`，重新整理或重開分頁後仍可讀回。

#### Scenario: 重新整理後保留對話
- **WHEN** 使用者進行數輪對話後重新整理頁面
- **THEN** 先前的對話訊息完整顯示

### Requirement: 多對話管理
系統 SHALL 支援建立、切換與刪除多個獨立對話。

#### Scenario: 新建對話
- **WHEN** 使用者點選新建對話
- **THEN** 建立一個空白對話並切換至該對話，原對話保留不受影響

#### Scenario: 切換對話
- **WHEN** 使用者在對話清單中選取另一個對話
- **THEN** 主畫面顯示該對話的訊息歷史

#### Scenario: 刪除對話
- **WHEN** 使用者刪除某個對話
- **THEN** 該對話自 localStorage 移除，且不影響其他對話
