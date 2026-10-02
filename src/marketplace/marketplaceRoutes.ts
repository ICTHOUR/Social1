import { Request, Response, Router } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
    role: string;
    fullName?: string;
  };
}

export function setupMarketplaceRoutes(
  router: Router,
  db: any,
  authenticateToken: any,
  optionalAuth: any,
  queryDbOne: any,
  queryDbAll: any,
  runDb: any,
  createNotification: any,
  io: any
) {
  // 1. GET /api/marketplace/products - List products with filter & search
  router.get('/api/marketplace/products', optionalAuth, (req: AuthRequest, res: Response) => {
    try {
      const { category, search, condition, location, minPrice, maxPrice, sort, limit = 50 } = req.query;

      let query = `
        SELECT p.*, u.username as seller_username, u.full_name as seller_name, 
               u.avatar_url as seller_avatar, u.is_verified as seller_verified, u.badge as seller_badge
        FROM marketplace_products p
        JOIN users u ON p.seller_id = u.id
        WHERE p.status = 'active'
      `;
      const params: any[] = [];

      if (category && category !== 'all') {
        query += ' AND p.category = ?';
        params.push(category);
      }

      if (condition && condition !== 'all') {
        query += ' AND p.condition = ?';
        params.push(condition);
      }

      if (location && location !== 'all') {
        query += ' AND p.location LIKE ?';
        params.push(`%${location}%`);
      }

      if (minPrice) {
        query += ' AND p.price_bdt >= ?';
        params.push(Number(minPrice));
      }

      if (maxPrice) {
        query += ' AND p.price_bdt <= ?';
        params.push(Number(maxPrice));
      }

      if (search) {
        query += ' AND (p.title LIKE ? OR p.description LIKE ? OR p.category LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      if (sort === 'price_asc') {
        query += ' ORDER BY p.price_bdt ASC';
      } else if (sort === 'price_desc') {
        query += ' ORDER BY p.price_bdt DESC';
      } else if (sort === 'popular') {
        query += ' ORDER BY p.views_count DESC, p.created_at DESC';
      } else {
        query += ' ORDER BY p.created_at DESC';
      }

      query += ` LIMIT ${Math.min(100, Number(limit))}`;

      const rows = queryDbAll(db, query, params) || [];

      const products = rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        priceBdt: r.price_bdt,
        priceCoins: r.price_coins,
        category: r.category,
        condition: r.condition,
        location: r.location,
        images: JSON.parse(r.images_json || '[]'),
        phone: r.phone,
        isNegotiable: Boolean(r.is_negotiable),
        status: r.status,
        viewsCount: r.views_count,
        createdAt: r.created_at,
        seller: {
          id: r.seller_id,
          username: r.seller_username,
          fullName: r.seller_name,
          avatarUrl: r.seller_avatar,
          isVerified: Boolean(r.seller_verified),
          badge: r.seller_badge,
        },
      }));

      res.json({ success: true, products });
    } catch (err: any) {
      console.error('[Marketplace Error]:', err);
      res.status(500).json({ error: err.message || 'Failed to fetch marketplace products' });
    }
  });

  // 2. GET /api/marketplace/products/:id - Single product details & increment view count
  router.get('/api/marketplace/products/:id', optionalAuth, (req: AuthRequest, res: Response) => {
    try {
      const productId = req.params.id;

      // Increment views count atomically
      runDb(db, 'UPDATE marketplace_products SET views_count = views_count + 1 WHERE id = ?', [productId]);

      const r = queryDbOne(
        db,
        `SELECT p.*, u.username as seller_username, u.full_name as seller_name, 
                u.avatar_url as seller_avatar, u.is_verified as seller_verified, u.badge as seller_badge,
                u.email as seller_email, u.created_at as seller_joined
         FROM marketplace_products p
         JOIN users u ON p.seller_id = u.id
         WHERE p.id = ?`,
        [productId]
      );

      if (!r) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const product = {
        id: r.id,
        title: r.title,
        description: r.description,
        priceBdt: r.price_bdt,
        priceCoins: r.price_coins,
        category: r.category,
        condition: r.condition,
        location: r.location,
        images: JSON.parse(r.images_json || '[]'),
        phone: r.phone,
        isNegotiable: Boolean(r.is_negotiable),
        status: r.status,
        viewsCount: r.views_count,
        createdAt: r.created_at,
        seller: {
          id: r.seller_id,
          username: r.seller_username,
          fullName: r.seller_name,
          avatarUrl: r.seller_avatar,
          isVerified: Boolean(r.seller_verified),
          badge: r.seller_badge,
          email: r.seller_email,
          joinedAt: r.seller_joined,
        },
      };

      // Related products in same category
      const relatedRows = queryDbAll(
        db,
        `SELECT p.*, u.username as seller_username, u.full_name as seller_name, u.avatar_url as seller_avatar
         FROM marketplace_products p
         JOIN users u ON p.seller_id = u.id
         WHERE p.category = ? AND p.id != ? AND p.status = 'active'
         ORDER BY p.created_at DESC LIMIT 4`,
        [r.category, productId]
      ) || [];

      const related = relatedRows.map((rel: any) => ({
        id: rel.id,
        title: rel.title,
        priceBdt: rel.price_bdt,
        priceCoins: rel.price_coins,
        category: rel.category,
        location: rel.location,
        images: JSON.parse(rel.images_json || '[]'),
        seller: {
          id: rel.seller_id,
          username: rel.seller_username,
          fullName: rel.seller_name,
          avatarUrl: rel.seller_avatar,
        },
      }));

      res.json({ success: true, product, related });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch product details' });
    }
  });

  // 3. POST /api/marketplace/products - Create a new marketplace product listing
  router.post('/api/marketplace/products', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const sellerId = req.user!.id;
      const {
        title,
        description,
        priceBdt,
        priceCoins,
        category,
        condition = 'new',
        location,
        images = [],
        phone,
        isNegotiable = true,
      } = req.body;

      if (!title || !description || !priceBdt) {
        return res.status(400).json({ error: 'Title, description, and price in BDT are required' });
      }

      const calculatedCoins = priceCoins || Math.round(Number(priceBdt) / 10);
      const productId = `mkt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();
      const imagesJson = JSON.stringify(images.length > 0 ? images : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80']);

      runDb(
        db,
        `INSERT INTO marketplace_products (
          id, seller_id, title, description, price_bdt, price_coins,
          category, condition, location, images_json, phone, is_negotiable,
          status, views_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0, ?, ?)`,
        [
          productId,
          sellerId,
          title.trim(),
          description.trim(),
          Number(priceBdt),
          Number(calculatedCoins),
          category || 'General',
          condition,
          location || 'Dhaka',
          imagesJson,
          phone || '',
          isNegotiable ? 1 : 0,
          now,
          now,
        ]
      );

      // Reward points to seller for creating a listing (5 coins reward)
      runDb(db, 'UPDATE users SET coins_balance = coins_balance + 5 WHERE id = ?', [sellerId]);

      res.status(201).json({
        success: true,
        productId,
        message: 'Product listed on Marketplace successfully! (+5 bonus coins earned)',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create product listing' });
    }
  });

  // 4. PUT /api/marketplace/products/:id - Update product listing or mark as sold
  router.put('/api/marketplace/products/:id', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const productId = req.params.id;
      const userId = req.user!.id;

      const existing = queryDbOne(db, 'SELECT * FROM marketplace_products WHERE id = ?', [productId]);
      if (!existing) {
        return res.status(404).json({ error: 'Product not found' });
      }

      if (String(existing.seller_id) !== String(userId) && req.user!.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized to edit this listing' });
      }

      const { title, description, priceBdt, priceCoins, category, condition, location, phone, status, isNegotiable } = req.body;
      const now = new Date().toISOString();

      runDb(
        db,
        `UPDATE marketplace_products SET
          title = COALESCE(?, title),
          description = COALESCE(?, description),
          price_bdt = COALESCE(?, price_bdt),
          price_coins = COALESCE(?, price_coins),
          category = COALESCE(?, category),
          condition = COALESCE(?, condition),
          location = COALESCE(?, location),
          phone = COALESCE(?, phone),
          status = COALESCE(?, status),
          is_negotiable = COALESCE(?, is_negotiable),
          updated_at = ?
        WHERE id = ?`,
        [
          title ? title.trim() : null,
          description ? description.trim() : null,
          priceBdt !== undefined ? Number(priceBdt) : null,
          priceCoins !== undefined ? Number(priceCoins) : null,
          category || null,
          condition || null,
          location || null,
          phone || null,
          status || null,
          isNegotiable !== undefined ? (isNegotiable ? 1 : 0) : null,
          now,
          productId,
        ]
      );

      res.json({ success: true, message: 'Product listing updated successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update product' });
    }
  });

  // 5. DELETE /api/marketplace/products/:id - Delete product listing
  router.delete('/api/marketplace/products/:id', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const productId = req.params.id;
      const userId = req.user!.id;

      const existing = queryDbOne(db, 'SELECT * FROM marketplace_products WHERE id = ?', [productId]);
      if (!existing) {
        return res.status(404).json({ error: 'Product not found' });
      }

      if (String(existing.seller_id) !== String(userId) && req.user!.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized to delete this listing' });
      }

      runDb(db, 'DELETE FROM marketplace_products WHERE id = ?', [productId]);
      res.json({ success: true, message: 'Product listing deleted' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete product' });
    }
  });

  // 6. POST /api/marketplace/orders - Place order (Coins or PayStation/bKash/COD)
  router.post('/api/marketplace/orders', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const buyerId = req.user!.id;
      const {
        productId,
        paymentMethod = 'coins', // 'coins', 'paystation', 'bkash', 'cod'
        deliveryAddress,
        buyerPhone,
        orderNotes,
      } = req.body;

      if (!productId || !deliveryAddress || !buyerPhone) {
        return res.status(400).json({ error: 'Product ID, delivery address, and contact phone are required' });
      }

      const product = queryDbOne(db, 'SELECT * FROM marketplace_products WHERE id = ?', [productId]);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      if (product.status !== 'active') {
        return res.status(400).json({ error: 'This item is no longer available for purchase' });
      }

      if (String(product.seller_id) === String(buyerId)) {
        return res.status(400).json({ error: 'You cannot buy your own product' });
      }

      const buyer = queryDbOne(db, 'SELECT * FROM users WHERE id = ?', [buyerId]);
      if (!buyer) {
        return res.status(404).json({ error: 'Buyer account not found' });
      }

      const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      // Handle Coin payment
      if (paymentMethod === 'coins') {
        const requiredCoins = Number(product.price_coins);
        if ((buyer.coins_balance || 0) < requiredCoins) {
          return res.status(400).json({
            error: 'আপনার পর্যাপ্ত কয়েন নেই। দয়া করে কয়েন রিচার্জ করুন।',
            requiredCoins,
            currentBalance: buyer.coins_balance || 0,
          });
        }

        // Deduct from buyer
        runDb(db, 'UPDATE users SET coins_balance = coins_balance - ? WHERE id = ?', [requiredCoins, buyerId]);

        // Credit to seller (platform escrow / settlement)
        runDb(db, 'UPDATE users SET coins_balance = coins_balance + ? WHERE id = ?', [requiredCoins, product.seller_id]);

        // Record coin transactions
        const txId1 = `tx_${Date.now()}_1`;
        const txId2 = `tx_${Date.now()}_2`;
        runDb(
          db,
          `INSERT INTO coin_transactions (id, user_id, amount, type, description, created_at)
           VALUES (?, ?, ?, 'marketplace_purchase', ?, ?)`,
          [txId1, buyerId, -requiredCoins, `Purchased: ${product.title}`, now]
        );
        runDb(
          db,
          `INSERT INTO coin_transactions (id, user_id, amount, type, description, created_at)
           VALUES (?, ?, ?, 'marketplace_sale', ?, ?)`,
          [txId2, product.seller_id, requiredCoins, `Sold: ${product.title}`, now]
        );
      }

      // Create Order Record
      runDb(
        db,
        `INSERT INTO marketplace_orders (
          id, product_id, buyer_id, seller_id, payment_method,
          amount_paid, coins_paid, delivery_address, buyer_phone, order_notes,
          status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)`,
        [
          orderId,
          productId,
          buyerId,
          product.seller_id,
          paymentMethod,
          product.price_bdt,
          paymentMethod === 'coins' ? product.price_coins : 0,
          deliveryAddress.trim(),
          buyerPhone.trim(),
          orderNotes ? orderNotes.trim() : '',
          now,
          now,
        ]
      );

      // Notify seller
      try {
        createNotification(
          product.seller_id,
          buyerId,
          'system',
          `🎉 New Order! ${buyer.full_name || buyer.username} placed an order for "${product.title}" (${paymentMethod.toUpperCase()}).`,
          orderId
        );
      } catch (_) {}

      res.status(201).json({
        success: true,
        orderId,
        message: 'Order placed successfully! The seller has been notified.',
      });
    } catch (err: any) {
      console.error('Order error:', err);
      res.status(500).json({ error: err.message || 'Failed to process order' });
    }
  });

  // 7. GET /api/marketplace/my-listings - User's listed items
  router.get('/api/marketplace/my-listings', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const rows = queryDbAll(
        db,
        `SELECT * FROM marketplace_products WHERE seller_id = ? ORDER BY created_at DESC`,
        [userId]
      ) || [];

      const listings = rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        priceBdt: r.price_bdt,
        priceCoins: r.price_coins,
        category: r.category,
        condition: r.condition,
        location: r.location,
        images: JSON.parse(r.images_json || '[]'),
        phone: r.phone,
        isNegotiable: Boolean(r.is_negotiable),
        status: r.status,
        viewsCount: r.views_count,
        createdAt: r.created_at,
      }));

      res.json({ success: true, listings });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch your listings' });
    }
  });

  // 8. GET /api/marketplace/my-orders - User's purchases and sales
  router.get('/api/marketplace/my-orders', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;

      const purchaseRows = queryDbAll(
        db,
        `SELECT o.*, p.title as product_title, p.images_json, u.full_name as seller_name, u.username as seller_username
         FROM marketplace_orders o
         JOIN marketplace_products p ON o.product_id = p.id
         JOIN users u ON o.seller_id = u.id
         WHERE o.buyer_id = ?
         ORDER BY o.created_at DESC`,
        [userId]
      ) || [];

      const saleRows = queryDbAll(
        db,
        `SELECT o.*, p.title as product_title, p.images_json, u.full_name as buyer_name, u.username as buyer_username
         FROM marketplace_orders o
         JOIN marketplace_products p ON o.product_id = p.id
         JOIN users u ON o.buyer_id = u.id
         WHERE o.seller_id = ?
         ORDER BY o.created_at DESC`,
        [userId]
      ) || [];

      res.json({
        success: true,
        purchases: purchaseRows.map((r: any) => ({
          ...r,
          images: JSON.parse(r.images_json || '[]'),
        })),
        sales: saleRows.map((r: any) => ({
          ...r,
          images: JSON.parse(r.images_json || '[]'),
        })),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch orders' });
    }
  });
}
