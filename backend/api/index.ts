import express from 'express';
import { createServer } from 'http'; // NOT needed anymore
import chatRouter from '../src/routes/chat';
import historyRouter from '../src/routes/history';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/chat', chatRouter);
app.use('/history', historyRouter);

export default app; // ✅ Key part for Vercel Node function!
