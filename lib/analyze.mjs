// 分析: ジャンル機会スコア・急上昇マップ・推奨レポートの生成
import { load, listSnapshots, loadSnapshot } from './store.mjs';
import { GENERIC_TAGS, genreInfo, PAYOUT_PER_HOUR_USD, USD_JPY } from './knowledge.mjs';

const median = (arr) => {
  const a = arr.filter((x) => x != null).sort((x, y) => x - y);
  if (!a.length) return null;
  return a[Math.floor(a.length / 2)];
};

export function buildReport() {
  const catalog = load('catalog.json', { islands: {} });
  const snaps = listSnapshots();
  if (!snaps.length) return { ready: false };
  const latest = loadSnapshot(snaps.at(-1));
  const prevSnap = snaps.length > 1 ? loadSnapshot(snaps.at(-2)) : null;
  const watchlist = load('watchlist.json', { islands: {} });
  const probes = latest.probes || {};
  const date = latest.date;

  // --- タグ別統計 ---
  // 供給: 新着5000件中のタグ出現数(=直近の競合参入量)
  const NEW_WINDOW = 5000;
  const supply = {};
  let newestCount = 0;
  for (const info of Object.values(catalog.islands)) {
    if (info.o < NEW_WINDOW) {
      newestCount++;
      for (const tag of info.g) supply[tag] = (supply[tag] || 0) + 1;
    }
  }

  // 需要: プローブ済みマップの実測値をタグ別に集計
  const tagStats = {};
  for (const [code, m] of Object.entries(probes)) {
    for (const tag of m.g || []) {
      const s = (tagStats[tag] ||= { demand: 0, hits: 0, sample: 0, avgMins: [], d1s: [], minutes: [], refs: [] });
      s.sample++;
      const ccu = m.ccu || 0;
      s.demand += ccu;
      if (ccu >= 30) {
        s.hits++;
        s.avgMins.push(m.avgMin);
        s.d1s.push(m.d1);
        s.minutes.push(m.minutes);
        s.refs.push({ code, title: m.t, ccu, avgMin: m.avgMin, d1: m.d1 });
      }
    }
  }

  // --- ジャンル機会スコア(厚利少売: 需要の深さ ÷ 競合 × 個人適性) ---
  const genres = [];
  for (const [tag, s] of Object.entries(tagStats)) {
    if (GENERIC_TAGS.has(tag)) continue;
    if (s.sample < 3) continue;
    const info = genreInfo(tag);
    const sup = supply[tag] || 0;
    const avgMin = median(s.avgMins) ?? 10;
    const d1 = median(s.d1s) ?? 0.1;
    const engagement = Math.min(avgMin / 20, 3);          // 滞在の深さ(20分=1.0)
    const rawScore = Math.pow(s.demand + 1, 0.55)          // 需要(逓減)
      * engagement                                          // 厚利: 長く遊ばれるか
      * (0.5 + Math.min(d1, 0.8))                           // 継続率(Discover露出に直結)
      * info.soloFit                                        // 個人開発適性
      / Math.pow(sup + 5, 0.6);                             // 競合(新規供給)
    const medMinutes = median(s.minutes);
    const monthlyUSD = medMinutes ? (medMinutes / 60) * PAYOUT_PER_HOUR_USD * 30 : null;
    genres.push({
      tag, jp: info.jp, hint: info.hint,
      difficulty: info.difficulty, days: info.days, soloFit: info.soloFit,
      demand: s.demand, supply: sup, sample: s.sample, hits: s.hits,
      hitRate: s.sample ? s.hits / s.sample : 0,
      avgMin, d1,
      monthlyJPY: monthlyUSD ? Math.round(monthlyUSD * USD_JPY) : null,
      rawScore,
      refs: s.refs.sort((a, b) => b.ccu - a.ccu).slice(0, 3),
    });
  }
  const maxScore = Math.max(...genres.map((g) => g.rawScore), 1e-9);
  for (const g of genres) g.score = Math.round((g.rawScore / maxScore) * 100);
  genres.sort((a, b) => b.score - a.score);

  // --- 急上昇マップ(最近登場して既に人が付いているもの) ---
  const rising = [];
  for (const [code, m] of Object.entries(probes)) {
    const info = catalog.islands[code];
    if (!info || (m.ccu || 0) < 20) continue;
    if (info.o > 10000) continue; // 新着1万件以内のみ
    let growth = null;
    const prev = prevSnap?.probes?.[code];
    if (prev && prev.ccu != null && m.ccu != null) growth = m.ccu - prev.ccu;
    rising.push({ code, title: m.t, tags: m.g, ccu: m.ccu, avgMin: m.avgMin, d1: m.d1, firstSeen: info.f, growth });
  }
  rising.sort((a, b) => (b.ccu || 0) - (a.ccu || 0));

  // --- 定番トップマップ(定点観測リスト上位) ---
  const top = [];
  for (const [code, w] of Object.entries(watchlist.islands)) {
    const todayH = w.h[date];
    if (!todayH || todayH.ccu == null) continue;
    const dates = Object.keys(w.h).sort();
    const oldDate = dates.find((d) => d < date);
    const trend = oldDate && w.h[oldDate].ccu != null ? todayH.ccu - w.h[oldDate].ccu : null;
    top.push({ code, title: w.t, tags: w.g, ccu: todayH.ccu, avgMin: todayH.avgMin, d1: todayH.d1, trend });
  }
  top.sort((a, b) => (b.ccu || 0) - (a.ccu || 0));

  return {
    ready: true,
    date,
    snapshotCount: snaps.length,
    catalogSize: Object.keys(catalog.islands).length,
    probedCount: Object.keys(probes).length,
    newestWindow: Math.min(NEW_WINDOW, newestCount),
    recommendations: genres.slice(0, 5),
    genres,
    rising: rising.slice(0, 40),
    top: top.slice(0, 40),
  };
}
