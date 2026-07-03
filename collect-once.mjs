// サーバーを起動せずに1回だけデータ収集する(タスクスケジューラ用)
import { collect } from './lib/collect.mjs';

const status = { phase: '', done: 0, total: 0 };
const timer = setInterval(() => {
  process.stdout.write(`\r${status.phase} ${status.done}/${status.total}    `);
}, 1000);

const result = await collect(status);
clearInterval(timer);
console.log('\n収集完了:', JSON.stringify(result));
