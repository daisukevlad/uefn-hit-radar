// データ収集: カタログスキャン + 指標プローブ + 定点観測リスト更新
import { listIslands, islandMetrics, islandMeta, summarizeMetrics, pool } from './api.mjs';
import { load, save, saveSnapshot, today } from './store.mjs';
import { isFirstParty } from './knowledge.mjs';
import { fetchNews } from './news.mjs';

const DEFAULTS = {
  maxPages: 30,        // 新着スキャンページ数(1ページ=1000島)
  newestProbe: 1200,   // 新着のうち指標を取る数
  perTagSample: 30,    // タグごとのサンプル数
  topTags: 30,         // サンプル対象の上位タグ数
  watchThreshold: 30,  // この同時接続数以上で定点観測入り
  watchMax: 1000,      // 定点観測リスト上限
  concurrency: 16,
};

// 有名マップのシード(古い可能性あり。無効なら自動で除外される)
const SEED_CODES = [
  '4590-4493-7113', '8064-7152-2934', '6531-4403-0726', '9683-4582-8184',
  '8560-5809-8123', '2744-1943-2470', '7620-0771-9529', '1264-4906-0219',
  '5731-8386-7268', '3729-0643-9775', '8442-4499-9713', '2091-7797-6483',
];

export async function collect(status, overrides = {}) {
  const cfg = { ...DEFAULTS, ...load('config.json', {}), ...overrides };
  const catalog = load('catalog.json', { islands: {} });
  const watchlist = load('watchlist.json', { islands: {} });
  const date = today();

  // --- 1. カタログスキャン(新着順) ---
  status.phase = 'カタログスキャン中(新着マップ一覧を取得)';
  status.done = 0;
  status.total = cfg.maxPages;
  let cursor = null;
  let order = 0;
  const seenThisScan = new Set();
  for (let p = 0; p < cfg.maxPages; p++) {
    const page = await listIslands(cursor);
    if (!page || !Array.isArray(page.data) || page.data.length === 0) break;
    for (const it of page.data) {
      if (isFirstParty(it)) { order++; continue; }
      seenThisScan.add(it.code);
      const prev = catalog.islands[it.code];
      catalog.islands[it.code] = {
        t: it.title, c: it.creatorCode || '', g: it.tags || [],
        f: prev?.f || date,       // 初回発見日(≒リリース時期の近似)
        o: order,                 // 新着順の通し番号(小さいほど新しい)
      };
      order++;
    }
    cursor = page.meta?.page?.nextCursor;
    status.done = p + 1;
    if (!cursor) break;
  }
  catalog.lastScan = date;
  catalog.scanCount = seenThisScan.size;
  save('catalog.json', catalog);

  // --- 2. プローブ対象の選定 ---
  status.phase = '調査対象マップを選定中';
  const targets = new Set();

  // 2a. 新着上位
  const byOrder = Object.entries(catalog.islands).sort((a, b) => a[1].o - b[1].o);
  for (const [code] of byOrder.slice(0, cfg.newestProbe)) targets.add(code);

  // 2b. タグごとのランダムサンプル
  const tagMap = new Map();
  for (const [code, info] of byOrder) {
    for (const tag of info.g) {
      if (!tagMap.has(tag)) tagMap.set(tag, []);
      tagMap.get(tag).push(code);
    }
  }
  const topTags = [...tagMap.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, cfg.topTags);
  for (const [, codes] of topTags) {
    for (let i = 0; i < cfg.perTagSample && codes.length; i++) {
      targets.add(codes[Math.floor(Math.random() * codes.length)]);
    }
  }

  // 2c. 定点観測リスト + シード
  for (const code of Object.keys(watchlist.islands)) targets.add(code);
  for (const code of SEED_CODES) targets.add(code);

  // --- 3. 指標プローブ ---
  const list = [...targets];
  status.phase = `プレイ実績を取得中(${list.length}マップ)`;
  status.done = 0;
  status.total = list.length;
  const probes = {};
  await pool(list, async (code) => {
    const m = summarizeMetrics(await islandMetrics(code));
    if (m && (m.ccu != null || m.plays != null || m.uniq != null)) {
      const info = catalog.islands[code] || watchlist.islands[code] || {};
      probes[code] = { ...m, t: info.t || '', g: info.g || [], f: info.f || null };
    }
  }, cfg.concurrency, (done, total) => { status.done = done; status.total = total; });

  // --- 4. 定点観測リスト更新 ---
  status.phase = '定点観測リストを更新中';
  for (const [code, m] of Object.entries(probes)) {
    const active = (m.ccu || 0) >= cfg.watchThreshold;
    let w = watchlist.islands[code];
    if (!w && active) {
      const info = catalog.islands[code] || {};
      w = watchlist.islands[code] = { t: m.t || info.t || code, g: m.g || info.g || [], f: info.f || date, h: {} };
    }
    if (w) {
      w.t = m.t || w.t;
      if (m.g && m.g.length) w.g = m.g;
      w.h[date] = { ccu: m.ccu, uniq: m.uniq, avgMin: m.avgMin, minutes: m.minutes, d1: m.d1, d7: m.d7, favs: m.favs };
    }
  }
  // タイトル未解決(空またはコードのまま)のマップはメタデータAPIで補完
  const untitled = Object.entries(watchlist.islands).filter(([code, w]) => !w.t || w.t === code);
  await pool(untitled, async ([code, w]) => {
    const meta = await islandMeta(code);
    if (meta?.title) {
      w.t = meta.title;
      if (Array.isArray(meta.tags) && meta.tags.length) w.g = meta.tags;
      if (probes[code]) { probes[code].t = meta.title; probes[code].g = w.g; }
    }
  }, 8);

  // 上限超過時は直近CCUの低い順に削除
  const entries = Object.entries(watchlist.islands);
  if (entries.length > cfg.watchMax) {
    entries
      .map(([code, w]) => [code, w.h[date]?.ccu ?? 0])
      .sort((a, b) => a[1] - b[1])
      .slice(0, entries.length - cfg.watchMax)
      .forEach(([code]) => delete watchlist.islands[code]);
  }
  save('watchlist.json', watchlist);

  // --- 5. スナップショット保存 ---
  saveSnapshot(date, { date, probes });

  // --- 6. SNS・ニュースの注目情報を取得(失敗しても収集全体は成功扱い) ---
  status.phase = 'SNS・ニュースの注目情報を取得中';
  try { await fetchNews(); } catch { /* 取得失敗は無視 */ }

  status.phase = '完了';
  return { date, probed: list.length, found: Object.keys(probes).length, catalogSize: Object.keys(catalog.islands).length };
}
