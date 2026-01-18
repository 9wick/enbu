/**
 * ECサイトE2Eテスト用サーバー
 *
 * メモリのみで動作する簡易ECサイトサーバー。
 * enbuによるE2Eテストのデモ用途。
 *
 * ポート3060を使用
 */
import express, { Request, Response, NextFunction } from 'express';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// --------------------------------------------------
// メモリDB（簡易データストア）
// --------------------------------------------------

/** 商品データ型 */
interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  stock: number;
  image: string;
}

/** カートアイテム型 */
interface CartItem {
  productId: number;
  quantity: number;
}

/** ユーザー型 */
interface User {
  id: number;
  email: string;
  password: string;
  name: string;
}

/** 注文型 */
interface Order {
  id: number;
  userId: number;
  items: CartItem[];
  total: number;
  createdAt: string;
}

/** セッション型 */
interface Session {
  userId: number | null;
  cart: CartItem[];
}

/** 商品マスタデータ */
const products: Product[] = [
  {
    id: 1,
    name: 'プレミアムコーヒー豆 500g',
    price: 2980,
    description: 'エチオピア産の高品質アラビカ種。フルーティーな香りと深いコクが特徴です。',
    stock: 50,
    image: '/images/coffee.svg',
  },
  {
    id: 2,
    name: '有機緑茶ティーバッグ 30包',
    price: 1580,
    description: '静岡県産の有機栽培茶葉を使用。手軽に本格的な緑茶が楽しめます。',
    stock: 100,
    image: '/images/tea.svg',
  },
  {
    id: 3,
    name: '北海道産はちみつ 300g',
    price: 1980,
    description: '北海道の大自然で採れた純粋はちみつ。パンやヨーグルトに最適。',
    stock: 30,
    image: '/images/honey.svg',
  },
  {
    id: 4,
    name: 'オーガニックチョコレート 100g',
    price: 980,
    description: 'フェアトレードのカカオを使用した濃厚なダークチョコレート。',
    stock: 80,
    image: '/images/chocolate.svg',
  },
  {
    id: 5,
    name: '天然塩 200g',
    price: 680,
    description: '沖縄の海水から作られた天然塩。ミネラル豊富で料理を引き立てます。',
    stock: 200,
    image: '/images/salt.svg',
  },
];

/** テストユーザーデータ */
const users: User[] = [
  {
    id: 1,
    email: 'test@example.com',
    password: 'password123',
    name: '山田太郎',
  },
];

/** 注文履歴 */
const orders: Order[] = [];
let orderIdCounter = 1;

/**
 * セッションストア（メモリ）
 * 簡易実装としてCookieのセッションIDをキーに保持
 */
const sessions: Map<string, Session> = new Map();

// --------------------------------------------------
// ミドルウェア
// --------------------------------------------------

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

/**
 * セッション管理ミドルウェア
 * リクエストごとにセッションを取得または作成
 */
function sessionMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const sessionId = req.headers['x-session-id'] as string | undefined;

  if (sessionId && sessions.has(sessionId)) {
    (req as Request & { session: Session; sessionId: string }).session = sessions.get(sessionId)!;
    (req as Request & { session: Session; sessionId: string }).sessionId = sessionId;
  } else {
    const newSessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const newSession: Session = { userId: null, cart: [] };
    sessions.set(newSessionId, newSession);
    (req as Request & { session: Session; sessionId: string }).session = newSession;
    (req as Request & { session: Session; sessionId: string }).sessionId = newSessionId;
  }

  next();
}

app.use(sessionMiddleware);

// --------------------------------------------------
// APIエンドポイント
// --------------------------------------------------

type RequestWithSession = Request & { session: Session; sessionId: string };

/** ログインAPI */
app.post('/api/login', (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  const user = users.find((u) => u.email === email && u.password === password);

  if (!user) {
    res.status(401).json({ error: 'メールアドレスまたはパスワードが正しくありません' });
    return;
  }

  const reqWithSession = req as RequestWithSession;
  reqWithSession.session.userId = user.id;

  res.json({
    success: true,
    sessionId: reqWithSession.sessionId,
    user: { id: user.id, name: user.name, email: user.email },
  });
});

/** ログアウトAPI */
app.post('/api/logout', (req: Request, res: Response) => {
  const reqWithSession = req as RequestWithSession;
  reqWithSession.session.userId = null;
  reqWithSession.session.cart = [];
  res.json({ success: true });
});

/** 商品一覧取得API */
app.get('/api/products', (_req: Request, res: Response) => {
  res.json(products);
});

/** 商品詳細取得API */
app.get('/api/products/:id', (req: Request, res: Response) => {
  const productId = parseInt(req.params.id as string, 10);
  const product = products.find((p) => p.id === productId);

  if (!product) {
    res.status(404).json({ error: '商品が見つかりません' });
    return;
  }

  res.json(product);
});

