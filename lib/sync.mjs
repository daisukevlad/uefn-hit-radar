// GitHubリポジトリ(クラウド収集の結果)からデータを取り込む
import fs from 'node:fs';
import path from 'node:path';
import { SNAP_DIR, load, save } from './store.mjs';
import { fetchJSON } from './api.mjs';

// config.json の dataRepo ("owner/repo") が設定されていれば、
// クラウド側で収集されたスナップショット・カタログを取り込む
export async function syncFromGitHub() {
  const cfg = load('config.json', {});
  const repo = cfg.dataRepo;
  if (!repo) return { synced: false, reason: 'not-configured', added: 0 };
  const branch = cfg.dataBranch || 'main';

  // スナップショット一覧を取得し、ローカルに無い日付だけダウンロード
  const listing = await fetchJSON(`https://api.github.com/repos/${repo}/contents/data/snapshots?ref=${branch}`);
  if (!Array.isArray(listing)) return { synced: false, reason: 'repo-unreachable', added: 0 };
  let added = 0;
  for (const f of listing) {
    if (!f.name?.endsWith('.json') || !f.download_url) continue;
    const local = path.join(SNAP_DIR, f.name);
    if (fs.existsSync(local)) continue;
    try {
      const r = await fetch(f.download_url);
      if (!r.ok) continue;
      fs.writeFileSync(local, await r.text());
      added++;
    } catch { /* 1件の失敗は無視 */ }
  }

  // カタログ・定点観測リストは、リモートの方が新しければ置き換える
  const rawBase = `https://raw.githubusercontent.com/${repo}/${branch}/data`;
  const localScan = load('catalog.json', {}).lastScan || '';
  const remoteCat = await fetchJSON(`${rawBase}/catalog.json`);
  if (remoteCat?.lastScan && remoteCat.lastScan >= localScan) {
    save('catalog.json', remoteCat);
    const remoteWatch = await fetchJSON(`${rawBase}/watchlist.json`);
    if (remoteWatch?.islands) save('watchlist.json', remoteWatch);
  }
  return { synced: true, added };
}
