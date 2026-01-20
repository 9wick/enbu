import express from 'express';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.static(join(__dirname, 'public')));

/**
 * ヘルスチェックエンドポイント
 *
 * start-server-and-testがサーバーの準備完了を確認するために使用する。
 */
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(3050, () => {
  console.log('Server running on http://localhost:3050');
});
