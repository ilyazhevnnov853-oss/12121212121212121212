import { Request, Response, NextFunction } from 'express';

/**
 * Middleware для проверки роли пользователя.
 * @param allowedRoles Массив ролей, которым разрешен доступ (например, ['admin', 'hvac_engineer'])
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Убедимся, что пользователь авторизован (этот middleware должен идти после auth.middleware)
    if (!req.user) {
      return res.status(401).json({ message: 'Пользователь не авторизован' });
    }

    // Проверяем, есть ли роль пользователя в списке разрешенных
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Недостаточно прав для выполнения операции',
        requiredRoles: allowedRoles,
        userRole: req.user.role
      });
    }

    // Если роль подходит, пропускаем дальше
    next();
  };
};