import express from 'express';
import { createServer } from 'http'; // NOT needed anymore
import chatRouter from '../src/routes/chat';
import historyRouter from '../src/routes/history';
import cors from 'cors';

const app = express();

// Configure CORS based on environment
const corsOptions = {
     origin:
          process.env.NODE_ENV === 'production'
               ? 'https://fieldpalmer.github.io'
               : ['http://localhost:5173', 'http://localhost:3000'],
     methods: ['GET', 'POST', 'PATCH', 'DELETE'],
     allowedHeaders: ['Content-Type'],
     credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

app.use('/chat', chatRouter);
app.use('/history', historyRouter);

export default app; // ✅ Key part for Vercel Node function!
