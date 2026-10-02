import { Request, Response, NextFunction } from 'express';
import {
  getHelpArticles,
  incrementHelpArticleViews,
  createHelpArticle,
  updateHelpArticle,
  deleteHelpArticle,
  getSupportMetrics,
} from './supportEngine.js';
import { queryDbAll, queryDbOne, runDb } from './database.js';

export function registerSupportRoutes(app: any, db: any, io: any, authenticateToken: any) {
  const requireSupportAccess = (req: any, res: Response, next: NextFunction) => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'support_agent' && req.user.role !== 'moderator')) {
      return res.status(403).json({ error: 'Support Agent or Admin authorization required' });
    }
    next();
  };

  // ----------------------------------------------------
  // 1. HELP ARTICLES & KNOWLEDGE BASE ENDPOINTS
  // ----------------------------------------------------
  app.get('/api/help/articles', (req: Request, res: Response) => {
    try {
      const category = (req.query.category as string) || 'all';
      const search = (req.query.search as string) || (req.query.q as string) || '';
      const articles = getHelpArticles(db, { category, search });
      res.json({ articles });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch help articles' });
    }
  });

  app.get('/api/help/articles/:id', (req: Request, res: Response) => {
    try {
      const article = queryDbOne(db, 'SELECT * FROM help_articles WHERE id = ?', [req.params.id]);
      if (!article) return res.status(404).json({ error: 'Help article not found' });
      incrementHelpArticleViews(db, req.params.id);
      res.json({ article: { ...article, views: article.views + 1 } });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch article' });
    }
  });

  app.post('/api/admin/help/articles', authenticateToken, requireSupportAccess, (req: any, res: Response) => {
    const { category, title, content, keywords } = req.body;
    if (!category || !title || !content) {
      return res.status(400).json({ error: 'Category, title, and content are required' });
    }
    try {
      const articleId = createHelpArticle(db, { category, title, content, keywords });
      res.status(201).json({ success: true, articleId });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create help article' });
    }
  });

  app.put('/api/admin/help/articles/:id', authenticateToken, requireSupportAccess, (req: any, res: Response) => {
    try {
      updateHelpArticle(db, req.params.id, req.body);
      res.json({ success: true, message: 'Article updated successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update help article' });
    }
  });

  app.delete('/api/admin/help/articles/:id', authenticateToken, requireSupportAccess, (req: any, res: Response) => {
    try {
      deleteHelpArticle(db, req.params.id);
      res.json({ success: true, message: 'Article deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete help article' });
    }
  });

  // ----------------------------------------------------
  // 2. SUPPORT TICKETS ENDPOINTS
  // ----------------------------------------------------
  app.post('/api/support/tickets', authenticateToken, (req: any, res: Response) => {
    const { category, type, subject, description, priority, attachment } = req.body;
    if (!subject || !description) {
      return res.status(400).json({ error: 'Subject and description are required' });
    }

    const ticketCategory = category || type || 'general';
    const ticketId = `tkt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    try {
      runDb(
        db,
        `INSERT INTO support_tickets (id, user_id, category, type, subject, description, priority, status, attachment, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)`,
        [ticketId, req.user!.id, ticketCategory, ticketCategory, subject, description, priority || 'normal', attachment || null, now, now]
      );

      // Create initial message
      const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      runDb(
        db,
        `INSERT INTO support_messages (id, ticket_id, sender_id, sender_role, message, attachment, created_at)
         VALUES (?, ?, ?, 'user', ?, ?, ?)`,
        [msgId, ticketId, req.user!.id, description, attachment || null, now]
      );

      res.status(201).json({ success: true, ticketId, message: 'Support ticket created successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create ticket' });
    }
  });

  app.get('/api/support/tickets', authenticateToken, (req: any, res: Response) => {
    try {
      const tickets = queryDbAll(
        db,
        `SELECT st.*, u.full_name as user_name, u.email as user_email, u.avatar_url as user_avatar,
                agent.full_name as assigned_agent_name
         FROM support_tickets st
         LEFT JOIN users u ON st.user_id = u.id
         LEFT JOIN users agent ON st.assigned_to = agent.id
         WHERE st.user_id = ? ORDER BY st.updated_at DESC`,
        [req.user!.id]
      );
      res.json({ tickets });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch tickets' });
    }
  });

  app.get('/api/support/tickets/:id', authenticateToken, (req: any, res: Response) => {
    try {
      const isAgentOrAdmin = req.user!.role === 'admin' || req.user!.role === 'support_agent' || req.user!.role === 'moderator';
      const ticket = queryDbOne(
        db,
        `SELECT st.*, u.full_name as user_name, u.email as user_email, u.avatar_url as user_avatar,
                agent.full_name as assigned_agent_name
         FROM support_tickets st
         LEFT JOIN users u ON st.user_id = u.id
         LEFT JOIN users agent ON st.assigned_to = agent.id
         WHERE st.id = ? AND (st.user_id = ? OR ? = 1)`,
        [req.params.id, req.user!.id, isAgentOrAdmin ? 1 : 0]
      );

      if (!ticket) return res.status(404).json({ error: 'Support ticket not found' });

      const messages = queryDbAll(
        db,
        `SELECT sm.*, u.full_name as sender_name, u.avatar_url as sender_avatar
         FROM support_messages sm
         LEFT JOIN users u ON sm.sender_id = u.id
         WHERE sm.ticket_id = ? ORDER BY sm.created_at ASC`,
        [req.params.id]
      );

      res.json({ ticket, messages });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch ticket details' });
    }
  });

  app.post('/api/support/tickets/:id/messages', authenticateToken, (req: any, res: Response) => {
    const { message, attachment } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    try {
      const isAgentOrAdmin = req.user!.role === 'admin' || req.user!.role === 'support_agent' || req.user!.role === 'moderator';
      const ticket = queryDbOne(
        db,
        `SELECT * FROM support_tickets WHERE id = ? AND (user_id = ? OR ? = 1)`,
        [req.params.id, req.user!.id, isAgentOrAdmin ? 1 : 0]
      );

      if (!ticket) return res.status(404).json({ error: 'Support ticket not found' });

      const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();
      const senderRole = isAgentOrAdmin ? (req.user!.role === 'support_agent' ? 'support_agent' : 'admin') : 'user';

      runDb(
        db,
        `INSERT INTO support_messages (id, ticket_id, sender_id, sender_role, message, attachment, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [msgId, req.params.id, req.user!.id, senderRole, message.trim(), attachment || null, now]
      );

      // Determine updated status: if user replies, set to 'open' or 'waiting'; if agent replies, set status to 'assigned' or 'waiting' for user reply
      let nextStatus = ticket.status;
      if (!isAgentOrAdmin) {
        nextStatus = ticket.status === 'closed' || ticket.status === 'resolved' ? 'open' : ticket.status;
      } else {
        nextStatus = 'waiting'; // Waiting on user response
      }

      runDb(
        db,
        `UPDATE support_tickets SET updated_at = ?, status = ? WHERE id = ?`,
        [now, nextStatus, req.params.id]
      );

      res.json({ success: true, messageId: msgId, status: nextStatus });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to post message' });
    }
  });

  // Admin Ticket Management API
  app.get('/api/admin/support/tickets', authenticateToken, requireSupportAccess, (req: any, res: Response) => {
    try {
      const status = req.query.status as string;
      const category = req.query.category as string;
      const search = req.query.search as string;

      let sql = `
        SELECT st.*, u.username, u.full_name as user_name, u.email as user_email, u.avatar_url as user_avatar,
               agent.full_name as assigned_agent_name
        FROM support_tickets st
        LEFT JOIN users u ON st.user_id = u.id
        LEFT JOIN users agent ON st.assigned_to = agent.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (status && status !== 'all') {
        sql += ` AND st.status = ?`;
        params.push(status);
      }

      if (category && category !== 'all') {
        sql += ` AND (st.category = ? OR st.type = ?)`;
        params.push(category, category);
      }

      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        sql += ` AND (st.subject LIKE ? OR st.description LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)`;
        params.push(term, term, term, term);
      }

      sql += ` ORDER BY CASE st.status
                WHEN 'open' THEN 1
                WHEN 'waiting' THEN 2
                WHEN 'assigned' THEN 3
                WHEN 'resolved' THEN 4
                ELSE 5 END, st.updated_at DESC`;

      const tickets = queryDbAll(db, sql, params);
      res.json({ tickets });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch admin tickets' });
    }
  });

  app.put('/api/admin/support/tickets/:id/status', authenticateToken, requireSupportAccess, (req: any, res: Response) => {
    const { status, assignedTo } = req.body;
    const allowedStatuses = ['open', 'assigned', 'waiting', 'resolved', 'closed'];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid ticket status' });
    }

    try {
      const ticket = queryDbOne(db, 'SELECT * FROM support_tickets WHERE id = ?', [req.params.id]);
      if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

      const now = new Date().toISOString();
      const closedAt = status === 'closed' || status === 'resolved' ? now : null;
      const newAssignedTo = assignedTo !== undefined ? assignedTo : (status === 'assigned' && !ticket.assigned_to ? req.user!.id : ticket.assigned_to);

      runDb(
        db,
        `UPDATE support_tickets SET status = ?, assigned_to = ?, closed_at = ?, updated_at = ? WHERE id = ?`,
        [status || ticket.status, newAssignedTo, closedAt, now, req.params.id]
      );

      res.json({ success: true, status: status || ticket.status, assignedTo: newAssignedTo });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update ticket status' });
    }
  });

  // ----------------------------------------------------
  // 3. LIVE SUPPORT CHAT ENDPOINTS
  // ----------------------------------------------------
  app.post('/api/support/chat/start', authenticateToken, (req: any, res: Response) => {
    const { subject, category, initialMessage, attachment } = req.body;
    const userId = req.user!.id;
    const now = new Date().toISOString();

    try {
      // Check if user has an existing waiting or active chat
      const existing = queryDbOne(
        db,
        `SELECT * FROM support_chats WHERE user_id = ? AND status IN ('waiting', 'active') LIMIT 1`,
        [userId]
      );

      if (existing) {
        return res.json({ success: true, chatId: existing.id, isExisting: true, status: existing.status });
      }

      const chatId = `schat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      runDb(
        db,
        `INSERT INTO support_chats (id, user_id, subject, category, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'waiting', ?, ?)`,
        [chatId, userId, subject || 'Live Support Inquiry', category || 'general', now, now]
      );

      if (initialMessage && initialMessage.trim()) {
        const msgId = `smsg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        runDb(
          db,
          `INSERT INTO support_chat_messages (id, chat_id, sender_id, sender_role, message, attachment, is_read, created_at)
           VALUES (?, ?, ?, 'user', ?, ?, 0, ?)`,
          [msgId, chatId, userId, initialMessage.trim(), attachment || null, now]
        );
      }

      // Socket notification to support agents
      io.to('support_agents').emit('new_waiting_chat', {
        chatId,
        userId,
        userName: req.user!.username,
        subject: subject || 'Live Support Inquiry',
        category: category || 'general',
        initialMessage: initialMessage || '',
        createdAt: now,
      });

      res.status(201).json({ success: true, chatId, status: 'waiting' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to start live support chat' });
    }
  });

  app.get('/api/support/chat/active', authenticateToken, (req: any, res: Response) => {
    try {
      const chat = queryDbOne(
        db,
        `SELECT sc.*, agent.full_name as assigned_agent_name, agent.avatar_url as assigned_agent_avatar
         FROM support_chats sc
         LEFT JOIN users agent ON sc.assigned_agent_id = agent.id
         WHERE sc.user_id = ? AND sc.status IN ('waiting', 'active')
         ORDER BY sc.created_at DESC LIMIT 1`,
        [req.user!.id]
      );

      if (!chat) return res.json({ chat: null });

      const messages = queryDbAll(
        db,
        `SELECT scm.*, u.full_name as sender_name, u.avatar_url as sender_avatar
         FROM support_chat_messages scm
         LEFT JOIN users u ON scm.sender_id = u.id
         WHERE scm.chat_id = ? ORDER BY scm.created_at ASC`,
        [chat.id]
      );

      res.json({ chat, messages });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch active support chat' });
    }
  });

  app.get('/api/support/chat/:id/messages', authenticateToken, (req: any, res: Response) => {
    try {
      const isAgentOrAdmin = req.user!.role === 'admin' || req.user!.role === 'support_agent' || req.user!.role === 'moderator';
      const chat = queryDbOne(
        db,
        `SELECT * FROM support_chats WHERE id = ? AND (user_id = ? OR ? = 1)`,
        [req.params.id, req.user!.id, isAgentOrAdmin ? 1 : 0]
      );

      if (!chat) return res.status(404).json({ error: 'Chat session not found' });

      const messages = queryDbAll(
        db,
        `SELECT scm.*, u.full_name as sender_name, u.avatar_url as sender_avatar
         FROM support_chat_messages scm
         LEFT JOIN users u ON scm.sender_id = u.id
         WHERE scm.chat_id = ? ORDER BY scm.created_at ASC`,
        [req.params.id]
      );

      res.json({ chat, messages });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch chat messages' });
    }
  });

  app.post('/api/support/chat/:id/message', authenticateToken, (req: any, res: Response) => {
    const { message, attachment } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    try {
      const isAgentOrAdmin = req.user!.role === 'admin' || req.user!.role === 'support_agent' || req.user!.role === 'moderator';
      const chat = queryDbOne(
        db,
        `SELECT * FROM support_chats WHERE id = ? AND (user_id = ? OR ? = 1)`,
        [req.params.id, req.user!.id, isAgentOrAdmin ? 1 : 0]
      );

      if (!chat) return res.status(404).json({ error: 'Chat session not found' });

      const msgId = `smsg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();
      const senderRole = isAgentOrAdmin ? 'agent' : 'user';

      runDb(
        db,
        `INSERT INTO support_chat_messages (id, chat_id, sender_id, sender_role, message, attachment, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
        [msgId, req.params.id, req.user!.id, senderRole, message.trim(), attachment || null, now]
      );

      let firstResp = chat.first_response_at;
      if (isAgentOrAdmin && !firstResp) {
        firstResp = now;
      }

      runDb(
        db,
        `UPDATE support_chats SET updated_at = ?, first_response_at = ? WHERE id = ?`,
        [now, firstResp, req.params.id]
      );

      const msgPayload = {
        id: msgId,
        chatId: req.params.id,
        senderId: req.user!.id,
        senderRole,
        message: message.trim(),
        attachment: attachment || null,
        isRead: 0,
        createdAt: now,
      };

      io.to(`support_chat_${req.params.id}`).emit('support_message_received', msgPayload);

      res.status(201).json({ success: true, message: msgPayload });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to post message' });
    }
  });

  // Admin Live Chat Console API
  app.get('/api/admin/support/chats', authenticateToken, requireSupportAccess, (req: any, res: Response) => {
    try {
      const statusFilter = (req.query.status as string) || 'all';

      let sql = `
        SELECT sc.*, u.full_name as user_name, u.username as user_username, u.avatar_url as user_avatar,
               agent.full_name as assigned_agent_name, agent.avatar_url as assigned_agent_avatar,
               (SELECT message FROM support_chat_messages WHERE chat_id = sc.id ORDER BY created_at DESC LIMIT 1) as last_message,
               (SELECT created_at FROM support_chat_messages WHERE chat_id = sc.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
               (SELECT COUNT(*) FROM support_chat_messages WHERE chat_id = sc.id AND sender_role = 'user' AND is_read = 0) as unread_count
        FROM support_chats sc
        LEFT JOIN users u ON sc.user_id = u.id
        LEFT JOIN users agent ON sc.assigned_agent_id = agent.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (statusFilter !== 'all') {
        sql += ` AND sc.status = ?`;
        params.push(statusFilter);
      }

      sql += ` ORDER BY CASE sc.status WHEN 'waiting' THEN 1 WHEN 'active' THEN 2 ELSE 3 END, sc.updated_at DESC`;

      const chats = queryDbAll(db, sql, params);
      res.json({ chats });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch support chats' });
    }
  });

  app.post('/api/admin/support/chat/:id/accept', authenticateToken, requireSupportAccess, (req: any, res: Response) => {
    try {
      const chatId = req.params.id;
      const chat = queryDbOne(db, 'SELECT * FROM support_chats WHERE id = ?', [chatId]);
      if (!chat) return res.status(404).json({ error: 'Support chat not found' });

      const now = new Date().toISOString();
      const firstResponse = chat.first_response_at || now;

      runDb(
        db,
        `UPDATE support_chats SET assigned_agent_id = ?, status = 'active', first_response_at = ?, updated_at = ? WHERE id = ?`,
        [req.user!.id, firstResponse, now, chatId]
      );

      // System message
      const sysMsgId = `smsg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const agentUser = queryDbOne(db, 'SELECT full_name FROM users WHERE id = ?', [req.user!.id]);
      const agentName = agentUser?.full_name || 'Support Agent';

      runDb(
        db,
        `INSERT INTO support_chat_messages (id, chat_id, sender_id, sender_role, message, is_read, created_at)
         VALUES (?, ?, ?, 'system', ?, 1, ?)`,
        [sysMsgId, chatId, req.user!.id, `Agent ${agentName} accepted the support chat session.`, now]
      );

      io.to(`support_chat_${chatId}`).emit('chat_accepted', {
        chatId,
        assignedAgentId: req.user!.id,
        assignedAgentName: agentName,
        status: 'active',
      });

      io.to('support_agents').emit('chat_status_changed', { chatId, status: 'active', assignedAgentId: req.user!.id });

      res.json({ success: true, message: 'Chat session accepted' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to accept chat' });
    }
  });

  app.post('/api/admin/support/chat/:id/transfer', authenticateToken, requireSupportAccess, (req: any, res: Response) => {
    const { targetAgentId } = req.body;
    if (!targetAgentId) return res.status(400).json({ error: 'Target agent ID is required' });

    try {
      const chatId = req.params.id;
      const targetAgent = queryDbOne(db, 'SELECT full_name FROM users WHERE id = ?', [targetAgentId]);
      if (!targetAgent) return res.status(404).json({ error: 'Target support agent not found' });

      const now = new Date().toISOString();
      runDb(
        db,
        `UPDATE support_chats SET assigned_agent_id = ?, updated_at = ? WHERE id = ?`,
        [targetAgentId, now, chatId]
      );

      // System message
      const sysMsgId = `smsg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      runDb(
        db,
        `INSERT INTO support_chat_messages (id, chat_id, sender_id, sender_role, message, is_read, created_at)
         VALUES (?, ?, ?, 'system', ?, 1, ?)`,
        [sysMsgId, chatId, req.user!.id, `Chat session transferred to agent ${targetAgent.full_name}.`, now]
      );

      io.to(`support_chat_${chatId}`).emit('chat_transferred', {
        chatId,
        assignedAgentId: targetAgentId,
        assignedAgentName: targetAgent.full_name,
      });

      io.to('support_agents').emit('chat_status_changed', { chatId, assignedAgentId: targetAgentId });

      res.json({ success: true, message: 'Chat transferred successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to transfer chat' });
    }
  });

  app.post('/api/admin/support/chat/:id/status', authenticateToken, requireSupportAccess, (req: any, res: Response) => {
    const { status } = req.body;
    if (!['waiting', 'active', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid chat status' });
    }

    try {
      const chatId = req.params.id;
      const now = new Date().toISOString();
      const closedAt = status === 'closed' ? now : null;

      runDb(
        db,
        `UPDATE support_chats SET status = ?, closed_at = ?, updated_at = ? WHERE id = ?`,
        [status, closedAt, now, chatId]
      );

      // System message
      const sysMsgId = `smsg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      runDb(
        db,
        `INSERT INTO support_chat_messages (id, chat_id, sender_id, sender_role, message, is_read, created_at)
         VALUES (?, ?, ?, 'system', ?, 1, ?)`,
        [sysMsgId, chatId, req.user!.id, `Chat session status changed to '${status}'.`, now]
      );

      io.to(`support_chat_${chatId}`).emit('chat_status_changed', { chatId, status });
      io.to('support_agents').emit('chat_status_changed', { chatId, status });

      res.json({ success: true, status });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update chat status' });
    }
  });

  app.get('/api/admin/support/agents', authenticateToken, requireSupportAccess, (req: any, res: Response) => {
    try {
      const agents = queryDbAll(
        db,
        `SELECT id, username, full_name, email, avatar_url, role
         FROM users
         WHERE role IN ('admin', 'support_agent', 'moderator') AND deleted_at IS NULL`
      );
      res.json({ agents });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch support agents' });
    }
  });

  app.get('/api/admin/support/metrics', authenticateToken, requireSupportAccess, (req: any, res: Response) => {
    try {
      const metrics = getSupportMetrics(db);
      res.json({ metrics });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch support metrics' });
    }
  });
}
