import express, { RequestHandler } from 'express';
import { getResponse } from '../llm/chatEngine';

const router = express.Router();

const chatHandler: RequestHandler = async (req, res) => {
     const { message, sessionId } = req.body;

     if (!message || !sessionId) {
          res.status(400).json({ error: 'Missing message or sessionId' });
          return;
     }

     try {
          const reply = await getResponse(message, sessionId);
          res.json({ reply });
     } catch (err) {
          console.error('❌ Error in /chat:', err);
          res.status(500).json({ error: 'Internal server error' });
     }
};

router.post('/', chatHandler);

export default router;
