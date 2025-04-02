import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRouter from './routes/chat';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/chat', chatRouter);

app.get('/', (_, res) => {
     res.send('🤖 LangChain Chatbot API is live');
});

app.listen(PORT, () => {
     console.log(`🚀 Server running at http://localhost:${PORT}`);
});