/** 商品検索API */
app.get('/api/products/search/:query', (req: Request, res: Response) => {
  const query = (req.params.query as string).toLowerCase();
  const results = products.filter(
    (p) => p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query),
  );
  res.json(results);
});

/** カート取得API */
app.get('/api/cart', (req: Request, res: Response) => {
  const reqWithSession = req as RequestWithSession;
  const cart = reqWithSession.session.cart;

  const cartWithDetails = cart.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    return {
      ...item,
      product,
      subtotal: product ? product.price * item.quantity : 0,
    };
  });

  const total = cartWithDetails.reduce((sum, item) => sum + item.subtotal, 0);

  res.json({ items: cartWithDetails, total });
});

/** カートに追加API */
app.post('/api/cart', (req: Request, res: Response) => {
  const { productId, quantity = 1 } = req.body as { productId?: number; quantity?: number };

  if (!productId) {
    res.status(400).json({ error: '商品IDが必要です' });
    return;
  }

  const product = products.find((p) => p.id === productId);
  if (!product) {
    res.status(404).json({ error: '商品が見つかりません' });
    return;
  }

  if (product.stock < quantity) {
    res.status(400).json({ error: '在庫が不足しています' });
    return;
  }

  const reqWithSession = req as RequestWithSession;
  const existingItem = reqWithSession.session.cart.find((item) => item.productId === productId);

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    reqWithSession.session.cart.push({ productId, quantity });
  }

  res.json({ success: true, cart: reqWithSession.session.cart });
});

/** カート更新API */
app.put('/api/cart/:productId', (req: Request, res: Response) => {
  const productId = parseInt(req.params.productId as string, 10);
  const { quantity } = req.body as { quantity?: number };

  if (quantity === undefined || quantity < 0) {
    res.status(400).json({ error: '数量が正しくありません' });
    return;
  }

  const reqWithSession = req as RequestWithSession;
  const itemIndex = reqWithSession.session.cart.findIndex((item) => item.productId === productId);

  if (itemIndex === -1) {
    res.status(404).json({ error: 'カート内に商品が見つかりません' });
    return;
  }

  if (quantity === 0) {
    reqWithSession.session.cart.splice(itemIndex, 1);
  } else {
    reqWithSession.session.cart[itemIndex].quantity = quantity;
  }

  res.json({ success: true, cart: reqWithSession.session.cart });
});

/** カートから削除API */
app.delete('/api/cart/:productId', (req: Request, res: Response) => {
  const productId = parseInt(req.params.productId as string, 10);
  const reqWithSession = req as RequestWithSession;

  const itemIndex = reqWithSession.session.cart.findIndex((item) => item.productId === productId);

  if (itemIndex === -1) {
    res.status(404).json({ error: 'カート内に商品が見つかりません' });
    return;
  }

  reqWithSession.session.cart.splice(itemIndex, 1);
  res.json({ success: true, cart: reqWithSession.session.cart });
});

/** チェックアウト（注文確定）API */
app.post('/api/checkout', (req: Request, res: Response) => {
  const reqWithSession = req as RequestWithSession;

  if (!reqWithSession.session.userId) {
    res.status(401).json({ error: 'ログインが必要です' });
    return;
  }

  if (reqWithSession.session.cart.length === 0) {
    res.status(400).json({ error: 'カートが空です' });
    return;
  }

  // 在庫チェックと合計計算
  let total = 0;
  for (const item of reqWithSession.session.cart) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) {
      res.status(400).json({ error: `商品ID ${item.productId} が見つかりません` });
      return;
    }
    if (product.stock < item.quantity) {
      res.status(400).json({ error: `「${product.name}」の在庫が不足しています` });
      return;
    }
    total += product.price * item.quantity;
  }

  // 在庫を減らす
  for (const item of reqWithSession.session.cart) {
    const product = products.find((p) => p.id === item.productId);
    if (product) {
      product.stock -= item.quantity;
    }
  }

  // 注文を作成
  const order: Order = {
    id: orderIdCounter++,
    userId: reqWithSession.session.userId,
    items: [...reqWithSession.session.cart],
    total,
    createdAt: new Date().toISOString(),
  };
  orders.push(order);

  // カートをクリア
  reqWithSession.session.cart = [];

  res.json({ success: true, order });
});

/** 注文履歴取得API */
app.get('/api/orders', (req: Request, res: Response) => {
  const reqWithSession = req as RequestWithSession;

  if (!reqWithSession.session.userId) {
    res.status(401).json({ error: 'ログインが必要です' });
    return;
  }

  const userOrders = orders.filter((o) => o.userId === reqWithSession.session.userId);
  res.json(userOrders);
});

// --------------------------------------------------
// サーバー起動
// --------------------------------------------------

app.listen(3060, () => {
  console.log('ECサイトテストサーバー起動中: http://localhost:3060');
});
