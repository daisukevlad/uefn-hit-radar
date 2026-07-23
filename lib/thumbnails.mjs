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
async function fetchGgUrl(url) {
  try {
    const { stdout } = await execFileAsync('curl', ['-s', '-L', '--max-time', '15', '-H', `User-Agent: ${UA}`, url], {
      maxBuffer: 5 * 1024 * 1024,
    });
    return stdout || null;
  } catch {
    return null;
  }
}

function fetchGgPage(code) {
  return fetchGgUrl(`https://fortnite.gg/island/${encodeURIComponent(code)}`);
}

// クリエイターのプロフィールページ(fortnite.gg/creator/{name})からX・Discord等のSNSリンクを取得
async function fetchCreatorSocials(creator) {
  if (!creator) return {};
  const html = await fetchGgUrl(`https://fortnite.gg/creator/${encodeURIComponent(creator)}`);
  if (!html) return {};

  const divMatch = html.match(/<div class=["']creator-socials["']>([\s\S]*?)<\/div>/i);
  if (!divMatch) return {};

  const linkRe = /<a\s+href=["']([^"']+)["'][^>]*data-tooltip=["']([^"']+)["']/gi;
  const socials = {};
  let m;
  while ((m = linkRe.exec(divMatch[1])) !== null) {
    const url = m[1];
    const label = m[2].toLowerCase();
    if (label.includes('twitter') || label.startsWith('x ')) socials.x = url;
    else if (label.includes('discord')) socials.discord = url;
    else if (label.includes('instagram')) socials.instagram = url;
    else if (label.includes('tiktok')) socials.tiktok = url;
    else if (label.includes('youtube')) socials.youtube = url;
    else if (label.includes('twitch')) socials.twitch = url;
  }
  return socials;
}

// コードからサムネイル情報を解決(キャッシュ付き)
export async function resolveThumbnail(rawInput) {
  const code = extractCode(rawInput);
  if (!code) return { ok: false, error: 'コードの形式が正しくありません(例: 1234-5678-9012)' };

  const cache = load('thumbnails.json', { items: {} });
  const cached = cache.items[code];
  // 7日以内にキャッシュ済みならそれを使う(SNSリンク欄が無い古いキャッシュは再取得させる)
  if (cached && cached.fetchedAt && cached.socials && Date.now() - new Date(cached.fetchedAt).getTime() < 7 * 24 * 60 * 60 * 1000) {
    return { ok: true, code, image: cached.image, title: cached.title, creator: cached.creator || null, islandUrl: cached.islandUrl || islandUrlFor(code, cached.creator), socials: cached.socials };
  }

  const html = await fetchGgPage(code);
  if (!html) return { ok: false, error: 'マップ情報を取得できませんでした(非公開・削除された可能性があります)' };

  const image = parseOg(html, 'og:image');
  const ogTitle = parseOg(html, 'og:title') || '';

  // "TITLE CODE by CREATOR - Fortnite Creative Map Code" 形式からタイトル/クリエイター名を抽出
  let title = ogTitle.replace(new RegExp(`\\s*${code}.*$`), '').trim() || ogTitle;
  const creatorMatch = ogTitle.match(/\bby\s+(.+?)\s*-\s*Fortnite Creative Map Code\s*$/i);
  const creator = creatorMatch ? creatorMatch[1].trim() : null;

  if (!image) return { ok: false, error: 'サムネイル画像が見つかりませんでした' };

  const islandUrl = islandUrlFor(code, creator);
  const socials = await fetchCreatorSocials(creator);
  cache.items[code] = { image, title, creator, islandUrl, socials, fetchedAt: new Date().toISOString() };
  save('thumbnails.json', cache);

  return { ok: true, code, image, title, creator, islandUrl, socials };
}

// SNS投稿に貼れるマップの公式リンクを組み立てる(クリエイター名が分かればプロフィール付きURL)
function islandUrlFor(code, creator) {
  return creator
    ? `https://www.fortnite.com/@${encodeURIComponent(creator)}/${code}`
    : `https://www.fortnite.com/play/island/${code}`;
}
