// Epic公式 Fortnite Ecosystem API クライアント(認証不要)
const BASE = 'https://api.fortnite.com/ecosystem/v1';

// 429/ネットワークエラー対応付きfetch
export async function fetchJSON(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.status === 429) {
        await sleep(2000 * (i + 1));
        continue;
      }
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      if (i === tries - 1) return null;
      await sleep(1000 * (i + 1));
    }
  }
  return null;
}

export const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// 島一覧を1ページ取得(新着順、最大1000件)
export async function listIslands(after, size = 1000) {
  const q = new URLSearchParams({ size: String(size) });
  if (after) q.set('after', after);
  return fetchJSON(`${BASE}/islands?${q}`);
}

// 島の全指標(日次)を取得
export async function islandMetrics(code) {
  return fetchJSON(`${BASE}/islands/${encodeURIComponent(code)}/metrics`);
}

// 直近の非null値を取り出すヘルパ
function lastValue(arr) {
  if (!Array.isArray(arr)) return null;
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i]?.value != null) return arr[i].value;
  }
  return null;
}

// 指標レスポンスを1行のサマリに変換
export function summarizeMetrics(m) {
  if (!m) return null;
  const ret = Array.isArray(m.retention) ? m.retention : [];
  let d1 = null, d7 = null;
  for (let i = ret.length - 1; i >= 0; i--) {
    if (d1 == null && ret[i]?.d1 != null) d1 = ret[i].d1;
    if (d7 == null && ret[i]?.d7 != null) d7 = ret[i].d7;
    if (d1 != null && d7 != null) break;
  }
  return {
    ccu: lastValue(m.peakCCU),
    plays: lastValue(m.plays),
    uniq: lastValue(m.uniquePlayers),
    avgMin: lastValue(m.averageMinutesPerPlayer),
    minutes: lastValue(m.minutesPlayed),
    favs: lastValue(m.favorites),
    recs: lastValue(m.recommendations),
    d1, d7,
  };
}

// 並列実行プール(進捗コールバック付き)
export async function pool(items, worker, concurrency = 16, onProgress) {
  const results = new Array(items.length);
  let idx = 0, done = 0;
  async function run() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await worker(items[i], i);
      done++;
      if (onProgress && done % 25 === 0) onProgress(done, items.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  if (onProgress) onProgress(items.length, items.length);
  return results;
}
