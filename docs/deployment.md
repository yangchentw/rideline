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

## 1.1 升級

推送 1.1 觸發自動部署前，先執行 `npm run db:remote`，建立 `event_endings` 表。此表獨立記錄活動結束時間，保留原活動、參加者與打卡資料；舊版本部署可忽略此表。新版結束活動需要重新輸入 `ADMIN_KEY`，並於後端阻擋已結束活動的加入及打卡。

## 1.3 升級

先執行 `npm run db:remote` 新增 organizers、organizer_sessions、event_owners 與索引，再推送新版。原 ADMIN_KEY 改為管理者登入使用，不需重新設定；舊活動沒有 owner 紀錄時仍歸管理者管理。管理者可新增各主辦者，將舊活動指派給本人。密碼只儲存雜湊，登入有效 8 小時，停用或重設密碼會撤銷登入。資料表均使用 CREATE TABLE IF NOT EXISTS，不清空活動或打卡紀錄。

## 1.4.0 發布紀錄（2026-10-27）

- 新增公開活動即時看板，升級套件、網站頁尾與圖表匯出版號。
- 使用 `npm run deploy` 發布既有 `rideline` Worker，沒有執行 D1 資料表變更。
- Worker 版本：`1d8c7b75-cab8-4e3f-bc44-da48c0855d93`。
- 發布前 Worker 版本：`0fc2f52f-7437-43e7-971d-a5e4221b3041`。若公開看板或既有公開 API 無法載入，可使用 `npx wrangler rollback 0fc2f52f-7437-43e7-971d-a5e4221b3041` 回退應用程式；不回退 D1。
- 發布驗證：21 項測試通過、Vite 正式建置成功；正式 `/api/health` 回傳 HTTP 200、shared、未登入身份，公開看板、站點篩選、分享連結及手機排版正常，沒有 JavaScript 執行錯誤。

## 1.5.0 發布紀錄（2026-11-02）

- 建立活動加入防誤關確認、當下台灣時間預設值及出發時間須晚於現在 8 小時的前後端驗證。
- 新建活動第一站使用統一起始時間並免打卡，名單、看板、圖表與 CSV 同步呈現；既有活動採原有紀錄。
- 使用 `npm run deploy` 發布，沒有資料表變更或資料移轉。
- Worker 版本：`d246532e-6fe5-4867-b46d-afa6eabcd0dd`。
- 發布前版本：`2a93f060-3632-4cb5-a289-344cf1a71148`。若關鍵頁面或 API 無法載入，可用 `npx wrangler rollback 2a93f060-3632-4cb5-a289-344cf1a71148` 回退應用程式；不回退 D1。回退期間請暫停新增含統一起點的活動，避免舊版誤將起點視為一般打卡點。
- 驗證：31 項測試與正式建置通過。本機瀏覽器驗證防誤關、跨日時間與 8 小時限制、建立活動、一般及晚加入參加者的相同起始時間、出發前後統計及手機排版。
- 正式站驗證：頁尾 v1.5、`/api/health` HTTP 200/shared、公開看板與活動讀取正常，新版前端資源已生效，手機無水平溢出、無 JavaScript 執行錯誤；未建立正式測試活動。

## 1.5.1 發布紀錄（2026-11-02）

- 修正 `/api/maps/resolve` 在入口解析 JSON 後，再次讀取 request body 造成的錯誤，改用已解析的 `body.url`。
- 完整網址、短網址、未登入權限與不支援網址的 API 回歸測試通過；共 32 項測試通過，正式建置成功。
- 使用截圖中的 Google Maps 短網址，以本機 Worker 完整請求流程及真實 Google 轉址驗證 HTTP 200，解析為「全家便利商店 金山金美店」，座標 25.2239421, 121.635734。
- 已部署 Worker 版本 `85ac7dd4-2110-4d36-962b-4d836476d719`。正式站頁尾 v1.5.1，健康檢查 HTTP 200/shared；未修改資料表或活動資料。

## 1.5.2 發布紀錄（2026-11-02）

- 起點名稱可於建立活動時及打卡點管理中編輯並儲存。起點身份、統一起始時間、免打卡、路線起點座標與不可刪除／重排規則保留。
- 34 項測試與正式建置通過；本機瀏覽器已驗證建立時自訂名稱、管理頁改名、重新載入保留名稱，以及起點仍無 QR Code。
- 已部署 Worker 版本 `0591b78e-b972-4acc-95bb-dafcc705dc79`。正式頁尾 v1.5.2，公開健康檢查 HTTP 200/shared，沒有資料表變更或修改正式活動。
