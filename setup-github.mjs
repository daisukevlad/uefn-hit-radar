// GitHub連携セットアップ: config.json に データ取得元リポジトリを書き込む
import { load, save } from './lib/store.mjs';

const repo = process.argv[2];
if (!repo || !repo.includes('/')) {
  console.error('使い方: node setup-github.mjs <owner/repo>');
  process.exit(1);
}
const cfg = load('config.json', {});
cfg.dataRepo = repo;
save('config.json', cfg);
console.log(`OK: クラウド収集元を ${repo} に設定しました`);
