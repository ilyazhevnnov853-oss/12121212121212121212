import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me';

export interface AuthenticatedSocket extends Socket {
  user?: any;
}

let io: Server;

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: '*', // В продакшене лучше указать конкретные домены фронтенда
      methods: ['GET', 'POST']
    }
  });

  // Middleware для проверки JWT токена
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token;
    
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.user?.name} (${socket.user?.id})`);

    // Подключение к комнате проекта
    socket.on('joinProject', (projectId: string) => {
      socket.join(projectId);
      console.log(`User ${socket.user?.name} joined project room: ${projectId}`);
    });

    // Отключение от комнаты (опционально)
    socket.on('leaveProject', (projectId: string) => {
      socket.leave(projectId);
      console.log(`User ${socket.user?.name} left project room: ${projectId}`);
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user?.name}`);
    });
  });

  return io;
};

export const getIo = () => {
  if (!io) {
    throw new Error('Socket.io is not initialized!');
  }
  return io;
};
