// マイマップ管理: 登録・削除・レポート生成
import { load, save } from './store.mjs';
import { fetchJSON, pool } from './api.mjs';

const BASE = 'https://api.fortnite.com/ecosystem/v1';

// マイマップのコード一覧を取得
export function getMyMaps() {
  const data = load('mymaps.json', { codes: [] });
  return Array.isArray(data.codes) ? data.codes : [];
}

// マップを追加
export async function addMyMap(code) {
  const trimmed = String(code).trim();

  // フォーマット検証: 1234-5678-9012
  if (!/^\d{4}-\d{4}-\d{4}$/.test(trimmed)) {
    return {
      ok: false,
      error: 'コードの形式が正しくありません(例: 1234-5678-9012)',
    };
  }

  // メタデータ取得
  const url = `${BASE}/islands/${encodeURIComponent(trimmed)}`;
  const metadata = await fetchJSON(url);

  if (!metadata) {
    return {
      ok: false,
      error: 'そのコードのマップが見つかりません(公開＋Discoverable設定が必要です)',
    };
  }

  // mymaps.jsonに追加(重複チェック)
  const data = load('mymaps.json', { codes: [] });
  if (!Array.isArray(data.codes)) data.codes = [];

  if (!data.codes.includes(trimmed)) {
    data.codes.push(trimmed);
    save('mymaps.json', data);
  }

  return {
    ok: true,
    title: metadata.title,
  };
}

// マップを削除
export function removeMyMap(code) {
  const trimmed = String(code).trim();
  const data = load('mymaps.json', { codes: [] });
  if (!Array.isArray(data.codes)) data.codes = [];

  data.codes = data.codes.filter((c) => c !== trimmed);
  save('mymaps.json', data);

  return { ok: true };
}

// 日時を日付文字列に変換(ISO timestamp → YYYY-MM-DD)
function dateFromTimestamp(ts) {
  if (!ts) return null;
  return new Date(ts).toISOString().slice(0, 10);
}

// 指標にマッチするアドバイスを生成
function generateAdvice(d1, avgMin, hasAnyData) {
  // (a) データがない
  if (!hasAnyData) {
    return 'まだ実測データがありません。公開設定・Discoverable設定・1日5人以上のプレイが必要です。フレンドと数回遊んでみてください。';
  }

  // (b) d1 < 0.15
  if (d1 != null && d1 < 0.15) {
    return '翌日継続率が低め(15%未満)です。初回プレイの最初の60秒で「面白い」と思わせる導入と、また来たくなる報酬(デイリー要素・収集要素)を追加しましょう。';
  }

  // (c) avgMin < 8
  if (avgMin != null && avgMin < 8) {
    return '平均プレイ時間が短めです。1セッションの目標(クリア目標・ラウンド制)を長くする工夫や、コンテンツ追加を検討しましょう。';
  }

  // (d) d1 >= 0.3
  if (d1 != null && d1 >= 0.3) {
    return '継続率が優秀です!この調子で週1回の更新(新ステージ・イベント)を続ければDiscover露出が伸びていきます。';
  }

  // (e) その他
  return '数値は平均的です。継続率(翌日また遊びたくなる仕掛け)を最優先で改善するとDiscover露出と収益が伸びます。';
}

// マイマップレポート生成
export async function buildMyMapsReport() {
  const codes = getMyMaps();

  if (codes.length === 0) {
    return [];
  }

  // 7日前〜現在の範囲を指定(APIの履歴上限は7日)
  const now = new Date();
  const fromStr = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const toStr = now.toISOString();

  // 各コードを並列処理
  const results = await pool(
    codes,
    async (code) => {
      // メタデータ取得
      const metaUrl = `${BASE}/islands/${encodeURIComponent(code)}`;
      const metadata = await fetchJSON(metaUrl);

      if (!metadata) {
        return {
          code,
          title: '',
          tags: [],
          found: false,
          days: [],
          latest: { ccu: null, avgMin: null, d1: null },
          advice: 'マップが見つかりません。',
        };
      }

      // 指標取得(7日分)
      const q = new URLSearchParams({ from: fromStr, to: toStr });
      const metrics = await fetchJSON(`${BASE}/islands/${encodeURIComponent(code)}/metrics?${q}`);

      // タイムスタンプごとに日データを構築
      const dayMap = new Map();

      if (metrics && Array.isArray(metrics.peakCCU)) {
        // peakCCUをスパインとして使用
        for (const item of metrics.peakCCU) {
          if (item?.timestamp) {
            const dateStr = dateFromTimestamp(item.timestamp);
            if (!dayMap.has(dateStr)) {
              dayMap.set(dateStr, { date: dateStr });
            }
            dayMap.get(dateStr).ccu = item.value;
          }
        }
      }

      // 他の指標をマージ
      if (metrics) {
        const metricArrays = {
          plays: metrics.plays,
          uniq: metrics.uniquePlayers,
          avgMin: metrics.averageMinutesPerPlayer,
          minutes: metrics.minutesPlayed,
          favs: metrics.favorites,
        };

        for (const [key, arr] of Object.entries(metricArrays)) {
          if (Array.isArray(arr)) {
            for (const item of arr) {
              if (item?.timestamp) {
                const dateStr = dateFromTimestamp(item.timestamp);
                if (!dayMap.has(dateStr)) {
                  dayMap.set(dateStr, { date: dateStr });
                }
                dayMap.get(dateStr)[key] = item.value;
              }
            }
          }
        }

        // retentionをマージ
        if (Array.isArray(metrics.retention)) {
          for (const item of metrics.retention) {
            if (item?.timestamp) {
              const dateStr = dateFromTimestamp(item.timestamp);
              if (!dayMap.has(dateStr)) {
                dayMap.set(dateStr, { date: dateStr });
              }
              if (item.d1 != null) dayMap.get(dateStr).d1 = item.d1;
              if (item.d7 != null) dayMap.get(dateStr).d7 = item.d7;
            }
          }
        }
      }

      // 日付順にソート
      const days = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));

      // latest: 最新の非null値を抽出
      let latestCcu = null;
      let latestAvgMin = null;
      let latestD1 = null;

      for (let i = days.length - 1; i >= 0; i--) {
        if (latestCcu == null) latestCcu = days[i].ccu;
        if (latestAvgMin == null) latestAvgMin = days[i].avgMin;
        if (latestD1 == null) latestD1 = days[i].d1;
        if (latestCcu != null && latestAvgMin != null && latestD1 != null) break;
      }

      // データがあるかチェック
      const hasAnyData = days.some(
        (d) => d.ccu != null || d.plays != null || d.uniq != null ||
               d.avgMin != null || d.minutes != null || d.d1 != null
      );

      // アドバイス生成
      const advice = generateAdvice(latestD1, latestAvgMin, hasAnyData);

      return {
        code,
        title: metadata.title || '',
        tags: Array.isArray(metadata.tags) ? metadata.tags : [],
        found: true,
        days,
        latest: { ccu: latestCcu, avgMin: latestAvgMin, d1: latestD1 },
        advice,
      };
    },
    4, // concurrency = 4
    null
  );

  return results;
}
