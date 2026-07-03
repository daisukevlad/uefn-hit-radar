// 個人開発者(1日3時間)向けのジャンル知識テーブル
// difficulty: 1(簡単)〜5(大規模チーム向け)
// days: 1日3時間ペースでの想定制作日数(初版リリースまで)
// soloFit: 個人開発との相性 0〜1(1が最高)

export const GENRE_INFO = {
  '1v1':              { jp: '1v1(タイマン練習)', difficulty: 1, days: 10, soloFit: 0.5, hint: '超飽和ジャンル。作るなら独自ギミック必須。' },
  'box fight':        { jp: 'ボックスファイト', difficulty: 1, days: 10, soloFit: 0.5, hint: '飽和。大手の常連マップが上位を独占。' },
  'box pvp':          { jp: 'ボックスPvP', difficulty: 1, days: 10, soloFit: 0.5, hint: '飽和。差別化が非常に難しい。' },
  'zone wars':        { jp: 'ゾーンウォーズ', difficulty: 2, days: 14, soloFit: 0.5, hint: '飽和気味。独自ゾーン形式なら可能性あり。' },
  'practice':         { jp: '練習(エイム・建築)', difficulty: 1, days: 10, soloFit: 0.7, hint: '需要が安定。UI/計測機能の質で差がつく。' },
  'aim training':     { jp: 'エイム練習', difficulty: 1, days: 10, soloFit: 0.7, hint: '定番需要。Verseで精密な計測を作れると強い。' },
  'team deathmatch':  { jp: 'チームデスマッチ', difficulty: 2, days: 14, soloFit: 0.5, hint: '新規参入が非常に多い激戦区。' },
  'free for all':     { jp: 'フリーフォーオール', difficulty: 2, days: 14, soloFit: 0.5, hint: '激戦区。武器・マップの独自性が必要。' },
  'red vs blue':      { jp: '赤vs青', difficulty: 2, days: 14, soloFit: 0.5, hint: '定番だが常連マップが強い。' },
  'gun game':         { jp: 'ガンゲーム', difficulty: 2, days: 14, soloFit: 0.7, hint: '仕組みが単純で個人でも完成度を出しやすい。' },
  'sniper':           { jp: 'スナイパー系', difficulty: 2, days: 14, soloFit: 0.7, hint: 'ワンショット系は根強い人気。' },
  'one shot':         { jp: 'ワンショット', difficulty: 2, days: 14, soloFit: 0.7, hint: '定番。マップの見た目で差別化。' },
  'deathrun':         { jp: 'デスラン', difficulty: 2, days: 21, soloFit: 0.9, hint: '個人開発の王道。レベルデザイン力で勝負でき、継続率も高め。' },
  'parkour':          { jp: 'パルクール', difficulty: 2, days: 21, soloFit: 0.9, hint: '個人向き。ステージ追加で長期運用しやすい。' },
  'only up':          { jp: 'Only Up系(登り)', difficulty: 2, days: 18, soloFit: 0.8, hint: 'トレンド波及型。流行の題材と組み合わせると跳ねる。' },
  'obstacle course':  { jp: 'オビー/障害物コース', difficulty: 2, days: 18, soloFit: 0.9, hint: '個人向き。難易度曲線の設計が肝。' },
  'tycoon':           { jp: 'タイクーン(経営)', difficulty: 3, days: 35, soloFit: 0.8, hint: '滞在時間が長くエンゲージメント収益と相性抜群。Verse必須。' },
  'simulator':        { jp: 'シミュレーター', difficulty: 3, days: 30, soloFit: 0.8, hint: '周回・収集の中毒性で滞在時間を稼げる。' },
  'idle':             { jp: '放置系', difficulty: 3, days: 25, soloFit: 0.8, hint: '滞在時間が非常に長くなる。収益効率が良い。' },
  'prop hunt':        { jp: 'プロップハント(かくれんぼ)', difficulty: 2, days: 21, soloFit: 0.8, hint: 'パーティ需要が安定。テーマ替えで量産可能。' },
  'hide and seek':    { jp: 'かくれんぼ', difficulty: 2, days: 21, soloFit: 0.8, hint: 'キッズ・パーティ層に強い。マップの世界観が命。' },
  'murder mystery':   { jp: 'マーダーミステリー', difficulty: 3, days: 28, soloFit: 0.7, hint: '固定ファンがつきやすい。Verseでの役職システムが必要。' },
  'horror':           { jp: 'ホラー', difficulty: 3, days: 30, soloFit: 0.8, hint: '個人開発の狙い目。雰囲気作りで大手と互角に戦える。動画映えして拡散されやすい。' },
  'escape':           { jp: '脱出ゲーム', difficulty: 3, days: 28, soloFit: 0.9, hint: '個人向き。謎解きの質で口コミが生まれる。ホラーと相性◎。' },
  'puzzle':           { jp: 'パズル', difficulty: 2, days: 21, soloFit: 0.9, hint: '競合が少ない。じわじわ伸びる長寿型。' },
  'adventure':        { jp: 'アドベンチャー', difficulty: 4, days: 45, soloFit: 0.6, hint: '作り込みが必要だが継続率が高い。' },
  'open world':       { jp: 'オープンワールド', difficulty: 5, days: 90, soloFit: 0.3, hint: '個人では規模的に厳しい。範囲を絞るべき。' },
  'survival':         { jp: 'サバイバル', difficulty: 4, days: 45, soloFit: 0.6, hint: '滞在時間は長いが作り込み必須。' },
  'roleplay':         { jp: 'ロールプレイ', difficulty: 4, days: 50, soloFit: 0.5, hint: '当たれば大きいが継続的な更新が必要。' },
  'role playing':     { jp: 'ロールプレイ', difficulty: 4, days: 50, soloFit: 0.5, hint: '当たれば大きいが継続的な更新が必要。' },
  'tower defense':    { jp: 'タワーディフェンス', difficulty: 3, days: 30, soloFit: 0.8, hint: '競合少なめ。Verse力があれば狙い目。' },
  'racing':           { jp: 'レース', difficulty: 3, days: 25, soloFit: 0.7, hint: 'Rocket Racing系。コース量産で運用。' },
  'driver simulator': { jp: 'ドライバーシミュレーター', difficulty: 3, days: 25, soloFit: 0.6, hint: '新規供給が多い。差別化を確認してから。' },
  'bed wars':         { jp: 'ベッドウォーズ', difficulty: 3, days: 30, soloFit: 0.6, hint: 'マイクラ層に人気。システム構築が重い。' },
  'battle':           { jp: 'バトル系', difficulty: 2, days: 14, soloFit: 0.5, hint: '汎用タグ。中身の具体ジャンルで判断を。' },
  'melee':            { jp: '近接戦闘', difficulty: 2, days: 14, soloFit: 0.7, hint: 'ニンジャ・剣戟系。流行IPと相性が良い。' },
  'boxing':           { jp: 'ボクシング', difficulty: 2, days: 14, soloFit: 0.7, hint: 'ニッチだが固定需要あり。' },
  'football':         { jp: 'サッカー/フットボール', difficulty: 3, days: 25, soloFit: 0.6, hint: 'スポーツイベント時期に跳ねる。' },
  'basketball':       { jp: 'バスケ', difficulty: 3, days: 25, soloFit: 0.6, hint: 'ニッチ。物理調整が難しい。' },
  'fishing':          { jp: '釣り', difficulty: 3, days: 25, soloFit: 0.8, hint: 'まったり系は滞在時間が長い。競合少。' },
  'pets':             { jp: 'ペット育成', difficulty: 3, days: 30, soloFit: 0.8, hint: 'キッズ層に強い。収集要素で継続率を稼げる。' },
  'fashion show':     { jp: 'ファッションショー', difficulty: 2, days: 14, soloFit: 0.7, hint: 'コミュニティ型。定番需要が安定。' },
  'tag':              { jp: '鬼ごっこ', difficulty: 2, days: 18, soloFit: 0.8, hint: 'パーティ需要。シンプルで作りやすい。' },
  'party':            { jp: 'パーティゲーム', difficulty: 2, days: 21, soloFit: 0.8, hint: 'ミニゲーム集は滞在時間を稼ぎやすい。' },
  'music':            { jp: '音楽系', difficulty: 3, days: 25, soloFit: 0.7, hint: 'ニッチだが競合ほぼゼロ。' },
  'building':         { jp: '建築系', difficulty: 2, days: 14, soloFit: 0.7, hint: '練習系と創作系で需要が分かれる。' },
  'co-op':            { jp: '協力プレイ', difficulty: 3, days: 30, soloFit: 0.8, hint: 'フレンド招待が起きやすく、Discoverに乗りやすい。' },
  'minigame':         { jp: 'ミニゲーム集', difficulty: 2, days: 21, soloFit: 0.8, hint: '1つ当たれば横展開できる。' },
  'fashion':          { jp: 'ファッション系', difficulty: 2, days: 14, soloFit: 0.7, hint: 'コミュニティ型。定番需要が安定。' },
  'party world':      { jp: 'パーティワールド', difficulty: 3, days: 30, soloFit: 0.7, hint: '交流ハブ型。滞在時間が長い。' },
  'brainrot':         { jp: 'ブレインロット系(ミームIP)', difficulty: 2, days: 18, soloFit: 0.8, hint: '流行ミームの波に乗るタイプ。旬が短いのでスピード勝負。' },
  'obby':             { jp: 'オビー(アスレチック)', difficulty: 2, days: 18, soloFit: 0.9, hint: '個人向き。難易度曲線の設計が肝。' },
  'rvb':              { jp: '赤vs青', difficulty: 2, days: 14, soloFit: 0.5, hint: '定番だが常連マップが強い。' },
  'board game':       { jp: 'ボードゲーム系', difficulty: 2, days: 21, soloFit: 0.9, hint: '競合が少ないニッチ。フレンド同席プレイで滞在時間が伸びる。' },
  'guess':            { jp: 'クイズ・当てゲーム', difficulty: 2, days: 18, soloFit: 0.9, hint: 'ロゴ当て等が急上昇中。量産・多言語化しやすい。' },
};

// ジャンルではなく「雰囲気」を表す汎用タグ(推奨対象から除外)
export const GENERIC_TAGS = new Set([
  'just for fun', 'pvp', 'action', 'competitive', 'fun', 'shooter',
  'strategy', 'casual', 'multiplayer', 'new', 'chill', 'difficult',
  'easy', 'hard', 'solo', 'duo', 'squad', 'trio', 'all', 'other', 'objective',
]);

// Epic公式アイランド(displayName持ち)は分析対象外にする際の判定に使用
export function isFirstParty(island) {
  return !!island.displayName || island.creatorCode === 'epic' || island.createdIn === 'internal';
}

// 収益概算: エンゲージメントペイアウトの経験則(1プレイ時間あたりUSD)
// コミュニティ推計 $0.03〜$0.08/時間。控えめに $0.05 を中央値とする。
export const PAYOUT_PER_HOUR_USD = 0.05;
export const USD_JPY = 150;

export function genreInfo(tag) {
  return GENRE_INFO[tag] || { jp: tag, difficulty: 3, days: 30, soloFit: 0.6, hint: '' };
}
