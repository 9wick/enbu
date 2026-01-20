/**
 * E-commerce E2E Test Server
 *
 * Simple e-commerce site server that operates in-memory only.
 * For demonstration purposes of E2E testing with enbu.
 *
 * Uses port 3060
 */
import express, { Request, Response, NextFunction } from 'express';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// --------------------------------------------------
// In-memory DB (simple data store)
// --------------------------------------------------

/** Product data type */
interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  stock: number;
  image: string;
}

/** Cart item type */
interface CartItem {
  productId: number;
  quantity: number;
}

/** User type */
interface User {
  id: number;
  email: string;
  password: string;
  name: string;
}

/** Order type */
interface Order {
  id: number;
  userId: number;
  items: CartItem[];
  total: number;
  createdAt: string;
}

/** Session type */
interface Session {
  userId: number | null;
  cart: CartItem[];
}

/** Product master data */
const products: Product[] = [
  {
    id: 1,
    name: 'Cashmere Wool Cardigan',
    price: 45000,
    description: 'Luxuriously soft cardigan crafted from premium cashmere wool. Features elegant draping and timeless silhouette.',
    stock: 50,
    image: '/images/cardigan.png',
  },
  {
    id: 2,
    name: 'Italian Leather Tote Bag',
    price: 68000,
    description: 'Handcrafted in Florence from the finest full-grain leather. Spacious interior with signature hardware detailing.',
    stock: 100,
    image: '/images/bag.png',
  },
  {
    id: 3,
    name: 'Silk Scarf Collection',
    price: 29800,
    description: 'Exquisite hand-rolled silk scarf featuring an exclusive artistic print. Made from 100% pure mulberry silk.',
    stock: 30,
    image: '/images/scarf.png',
  },
  {
    id: 4,
    name: 'Premium Suede Loafers',
    price: 38500,
    description: 'Elegant Italian suede loafers with hand-stitched detailing. Leather sole and cushioned footbed for all-day comfort.',
    stock: 80,
    image: '/images/loafers.png',
  },
  {
    id: 5,
    name: 'Merino Wool Coat',
    price: 89000,
    description: 'Sophisticated double-breasted coat in ultra-fine merino wool. Clean lines and impeccable tailoring for a refined aesthetic.',
    stock: 200,
    image: '/images/coat.png',
  },
];

/** Test user data */
const users: User[] = [
  {
    id: 1,
    email: 'test@example.com',
    password: 'password123',
    name: 'John Smith',
  },
];

/** Order history */
const orders: Order[] = [];
let orderIdCounter = 1;

/**
 * Session store (in-memory)
 * Simple implementation that stores sessions by Cookie session ID as key
 */
const sessions: Map<string, Session> = new Map();

// --------------------------------------------------
// Middleware
// --------------------------------------------------

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

/**
 * Session management middleware
 * Retrieves or creates a session for each request
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
// API Endpoints
// --------------------------------------------------

type RequestWithSession = Request & { session: Session; sessionId: string };

/** Login API */
app.post('/api/login', (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  const user = users.find((u) => u.email === email && u.password === password);

  if (!user) {
    res.status(401).json({ error: 'Invalid email or password' });
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

/** Logout API */
app.post('/api/logout', (req: Request, res: Response) => {
  const reqWithSession = req as RequestWithSession;
  reqWithSession.session.userId = null;
  reqWithSession.session.cart = [];
  res.json({ success: true });
});

/** Get product list API */
app.get('/api/products', (_req: Request, res: Response) => {
  res.json(products);
});

/** Get product details API */
app.get('/api/products/:id', (req: Request, res: Response) => {
  const productId = parseInt(req.params.id as string, 10);
  const product = products.find((p) => p.id === productId);

  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  res.json(product);
});

/** Product search API */
app.get('/api/products/search/:query', (req: Request, res: Response) => {
  const query = (req.params.query as string).toLowerCase();
  const results = products.filter(
    (p) => p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query),
  );
  res.json(results);
});

/** Get cart API */
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

/** Add to cart API */
app.post('/api/cart', (req: Request, res: Response) => {
  const { productId, quantity = 1 } = req.body as { productId?: number; quantity?: number };

  if (!productId) {
    res.status(400).json({ error: 'Product ID is required' });
    return;
  }

  const product = products.find((p) => p.id === productId);
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  if (product.stock < quantity) {
    res.status(400).json({ error: 'Insufficient stock' });
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

/** Update cart API */
app.put('/api/cart/:productId', (req: Request, res: Response) => {
  const productId = parseInt(req.params.productId as string, 10);
  const { quantity } = req.body as { quantity?: number };

  if (quantity === undefined || quantity < 0) {
    res.status(400).json({ error: 'Invalid quantity' });
    return;
  }

  const reqWithSession = req as RequestWithSession;
  const itemIndex = reqWithSession.session.cart.findIndex((item) => item.productId === productId);

  if (itemIndex === -1) {
    res.status(404).json({ error: 'Item not found in cart' });
    return;
  }

  if (quantity === 0) {
    reqWithSession.session.cart.splice(itemIndex, 1);
  } else {
    reqWithSession.session.cart[itemIndex].quantity = quantity;
  }

  res.json({ success: true, cart: reqWithSession.session.cart });
});

/** Remove from cart API */
app.delete('/api/cart/:productId', (req: Request, res: Response) => {
  const productId = parseInt(req.params.productId as string, 10);
  const reqWithSession = req as RequestWithSession;

  const itemIndex = reqWithSession.session.cart.findIndex((item) => item.productId === productId);

  if (itemIndex === -1) {
    res.status(404).json({ error: 'Item not found in cart' });
    return;
  }

  reqWithSession.session.cart.splice(itemIndex, 1);
  res.json({ success: true, cart: reqWithSession.session.cart });
});

/** Checkout (order confirmation) API */
app.post('/api/checkout', (req: Request, res: Response) => {
  const reqWithSession = req as RequestWithSession;

  if (!reqWithSession.session.userId) {
    res.status(401).json({ error: 'Please sign in to continue' });
    return;
  }

  if (reqWithSession.session.cart.length === 0) {
    res.status(400).json({ error: 'Your shopping bag is empty' });
    return;
  }

  // Stock check and total calculation
  let total = 0;
  for (const item of reqWithSession.session.cart) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) {
      res.status(400).json({ error: `Product ID ${item.productId} not found` });
      return;
    }
    if (product.stock < item.quantity) {
      res.status(400).json({ error: `Insufficient stock for ${product.name}` });
      return;
    }
    total += product.price * item.quantity;
  }

  // Reduce stock
  for (const item of reqWithSession.session.cart) {
    const product = products.find((p) => p.id === item.productId);
    if (product) {
      product.stock -= item.quantity;
    }
  }

  // Create order
  const order: Order = {
    id: orderIdCounter++,
    userId: reqWithSession.session.userId,
    items: [...reqWithSession.session.cart],
    total,
    createdAt: new Date().toISOString(),
  };
  orders.push(order);

  // Clear cart
  reqWithSession.session.cart = [];

  res.json({ success: true, order });
});

/** Get order history API */
app.get('/api/orders', (req: Request, res: Response) => {
  const reqWithSession = req as RequestWithSession;

  if (!reqWithSession.session.userId) {
    res.status(401).json({ error: 'Please sign in to continue' });
    return;
  }

  const userOrders = orders.filter((o) => o.userId === reqWithSession.session.userId);
  res.json(userOrders);
});

// --------------------------------------------------
// Server startup
// --------------------------------------------------

app.listen(3060, () => {
  console.log('E-commerce test server running: http://localhost:3060');
});
