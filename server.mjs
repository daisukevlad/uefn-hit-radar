// UEFNヒットレーダー サーバー
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collect } from './lib/collect.mjs';
import { buildReport } from './lib/analyze.mjs';
import { listSnapshots } from './lib/store.mjs';
import { buildTrends } from './lib/trends.mjs';
import { addMyMap, removeMyMap, buildMyMapsReport } from './lib/mymaps.mjs';
import { writeDailyReport } from './lib/report-md.mjs';
import { syncFromGitHub } from './lib/sync.mjs';
import { GUIDES, DEFAULT_GUIDE, COMMON_GUIDE, getGuide } from './lib/guides.mjs';
import { genreInfo } from './lib/knowledge.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3199;

const status = { running: false, phase: '', done: 0, total: 0, lastResult: null, error: null };

async function runCollect() {
  if (status.running) return;
  status.running = true;
  status.error = null;
  try {
    // まずクラウド(GitHub Actions)の収集結果を取り込む。
    // 今日の分が取れたらローカルでの収集はスキップする。
    status.phase = 'クラウドの収集結果を確認中';
    status.done = 0; status.total = 1;
    const sync = await syncFromGitHub();
    const todayStr = new Date().toISOString().slice(0, 10);
    if (sync.synced && listSnapshots().includes(`${todayStr}.json`)) {
      status.lastResult = { date: todayStr, source: 'cloud', added: sync.added };
      status.phase = '完了(クラウドのデータを取り込みました)';
    } else {
      status.lastResult = await collect(status);
    }
    try { writeDailyReport(buildReport()); } catch {}
  } catch (e) {
    status.error = String(e?.message || e);
  } finally {
    status.running = false;
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const send = (code, body, type = 'application/json') => {
    res.writeHead(code, { 'Content-Type': `${type}; charset=utf-8` });
    res.end(type === 'application/json' ? JSON.stringify(body) : body);
  };
  try {
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return send(200, fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8'), 'text/html');
    }
    if (url.pathname === '/guide' || url.pathname === '/guide.html') {
      return send(200, fs.readFileSync(path.join(ROOT, 'public', 'guide.html'), 'utf8'), 'text/html');
    }
    if (url.pathname === '/api/guides') {
      const r = buildReport();
      const items = (r.ready ? r.genres.slice(0, 8) : []).map((g) => ({
        tag: g.tag, jp: g.jp, score: g.score, demand: g.demand, supply: g.supply,
        avgMin: g.avgMin, d1: g.d1, days: g.days, difficulty: g.difficulty,
        monthlyJPY: g.monthlyJPY, hint: g.hint, refs: g.refs,
        guide: getGuide(g.tag) || DEFAULT_GUIDE,
        hasOwnGuide: !!getGuide(g.tag),
      }));
      const library = Object.keys(GUIDES).map((tag) => ({ tag, jp: genreInfo(tag).jp, guide: GUIDES[tag] }));
      return send(200, { ready: r.ready, date: r.date || null, common: COMMON_GUIDE, items, library });
    }
    if (url.pathname === '/api/report') return send(200, buildReport());
    if (url.pathname === '/api/status') return send(200, status);
    if (url.pathname === '/api/trends') return send(200, buildTrends());
    if (url.pathname === '/api/mymaps') return send(200, await buildMyMapsReport());
    if (url.pathname === '/api/mymaps/add' && req.method === 'POST') {
      return send(200, await addMyMap(url.searchParams.get('code') || ''));
    }
    if (url.pathname === '/api/mymaps/remove' && req.method === 'POST') {
      return send(200, removeMyMap(url.searchParams.get('code') || ''));
    }
    if (url.pathname === '/api/refresh' && req.method === 'POST') {
      runCollect();
      return send(200, { started: true });
    }
    send(404, { error: 'not found' });
  } catch (e) {
    send(500, { error: String(e?.message || e) });
  }
});

server.listen(PORT, () => {
  console.log('==============================================');
  console.log('  UEFNヒットレーダー 起動しました');
  console.log(`  ブラウザで http://localhost:${PORT} を開いてください`);
  console.log('==============================================');
  // 今日のデータがまだ無ければ自動で収集開始
  const snaps = listSnapshots();
  const todayStr = new Date().toISOString().slice(0, 10);
  if (!snaps.includes(`${todayStr}.json`)) {
    console.log('本日のデータがないため、自動で調査を開始します(数分かかります)…');
    runCollect();
  }
});
