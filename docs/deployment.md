# Cloudflare 上線步驟

正式網站：[騎點 RIDELINE](https://rideline.yangchentw.workers.dev/)。2026-10-06 已確認頁面正常、`/api/health` 回傳共用模式、`/api/events` 正常回傳空清單。主辦者登入與跨手機打卡待建立活動後驗收。

- Worker 名稱：`rideline`
- 資料庫名稱：`rideline-db`
- 架構：單一 Cloudflare Worker 提供前端與 API，D1 保存活動、參加者及打卡時間。
- 帳號：`wrangler.jsonc` 已指定本機已驗證的 Cloudflare 帳號。
- 本專案已建立獨立 `rideline-db`，綁定 `DB`；D1 初始化與 `ADMIN_KEY` 設定已由主辦者完成。

## 第一次上線

在專案目錄依序執行：

```sh
npx wrangler whoami
npx wrangler d1 create rideline-db
```

目前正式網站已完成初次設定，沿用同一帳號更新時請直接使用下方「後續更新」指令，不必重新建立資料庫。若部署到其他帳號，先更新 `wrangler.jsonc` 的 `account_id`，再將新資料庫回傳的 `database_id` 填入設定。不要更改 `binding: DB`；若變更資料庫名稱，也要同步修改 `package.json` 的資料庫指令。

```sh
npm run db:remote
npx wrangler secret put ADMIN_KEY
```

由主辦者在終端機互動輸入一組高強度金鑰，並存入自己的密碼管理工具。不要放進聊天、原始碼或 `wrangler.jsonc`。Wrangler 可能提示建立尚不存在的 Worker，以儲存金鑰。

```sh
npm run deploy
```

此指令依序檢查設定、驗證登入、跑測試、建置前端並發布 Worker。命令成功後提供正式 `https://rideline.<帳號子網域>.workers.dev` 網址。若帳號尚未設定 Workers 子網域，按 Cloudflare 提示完成設定。此流程使用 workers.dev，自訂網域可於後續綁定。

正式環境預設是空資料庫；本機示範活動與測試騎士不會自動上傳。部署完成後建立真實活動，上傳 GPX 並確認打卡點，再產生正式網址的 QR Code。

## 上線驗收

1. 開啟正式網址，確認顯示「多人共用模式」。
2. 主辦者登入，建立活動與 Google Maps 打卡點；下載各點 QR Code。
3. 手機 A 加入活動；手機 B 開啟同一活動，最多等待 15 秒，確認名單同步。
4. 手機 A 掃描正式 QR Code 並確認抵達；手機 B 確認人數、未到名單與總覽時間更新。
5. 重複掃描同一點，確認保留首次抵達時間；匯出 CSV 確認資料。

請沿途使用同一個手機瀏覽器。分享或列印 QR 前先確定正式網域，避免之後換網域需要重印。

## 後續更新

活動金鑰功能新增 `event_keys` 資料表，第一次更新此版本前先執行 `npm run db:remote`。指令僅補齊缺少的資料表與索引，不清空既有資料；既有活動可由主辦者在「打卡點管理」設定活動金鑰。

```sh
npm run deploy:check
npm run deploy
```

`deploy:check` 僅做測試、建置與打包，不發布、不建立遠端資源；占位資料庫 ID 可供本機打包驗證。`deploy` 與 `db:remote` 會阻止使用占位 ID。

既有資料保存在 D1，更新 Worker 不會清空資料。改資料表前先匯出備份：

```sh
npx wrangler d1 export rideline-db --remote --output .wrangler/rideline-backup.sql
```

備份放在已忽略的 `.wrangler` 目錄，另行保管。Worker 版本回退不會回退 D1 資料。
