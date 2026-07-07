// コラム生成: Discover向けコンテンツの自動編成
import { buildReport } from './analyze.mjs';
import { buildInsights } from './insights.mjs';
import { loadNews } from './news.mjs';

/**
 * コラムビルダー
 * 実測データ連動のトレンドコラム(今週の注目)のみを自動合成
 * @returns {{date: string|null, columns: Array}}
 */
export function buildColumns() {
  const report = buildReport();
  const insights = buildInsights();
  const news = loadNews();

  const columns = [];
  const date = report.date ?? insights.date ?? null;

  // ===== トレンドコラム群 (kind:'trend', badge:'今週の注目') =====

  // 1. キーワード分析
  if (insights.keywords && insights.keywords.length > 0) {
    const top5Words = insights.keywords.slice(0, 5).map((k) => k.word).join('」「');
    columns.push({
      id: 'trend-keywords',
      kind: 'trend',
      badge: '今週の注目',
      title: '今週バズっているキーワードを読み解く',
      lead: `今ヒットしているマップ名に何度も登場する言葉から、プレイヤーが今求めているものが見えます。`,
      paragraphs: [
        `直近の実測データで、成功マップのタイトルに頻出するキーワードは「${top5Words}」でした。`,
        `これは今フォートナイトのプレイヤーが反応している「旬のテーマ」です。あなたのジャンルにこの要素を一振り足すだけで、Discoverでの初速が変わることがあります。ただし旬のテーマは寿命が短いので、思いついたら数週間以内に出すスピードが命です。`,
      ],
      refs: [],
    });
  }

  // 2. 新規ヒット分析
  if (insights.topNew && insights.topNew.length > 0) {
    const top = insights.topNew[0];
    columns.push({
      id: 'trend-newhit',
      kind: 'trend',
      badge: '今週の注目',
      title: '今週いちばん跳ねた新作から学ぶ',
      lead: `急に伸びた新作には、必ず「刺さった理由」があります。`,
      paragraphs: [
        `直近1週間で最も注目を集めた新作は「${top.title}」(ピーク同時接続 ${top.ccu.toLocaleString('ja-JP')}人)です。`,
        `いきなり数字を出す新作は、宣伝ではなく「最初の60秒の面白さ」と「もう一回やりたくなる仕掛け」が優れているケースがほとんどです。実際に遊んで、開始直後に何を見せられたか・何が続きをやりたくさせたかをメモすると、自分のマップ設計にそのまま活かせます。`,
      ],
      refs: [
        {
          label: 'このマップを開く',
          url: `https://www.fortnite.com/play/island/${top.code}`,
        },
      ],
    });
  }

  // 3. ジャンル推奨
  if (report.ready && report.recommendations && report.recommendations.length > 0) {
    const rec = report.recommendations[0];
    const paragraphs = [];
    paragraphs.push(
      `今の総合スコア1位は「${rec.jp}」(スコア${rec.score}点)。平均プレイ時間 約${Math.round(rec.avgMin)}分、翌日継続率 ${Math.round((rec.d1 || 0) * 100)}%、想定制作期間 約${rec.days}日というバランスです。`
    );
    paragraphs.push(
      rec.hint
        ? rec.hint
        : '滞在時間と継続率が高く、新規参入が少ないジャンルを優先して選んでいます。'
    );
    if (rec.refs && rec.refs.length > 0) {
      paragraphs.push(
        `研究の出発点として、実際に伸びている「${rec.refs[0].title}」(${rec.refs[0].ccu.toLocaleString('ja-JP')}人)を遊んでみてください。`
      );
    } else {
      paragraphs.push(
        '「作り方ガイド」ページにこのジャンルの最低限必要な機能と工程表があります。'
      );
    }

    const refs = rec.refs && rec.refs.length > 0
      ? [
          {
            label: `${rec.refs[0].title} を開く`,
            url: `https://www.fortnite.com/play/island/${rec.refs[0].code}`,
          },
        ]
      : [];

    columns.push({
      id: 'trend-genre',
      kind: 'trend',
      badge: '今週の注目',
      title: '今いちばんの狙い目ジャンル',
      lead: `データが今おすすめするジャンルと、その理由。`,
      paragraphs,
      refs,
    });
  }

  // 4. ニュース/記事
  if (news.items && news.items.length > 0) {
    const refs = news.items.slice(0, 5).map((item) => {
      let label = item.title;
      if (label.length > 60) {
        label = label.substring(0, 57) + '…';
      }
      return {
        label: `[${item.src}] ${label}`,
        url: item.url,
      };
    });

    columns.push({
      id: 'trend-news',
      kind: 'trend',
      badge: '今週の注目',
      title: 'コミュニティで話題の記事',
      lead: `Reddit(海外クリエイター)とニュースから、今週の話題をピックアップ。`,
      paragraphs: [
        `UEFN・フォートナイトクリエイティブ関連で今注目されているトピックです。気になるものは元記事で詳細をチェックしてください。`,
      ],
      refs,
    });
  }

  return {
    date,
    columns,
  };
}
