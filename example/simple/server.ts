import express from 'express';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.static(join(__dirname, 'public')));

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
