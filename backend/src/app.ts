import path from 'path';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { env } from './config/env';
import { logger } from './config/logger';
import apiRoutes from './routes';
import { errorHandler, notFound } from './middlewares/errorHandler';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());

app.use(
  cors({
    origin: [env.FRONTEND_URL, env.ADMIN_URL],
    credentials: true,
  }),
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: env.NODE_ENV === 'development' ? 10000 : 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Çok fazla istek. Lütfen 15 dakika bekleyin.' },
  }),
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }),
);

app.use('/uploads', (_req, res, next) => {
  // Helmet sets CORP: same-origin by default, which blocks cross-origin <img> loads.
  // Uploaded product images are embedded by frontend (3000) and admin (3001).
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(process.cwd(), 'uploads')));
app.use('/api', apiRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
