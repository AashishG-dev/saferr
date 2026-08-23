import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { apiRouter } from './routes/api.js';
import { setupSockets } from './sockets/index.js';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  },
  maxHttpBufferSize: 1e8 // 100MB for base64 screenshot uploads
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// API Routes
app.use('/api', apiRouter);

// Setup Sockets & WebRTC signaling
setupSockets(io);

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🛡️  Parental Control Backend Server Running`);
  console.log(`📍 API Base: http://localhost:${PORT}/api`);
  console.log(`⚡ WebSocket / WebRTC Signaling: ws://localhost:${PORT}`);
  console.log(`=========================================`);
});
