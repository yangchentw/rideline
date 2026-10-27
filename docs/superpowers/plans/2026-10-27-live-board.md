# 活動即時看板 Implementation Plan

**Goal:** 提供任何持有活動連結者可瀏覽的手機優先活動即時看板。
**Architecture:** 獨立 React 元件與純資料計算模組；沿用公開活動資料及 15 秒同步。以 `?event=ID&page=live` 分享看板。
**Tech Stack:** React、Vite、Node test runner，無新增依賴。
**Spec:** docs/superpowers/specs/2026-10-27-live-board-design.md

## Global Constraints
- 不需登入或加入即可查看；打卡與管理權限維持原有規則。
- 手機上下排列、電腦左右並排；同步保留站點、篩選與搜尋。
- 不調整資料庫、不部署。

## Review Focus
- 無參加者或無站點時不誤報完成。
- 刪除站點後選取回到有效站點；切換活動重設條件。
- 跨日時間顯示日期；歷史站點不算現行進度。
- 分享連結不帶 QR 憑證，重新開啟仍在看板。
- 同步失敗保留資料及成功時間，復原後解除警示。

## Task 1: 資料計算
- [x] 新增 tests/live-board.test.js，測試人數、最新打卡、搜尋篩選、無站點及公開分享連結；先執行確認失敗。
- [x] 新增 src/live-board.js：liveBoard(event, checkpointId, status, search) 與 liveBoardUrl(base, eventId)。計算只使用目前有效站點、有效時間。
- [x] 執行資料模組測試。

## Task 2: 看板與入口
- [x] 新增 src/LiveBoard.jsx 與 src/live-board.css，提供摘要、站點卡片、名單、狀態與搜尋。
- [x] 修改 src/main.jsx：新增導覽、URL 分頁初始化與同步、公開看板分享、成功同步時間與失敗狀態。
- [x] 更新 README 使用說明。

## Task 3: 驗證
- [x] npm test、npm run build。
- [x] Playwright 檢查手機與桌面、公開直達、站點與名單切換、搜尋、分享、同步與空資料。

## 驗證紀錄

- `npm test`：21 個測試通過；`npm run build`：成功。
- Playwright：320、390、768、1024、1440px 無水平溢出。
- 驗證公開直達、站點篩選、搜尋、分享連結、活動切換重設、無參加者、無站點與已結束活動。
- 使用模擬公開 API 驗證 15 秒同步、名單更新、條件與捲動位置保留、503 失敗保留最後成功更新時間及恢復提示；未連線正式資料庫。
- 初次自動同步捲動檢查混入手動按鈕自動捲動與名單縮短，修正驗證方式後，單純 15 秒更新前後 scrollY 皆為 500。
- 截圖存於 /tmp/rideline-board-desktop.png、/tmp/rideline-board-mobile.png、/tmp/rideline-board-mobile-list.png。
