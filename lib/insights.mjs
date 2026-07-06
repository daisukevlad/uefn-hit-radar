// インサイト生成: キーワード分析、トレンド抽出、自動メモ作成
import { listSnapshots, loadSnapshot } from './store.mjs';
import { buildTrends } from './trends.mjs';
import { genreInfo } from './knowledge.mjs';

// ストップワード集(大文字)
const STOPWORDS = new Set([
  'THE', 'AND', 'FOR', 'YOU', 'NEW', 'VS', 'RED', 'BLUE', 'GREEN', 'ALL', 'ONE', 'TWO',
  'MAP', 'GAME', 'WITH', 'NOT', 'ONLY', '100', '1V1', '2V2', 'FFA', 'TDM', 'PVP',
  'BOX', 'ZONE', 'WARS', 'FIGHT', 'FIGHTS', 'BATTLE', 'ROYALE', 'FORTNITE', 'OG',
  'PRO', 'BEST', 'SUPER', 'MEGA', 'ULTIMATE', 'WORLD', 'CUP', 'EDITION', 'SEASON', 'FREE'
]);

// テキストからキーワードを抽出(英数字とカタカナ/漢字シーケンス)
function tokenize(text) {
  const upper = text.toUpperCase();
  const tokens = [];

  // 英数字シーケンス (A-Z0-9 が3文字以上)
  const engRegex = /[A-Z0-9]{3,}/g;
  let match;
  while ((match = engRegex.exec(upper)) !== null) {
    tokens.push(match[0]);
  }

  // カタカナ・漢字シーケンス (3文字以上)
  const jpRegex = /[\u{3040}-\u{309F}\u{30A0}-\u{30FF}\u{4E00}-\u{9FFF}]{3,}/gu;
  while ((match = jpRegex.exec(text)) !== null) {
    tokens.push(match[0]);
  }

  return tokens;
}

// キーワード分析: 最新スナップショットから抽出
function analyzeKeywords(latestSnapshot) {
  if (!latestSnapshot || !latestSnapshot.probes) {
    return [];
  }

  // ccu >= 50 のプローブを取得
  const probes = Object.values(latestSnapshot.probes).filter(p => (p.ccu ?? 0) >= 50);

  // word → { maps: Set<islandCode>, totalCcu: number }
  const wordMap = new Map();

  for (const probe of probes) {
    const title = probe.t || '';
    const code = Object.entries(latestSnapshot.probes).find(([_, p]) => p === probe)?.[0];
    const ccu = probe.ccu ?? 0;

    const tokens = tokenize(title);
    const uniqueTokens = new Set(tokens);

    for (const word of uniqueTokens) {
      if (STOPWORDS.has(word)) continue;

      if (!wordMap.has(word)) {
        wordMap.set(word, { maps: new Set(), totalCcu: 0 });
      }
      const entry = wordMap.get(word);
      entry.maps.add(code);
      entry.totalCcu += ccu;
    }
  }

  // maps >= 2 でフィルタしてソート
  const keywords = [];
  for (const [word, entry] of wordMap.entries()) {
    if (entry.maps.size >= 2) {
      keywords.push({
        word,
        maps: entry.maps.size,
        ccu: entry.totalCcu
      });
    }
  }

  keywords.sort((a, b) => b.ccu - a.ccu);
  return keywords.slice(0, 8);
}

// movers分析: トレンドから上昇・下降ジャンル抽出
function analyzeMovers(trends) {
  if (trends.dates.length < 2) {
    return { up: [], down: [] };
  }

  const up = trends.tags
    .filter(t => t.change > 0)
    .sort((a, b) => b.change - a.change)
    .slice(0, 3)
    .map(t => ({ tag: t.tag, jp: t.jp, change: t.change }));

  const down = trends.tags
    .filter(t => t.change < 0)
    .sort((a, b) => a.change - b.change)
    .slice(0, 3)
    .map(t => ({ tag: t.tag, jp: t.jp, change: t.change }));

  return { up, down };
}

// topNew分析: 直近7日で最初に現れた新規ヒット
function analyzeTopNew(latestSnapshot, date) {
  if (!latestSnapshot || !latestSnapshot.probes) {
    return [];
  }

  const snapshotDate = new Date(date);
  const weekAgo = new Date(snapshotDate);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const probes = [];
  for (const [code, probe] of Object.entries(latestSnapshot.probes)) {
    const ccu = probe.ccu ?? 0;
    if (ccu < 50) continue;

    const firstSeen = probe.f ? new Date(probe.f) : null;
    if (!firstSeen) continue;

    // 7日以内に初出現かチェック
    if (firstSeen >= weekAgo && firstSeen <= snapshotDate) {
      probes.push({
        code,
        title: probe.t || '',
        ccu,
        firstSeen
      });
    }
  }

  probes.sort((a, b) => b.ccu - a.ccu);
  return probes.slice(0, 5).map(p => ({
    code: p.code,
    title: p.title,
    ccu: p.ccu
  }));
}

// メモ生成: 日本語の自動コメント
function composeMemo(date, keywords, moversUp, moversDown, topNew) {
  const memo = [];

  // キーワード
  if (keywords.length > 0) {
    const top4 = keywords.slice(0, 4).map(k => k.word).join('・');
    memo.push(`今週のヒット作に頻出するキーワード: ${top4}。このテーマ/ミームを自ジャンルに取り込むと波に乗れる可能性が高い。`);
  }

  // 上昇ジャンル
  if (moversUp.length > 0) {
    const upStr = moversUp
      .map(m => `${m.jp}(+${m.change})`)
      .join('、');
    memo.push(`需要が伸びているジャンル: ${upStr}。参入するなら伸び始めの今が有利。`);
  }

  // 下降ジャンル
  if (moversDown.length > 0) {
    const downStr = moversDown
      .map(m => `${m.jp}(${m.change})`)
      .join('、');
    memo.push(`需要が落ちているジャンル: ${downStr}。新規参入は避けるのが無難。`);
  }

  // 新規ヒット
  if (topNew.length > 0) {
    memo.push(`直近1週間で最も跳ねた新作は「${topNew[0].title}」(同時接続${topNew[0].ccu}人)。何が刺さったか実際に遊んで研究する価値あり。`);
  }

  // 末尾: 必ず追加
  memo.push(`※ このメモは毎日の実測データから自動生成されています(基準日: ${date || 'N/A'})。`);

  return memo;
}

// メイン: インサイト構築
export function buildInsights() {
  const snapshotFiles = listSnapshots();

  // スナップショット取得
  if (snapshotFiles.length === 0) {
    return {
      date: null,
      keywords: [],
      movers: { up: [], down: [] },
      topNew: [],
      memo: ['まだデータがありません。データ収集後に自動生成されます。']
    };
  }

  const latestFile = snapshotFiles[snapshotFiles.length - 1];
  const latestSnapshot = loadSnapshot(latestFile);
  const latestDate = latestFile.replace('.json', '');

  if (!latestSnapshot) {
    return {
      date: null,
      keywords: [],
      movers: { up: [], down: [] },
      topNew: [],
      memo: ['まだデータがありません。データ収集後に自動生成されます。']
    };
  }

  // 各分析を実行
  const keywords = analyzeKeywords(latestSnapshot);
  const trends = buildTrends();
  const movers = analyzeMovers(trends);
  const topNew = analyzeTopNew(latestSnapshot, latestDate);
  const memo = composeMemo(latestDate, keywords, movers.up, movers.down, topNew);

  return {
    date: latestDate,
    keywords,
    movers,
    topNew,
    memo
  };
}
