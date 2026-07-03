// 日次レポートのMarkdown出力
// 構造: { ready, date, catalogSize, probedCount, recommendations, rising, top }
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './store.mjs';

/**
 * レポートをMarkdownファイルで出力
 * @param {Object} report - { ready, date, catalogSize, probedCount, recommendations:[], rising:[], top:[] }
 * @returns {string|null} ファイルパス (readyがfalseならnull)
 */
export function writeDailyReport(report) {
  // readyがfalseまたは未定義の場合は何も書き込まない
  if (!report.ready) {
    return null;
  }

  const reportsDir = path.join(DATA_DIR, 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });

  const filePath = path.join(reportsDir, `${report.date}.md`);

  // --- Markdown コンテンツ生成 ---
  let md = '';

  // H1 タイトル
  md += `# UEFNヒットレーダー 日次レポート ${report.date}\n\n`;

  // 概要行
  md += `監視カタログ数 ${report.catalogSize || '—'} / 実測マップ数 ${report.probedCount || '—'}\n\n`;

  // H2: 今日の結論 TOP5
  md += `## 今日の結論 TOP5\n\n`;
  if (report.recommendations && report.recommendations.length > 0) {
    report.recommendations.forEach((rec, idx) => {
      const jp = rec.jp || '—';
      const score = rec.score ?? '—';
      const demand = rec.demand ?? '—';
      const supply = rec.supply ?? '—';
      const avgMin = rec.avgMin ?? '—';
      const d1Pct = rec.d1 != null ? Math.round(rec.d1 * 100) : '—';
      const days = rec.days ?? '—';
      const hint = rec.hint || '';
      const monthlyStr = rec.monthlyJPY ? ` / ヒット時の月収目安 約${rec.monthlyJPY}円` : '';

      // 参考マップ (最大3件)
      let refsStr = '';
      if (rec.refs && rec.refs.length > 0) {
        const refLines = rec.refs.slice(0, 3).map(
          (r) => `${r.title} \`${r.code}\` (${r.ccu}人)`
        );
        refsStr = ` / 参考マップ: ${refLines.join(' / ')}`;
      }

      md += `${idx + 1}. **${jp}**(スコア${score}点)— 需要CCU ${demand} / 新規競合 ${supply}本 / 平均プレイ${avgMin}分 / 翌日継続率 ${d1Pct}% / 想定制作期間 約${days}日。${hint ? ` ${hint}` : ''}${refsStr}${monthlyStr}\n`;
    });
  }
  md += '\n';

  // H2: 急上昇マップ TOP10
  md += `## 急上昇マップ TOP10\n\n`;
  if (report.rising && report.rising.length > 0) {
    // テーブルヘッダ
    md += `| マップ名 | コード | 同時接続 | 平均プレイ | 継続率 |\n`;
    md += `|---|---|---|---|---|\n`;

    report.rising.slice(0, 10).forEach((item) => {
      const title = item.title || '—';
      const code = item.code || '—';
      const ccu = item.ccu ?? '—';
      const avgMin = item.avgMin ?? '—';
      const d1Pct = item.d1 != null ? `${Math.round(item.d1 * 100)}%` : '—';

      md += `| ${title} | \`${code}\` | ${ccu}人 | ${avgMin}分 | ${d1Pct} |\n`;
    });
  }
  md += '\n';

  // Footer: 注意書き
  md += `**注意:** 収益目安は概算です。\n`;

  // ファイルに書き込み
  fs.writeFileSync(filePath, md, 'utf8');

  return filePath;
}
