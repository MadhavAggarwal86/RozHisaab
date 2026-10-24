import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import aiRoutes from './routes/ai.js';
import billRoutes from './routes/bills.js';

const { PORT = 5050, MONGO_URI, CLIENT_URL = 'http://localhost:5173' } = process.env;

if (!MONGO_URI || !process.env.JWT_SECRET) {
  console.error('MONGO_URI and JWT_SECRET must be set (backend/.env locally, environment variables in production)');
  process.exit(1);
}

// CLIENT_URL may list several origins separated by commas (e.g. the Vercel URL plus localhost)
const allowedOrigins = CLIENT_URL.split(',').map((url) => url.trim().replace(/\/+$/, '')).filter(Boolean);

const app = express();
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get('/', (req, res) => res.json({ ok: true }));
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/bills', billRoutes);

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
