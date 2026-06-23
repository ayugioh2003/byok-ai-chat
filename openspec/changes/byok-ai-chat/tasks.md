## 1. 專案骨架

- [ ] 1.1 用 Vite 建立 React + TypeScript 專案
- [ ] 1.2 安裝並設定 Tailwind CSS
- [ ] 1.3 初始化 shadcn/ui，加入會用到的基礎元件（button、input、dialog/sheet、scroll-area）
- [ ] 1.4 安裝 @assistant-ui/react 與 @assistant-ui/tool-ui

## 2. BYOK 設定 (byok-config)

- [ ] 2.1 設計 localStorage 設定的型別與讀寫 helper（baseURL / apiKey / model）
- [ ] 2.2 建立設定面板 UI（dialog 或 sheet），含三欄輸入與儲存
- [ ] 2.3 在 apiKey 寫入處加 `ponytail:` 註記說明明文取捨與加密升級路徑
- [ ] 2.4 未設定完成時阻擋送出並引導至設定面板

## 3. 聊天串流 (chat-conversation)

- [ ] 3.1 實作自訂 ChatModelAdapter：fetch baseURL+/v1/chat/completions，帶 Authorization
- [ ] 3.2 解析 SSE 串流，累加 choices[].delta.content，容錯忽略未知欄位
- [ ] 3.3 以 useLocalRuntime 接上 adapter 並渲染 assistant-ui 聊天介面
- [ ] 3.4 帶入多輪歷史作為請求上下文
- [ ] 3.5 錯誤處理：CORS/網路失敗與非 2xx（401/400）顯示可行動提示

## 4. 對話紀錄 (conversation-history)

- [ ] 4.1 設計對話在 localStorage 的儲存結構（多對話）
- [ ] 4.2 對話清單 UI：新建 / 切換 / 刪除
- [ ] 4.3 訊息隨對話持久化，重新整理後讀回

## 5. 工具呼叫 (tool-calling)

- [ ] 5.1 預設不送 tools，確認在未開 tool calling 的端點正常運作
- [ ] 5.2 加入「啟用工具」開關；啟用後才掛 tool-ui 並送 tools
- [ ] 5.3 端點回傳工具相關錯誤時顯示「需伺服器端開啟 tool calling」提示

## 6. 部署

- [ ] 6.1 設定 Vite base path；採 HashRouter 處理 GitHub Pages SPA 路由
- [ ] 6.2 建置 dist/ 並驗證可部署至 GitHub Pages
- [ ] 6.3 README 記錄部署步驟與 vLLM 開啟 tool calling 的參數（--enable-auto-tool-choice --tool-call-parser）

## 7. 驗收

- [ ] 7.1 對真實 vLLM 端點 (nemotron3-super) 端到端測試串流聊天
- [ ] 7.2 驗證重貼浮動 tunnel URL 後可正常運作
- [ ] 7.3 驗證重新整理後設定與對話皆保留
