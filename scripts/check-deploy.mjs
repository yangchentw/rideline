import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
const db = config.d1_databases?.find(binding => binding.binding === 'DB');
if (!config.account_id || !db?.database_id || /^00000000-/.test(db.database_id)) {
  console.error('尚未完成正式資料庫設定。請先建立 rideline-db，將真實 database_id 填入 wrangler.jsonc。詳見 docs/deployment.md。');
  process.exit(1);
}
if (config.vars?.ADMIN_KEY) {
  console.error('ADMIN_KEY 必須透過 wrangler secret put 設定，不可寫入公開設定檔。');
  process.exit(1);
}
console.log('正式帳號與 D1 設定檢查通過。');
