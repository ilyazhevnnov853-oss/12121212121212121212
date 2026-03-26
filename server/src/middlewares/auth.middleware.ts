import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me';

// Расширяем интерфейс Request для добавления свойства user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Формат "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ message: 'Отсутствует токен авторизации' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Токен недействителен или истек' });
    }

    // Сохраняем расшифрованные данные пользователя в объект запроса
    req.user = decoded as { id: string; email: string; role: string };
    next();
  });
};