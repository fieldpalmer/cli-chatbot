import express, { Request, Response, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import { getResponse } from '../llm/chatEngine';

// Create a singleton Prisma client instance
const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prisma =
     globalForPrisma.prisma ||
     new PrismaClient({
          log: ['query', 'error', 'warn']
     });

if (process.env.NODE_ENV !== 'production') {
     globalForPrisma.prisma = prisma;
}

const router = express.Router();

// 🔄 Get all sessions with names
router.get('/sessions', async (_, res) => {
     try {
          console.log('Attempting to fetch sessions...');
          const sessions = await prisma.session.findMany({
               orderBy: { createdAt: 'desc' },
               select: {
                    id: true,
                    name: true,
                    createdAt: true
               }
          });
          console.log('Successfully fetched sessions:', sessions);
          res.json(sessions);
     } catch (err) {
          console.error('Detailed error fetching sessions:', err);
          res.status(500).json({
               error: 'Failed to fetch sessions.',
               details: err instanceof Error ? err.message : 'Unknown error'
          });
     }
});

// 💬 Get message history for a session
router.get('/:sessionId', async (req, res) => {
     const { sessionId } = req.params;

     try {
          const messages = await prisma.message.findMany({
               where: { sessionId },
               orderBy: { timestamp: 'asc' }
          });
          res.json(messages);
     } catch (err) {
          res.status(500).json({ error: 'Failed to fetch messages.' });
     }
});

// ➕ Create new session
router.post('/', (async (req, res) => {
     const { id, name } = req.body;

     if (!id || !name) {
          return res.status(400).json({ error: 'Missing id or name' });
     }

     try {
          const session = await prisma.session.create({
               data: {
                    id,
                    name
               }
          });
          res.status(201).json(session);
     } catch (err) {
          console.error('Error creating session:', err);
          res.status(500).json({ error: 'Failed to create session' });
     }
}) as RequestHandler);

// ✏️ Rename a session
router.patch('/:sessionId', (async (req, res) => {
     const { sessionId } = req.params;
     const { name } = req.body;

     if (!name || name.trim().length < 1) {
          return res.status(400).json({ error: 'Session name required.' });
     }

     try {
          const updated = await prisma.session.update({
               where: { id: sessionId },
               data: { name }
          });
          res.json(updated);
     } catch (err) {
          res.status(500).json({ error: 'Failed to rename session.' });
     }
}) as RequestHandler);

// 🗑 Delete a session and its messages
router.delete('/:sessionId', async (req, res) => {
     const { sessionId } = req.params;

     try {
          await prisma.session.delete({ where: { id: sessionId } });
          res.json({ success: true });
     } catch (err) {
          res.status(500).json({ error: 'Failed to delete session.' });
     }
}) as RequestHandler;

export default router;
