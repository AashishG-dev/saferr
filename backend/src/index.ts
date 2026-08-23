import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { apiRouter } from './routes/api.js';
import { setupSockets } from './sockets/index.js';

const app = express();
const server = http.createServer(app);

const corsOrigin = process.env.CORS_ORIGIN || '*';
const allowedOrigins = corsOrigin.includes(',') 
  ? corsOrigin.split(',').map(o => o.trim()) 
  : corsOrigin;

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  },
  maxHttpBufferSize: 1e8 // 100MB for base64 screenshot uploads
});

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Root & Health Check
app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Saferr Parental Safety Platform API',
    version: '1.0.0',
    endpoints: {
      devices: '/api/devices',
      health: '/health'
    }
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), platform: 'Saferr' });
});

// API Routes
app.use('/api', apiRouter);

// Setup Sockets & WebRTC signaling
setupSockets(io);

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🛡️  Saferr Backend Server Running`);
  console.log(`📍 API Base: http://localhost:${PORT}/api`);
  console.log(`⚡ WebSocket / WebRTC Signaling: ws://localhost:${PORT}`);
  console.log(`=========================================`);
});
