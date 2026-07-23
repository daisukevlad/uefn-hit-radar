// マップのサムネイル画像解決(fortnite.gg経由)
// fortnite.com/@user/code はCloudflareチャレンジで直接取得できないため、
// 常にfortnite.gg/island/{code} のOGP画像(Epic CDN由来)を利用する。
import { load, save } from './store.mjs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

// URLまたはコード文字列からアイランドコード(XXXX-XXXX-XXXX)を抽出
export function extractCode(input) {
  const m = String(input || '').match(/\d{4}-\d{4}-\d{4}/);
  return m ? m[0] : null;
}

function parseOg(html, prop) {
  const re = new RegExp(`<meta[^>]*property=["']${prop}["'][^>]*content=["']([^"']*)["']`, 'i');
  const m = html.match(re) || html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${prop}["']`, 'i'));
  return m ? m[1] : null;
}

// fortnite.ggはCloudflareがTLSフィンガープリントでNode.js標準fetchを検知しブロックするため、
// OS標準のcurl(Windows: Schannel/curl.exe)を子プロセスとして呼び出して回避する。
async function fetchGgPage(code) {
  const url = `https://fortnite.gg/island/${encodeURIComponent(code)}`;
  try {
    const { stdout } = await execFileAsync('curl', ['-s', '-L', '--max-time', '15', '-H', `User-Agent: ${UA}`, url], {
      maxBuffer: 5 * 1024 * 1024,
    });
    return stdout || null;
  } catch {
    return null;
  }
}

// コードからサムネイル情報を解決(キャッシュ付き)
export async function resolveThumbnail(rawInput) {
  const code = extractCode(rawInput);
  if (!code) return { ok: false, error: 'コードの形式が正しくありません(例: 1234-5678-9012)' };

  const cache = load('thumbnails.json', { items: {} });
  const cached = cache.items[code];
  // 7日以内にキャッシュ済みならそれを使う
  if (cached && cached.fetchedAt && Date.now() - new Date(cached.fetchedAt).getTime() < 7 * 24 * 60 * 60 * 1000) {
    return { ok: true, code, image: cached.image, title: cached.title };
  }

  const html = await fetchGgPage(code);
  if (!html) return { ok: false, error: 'マップ情報を取得できませんでした(非公開・削除された可能性があります)' };

  const image = parseOg(html, 'og:image');
  let title = parseOg(html, 'og:title') || '';
  // "TITLE CODE by creator - Fortnite Creative Map Code" 形式からタイトルのみ抽出
  title = title.replace(new RegExp(`\\s*${code}.*$`), '').trim() || title;

  if (!image) return { ok: false, error: 'サムネイル画像が見つかりませんでした' };

  cache.items[code] = { image, title, fetchedAt: new Date().toISOString() };
  save('thumbnails.json', cache);

  return { ok: true, code, image, title };
}
