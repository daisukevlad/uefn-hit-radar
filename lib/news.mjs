// ニュース取得・解析モジュール
import { load, save } from './store.mjs';

/**
 * URLからフィードを取得
 * @param {string} url
 * @param {string} kind - 'atom' or 'rss'
 * @returns {Promise<string|null>} - XML text or null on error
 */
async function fetchFeed(url, kind) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'hit-radar/1.0 (personal research tool)' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * HTML entity をデコード
 * @param {string} s
 * @returns {string}
 */
function decode(s) {
  if (!s) return '';

  // CDATA を削除
  s = s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');

  // HTML entity をデコード
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#x27;': "'",
  };

  for (const [key, val] of Object.entries(entities)) {
    s = s.split(key).join(val);
  }

  // 数値エンティティをデコード &#NNN;
  s = s.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));

  return s;
}

/**
 * Atom フィード (Reddit) をパース
 * @param {string} xml
 * @param {string} src
 * @returns {Array}
 */
function parseAtom(xml, src) {
  const items = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];

    // title
    const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/.exec(entry);
    const title = titleMatch ? decode(titleMatch[1]).trim() : '';

    // link href
    const linkMatch = /<link[^>]*href="([^"]*)"/.exec(entry);
    const url = linkMatch ? linkMatch[1] : '';

    // updated (date)
    const dateMatch = /<updated>([\s\S]*?)<\/updated>/.exec(entry);
    const date = dateMatch ? dateMatch[1].trim() : '';

    if (title && url) {
      items.push({ src, title, url, date });
    }
  }

  return items;
}

/**
 * RSS フィード (Google News) をパース
 * @param {string} xml
 * @param {string} src
 * @returns {Array}
 */
function parseRss(xml, src) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];

    // title
    const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/.exec(item);
    const title = titleMatch ? decode(titleMatch[1]).trim() : '';

    // link
    const linkMatch = /<link[^>]*>([\s\S]*?)<\/link>/.exec(item);
    const url = linkMatch ? decode(linkMatch[1]).trim() : '';

    // pubDate → ISO
    const dateMatch = /<pubDate[^>]*>([\s\S]*?)<\/pubDate>/.exec(item);
    let date = '';
    if (dateMatch) {
      const pubDate = dateMatch[1].trim();
      try {
        date = new Date(pubDate).toISOString();
      } catch {
        date = pubDate;
      }
    }

    if (title && url) {
      items.push({ src, title, url, date });
    }
  }

  return items;
}

/**
 * すべてのニュースフィードを取得・結合
 * @returns {Promise<Object>}
 */
export async function fetchNews() {
  const feeds = [
    {
      url: 'https://www.reddit.com/r/uefn/hot.rss?limit=25',
      src: 'Reddit r/uefn',
      kind: 'atom',
    },
    {
      url: 'https://www.reddit.com/r/FortniteCreative/hot.rss?limit=25',
      src: 'Reddit r/FortniteCreative',
      kind: 'atom',
    },
    {
      url: 'https://news.google.com/rss/search?q=UEFN%20%E3%83%95%E3%82%A9%E3%83%BC%E3%83%88%E3%83%8A%E3%82%A4%E3%83%88&hl=ja&gl=JP&ceid=JP:ja',
      src: 'ニュース(日本語)',
      kind: 'rss',
    },
    {
      url: 'https://news.google.com/rss/search?q=UEFN%20OR%20%22Fortnite%20Creative%22%20map&hl=en-US&gl=US&ceid=US:en',
      src: 'News(英語)',
      kind: 'rss',
    },
    {
      // Epic公式開発者フォーラム(Fortniteタグ) — UEFN開発の実践Q&A・不具合・仕様の一次情報
      url: 'https://forums.unrealengine.com/tag/fortnite.rss',
      src: 'UEフォーラム',
      kind: 'rss',
    },
  ];

  // すべてのフィードを並列取得
  const results = await Promise.all(
    feeds.map(async (feed) => {
      const xml = await fetchFeed(feed.url, feed.kind);
      if (!xml) return [];

      if (feed.kind === 'atom') {
        return parseAtom(xml, feed.src);
      } else {
        return parseRss(xml, feed.src);
      }
    })
  );

  // 結合
  let allItems = results.flat();

  // 空title/url を削除
  allItems = allItems.filter((item) => item.title && item.url);

  // 重複排除（正規化されたタイトル）
  const seen = new Set();
  const deduped = [];
  for (const item of allItems) {
    const key = item.title.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(item);
    }
  }

  // date で降順ソート（日付なしは最後）
  deduped.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date) - new Date(a.date);
  });

  // 60 件でキャップ
  const items = deduped.slice(0, 60);

  const result = {
    fetchedAt: new Date().toISOString(),
    items,
  };

  save('news.json', result);
  return result;
}

/**
 * ニュースを読み込む
 * @returns {Object}
 */
export function loadNews() {
  return load('news.json', { fetchedAt: null, items: [] });
}
