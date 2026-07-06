// 静的サイト生成: GitHub Pages(オンライン閲覧)用に分析結果を書き出す
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildReport } from './lib/analyze.mjs';
import { buildTrends } from './lib/trends.mjs';
import { buildInsights } from './lib/insights.mjs';
import { loadNews } from './lib/news.mjs';
import { buildGuidesPayload } from './lib/guides.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.join(ROOT, 'site');

fs.rmSync(SITE, { recursive: true, force: true });
fs.mkdirSync(path.join(SITE, 'api'), { recursive: true });

// 画面(オンラインでは自動で閲覧専用モードになる)
fs.copyFileSync(path.join(ROOT, 'public', 'index.html'), path.join(SITE, 'index.html'));
fs.copyFileSync(path.join(ROOT, 'public', 'guide.html'), path.join(SITE, 'guide.html'));

// APIレスポンスを静的JSONとして書き出し
const write = (name, obj) => fs.writeFileSync(path.join(SITE, 'api', name), JSON.stringify(obj));
write('report.json', buildReport());
write('trends.json', buildTrends());
write('insights.json', { insights: buildInsights(), news: loadNews() });
write('guides.json', buildGuidesPayload());
write('mymaps.json', []); // マイマップは個人データのためオンライン版には含めない

console.log('静的サイトを site/ に生成しました');
