import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRouter from './routes/chat';
import historyRouter from './routes/history';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Prisma client
const prisma = new PrismaClient({
     log: ['query', 'error', 'warn']
});

// Test database connection
prisma
     .$connect()
     .then(() => {
          console.log('✅ Database connection established');
     })
     .catch((err) => {
          console.error('❌ Database connection failed:', err);
     });

// Configure CORS
const corsOptions = {
     origin: ['http://localhost:5173', 'http://localhost:3000'],
     methods: ['GET', 'POST', 'PATCH', 'DELETE'],
     allowedHeaders: ['Content-Type'],
     credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

app.use('/chat', chatRouter);
app.use('/history', historyRouter);
app.get('/', (_, res) => {
     res.send('🤖 LangChain Chatbot API is live');
});

app.listen(PORT, () => {
     console.log(`🚀 Server running at http://localhost:${PORT}`);
});
