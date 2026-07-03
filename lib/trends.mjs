// トレンド分析: 複数スナップショットのタグ需要推移を計算
import { listSnapshots, loadSnapshot } from './store.mjs';
import { GENERIC_TAGS, genreInfo } from './knowledge.mjs';

// スナップショット全件読み込み、タグ集計、トレンド計算
export function buildTrends() {
  // スナップショット一覧取得(昇順ソート済み)
  const files = listSnapshots();

  // 最大30件に制限
  const snapshotFiles = files.slice(-30);

  // スナップショットを日付順で読み込む
  const snapshots = [];
  for (const file of snapshotFiles) {
    const snap = loadSnapshot(file);
    // null スナップショットをスキップ
    if (snap === null) continue;
    snapshots.push(snap);
  }

  // スナップショットがない場合は空結果を返す
  if (snapshots.length === 0) {
    return {
      dates: [],
      tags: [],
      totalDemand: []
    };
  }

  // 日付配列を構築(ascending)
  const dates = snapshots.map(s => s.date);

  // タグごとに需要を集計: Map<tag, [demand per date]>
  const tagDemandMap = new Map();
  // タグごとに hitCount を集計: Map<tag, [hitCount per date]>
  const tagHitCountMap = new Map();
  // 各日付の totalDemand を集計
  const totalDemands = [];

  snapshots.forEach((snap, dateIndex) => {
    const probes = snap.probes || {};
    let dateTotal = 0;
    const seenIslands = new Set();

    for (const [islandCode, probe] of Object.entries(probes)) {
      // 島ごとに ccu を1回だけカウント(タグで重複しないように)
      if (!seenIslands.has(islandCode)) {
        const ccu = probe.ccu ?? 0;
        dateTotal += ccu;
        seenIslands.add(islandCode);
      }

      // タグを処理(空白区切り文字列または配列)
      const ccu = probe.ccu ?? 0;
      let tags = probe.g || [];
      if (typeof tags === 'string') {
        tags = tags.split(/\s+/).filter(t => t.length > 0);
      }

      for (const tag of tags) {
        // GENERIC_TAGS に含まれるタグはスキップ
        if (GENERIC_TAGS.has(tag)) continue;

        // 需要を集計
        if (!tagDemandMap.has(tag)) {
          tagDemandMap.set(tag, new Array(snapshots.length).fill(0));
        }
        tagDemandMap.get(tag)[dateIndex] += ccu;

        // hitCount を集計(ccu >= 30)
        if (!tagHitCountMap.has(tag)) {
          tagHitCountMap.set(tag, new Array(snapshots.length).fill(0));
        }
        if (ccu >= 30) {
          tagHitCountMap.get(tag)[dateIndex] += 1;
        }
      }
    }

    totalDemands.push(dateTotal);
  });

  // タグ配列を構築
  const tagsArray = [];
  for (const [tag, demand] of tagDemandMap.entries()) {
    const hitCount = tagHitCountMap.get(tag);
    const lastDemand = demand[demand.length - 1];

    // 最新日付での需要でフィルタ・ソート対象にする
    if (lastDemand === 0) continue;

    const jp = genreInfo(tag).jp;
    const change = snapshots.length >= 2 ? demand[demand.length - 1] - demand[0] : null;

    tagsArray.push({
      tag,
      jp,
      demand,
      hitCount,
      change
    });
  }

  // 最新日付の需要でソート(降順)
  tagsArray.sort((a, b) => b.demand[b.demand.length - 1] - a.demand[a.demand.length - 1]);

  // 上位20件を取得
  const top20 = tagsArray.slice(0, 20);

  return {
    dates,
    tags: top20,
    totalDemand: totalDemands
  };
}
