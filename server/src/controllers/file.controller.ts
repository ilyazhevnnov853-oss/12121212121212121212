import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// Настройка хранилища Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Генерируем уникальное имя файла, сохраняя оригинальное расширение
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

export const upload = multer({ storage });

// POST /files/upload
export const uploadFile = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const { projectId } = req.body;
    // @ts-ignore - Предполагается, что req.user устанавливается в auth.middleware
    const userId = req.user?.id;

    if (!file) {
      return res.status(400).json({ message: 'Файл не загружен' });
    }

    if (!projectId) {
      return res.status(400).json({ message: 'projectId обязателен' });
    }

    const newFile = await prisma.fileItem.create({
      data: {
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
        projectId,
        status: 'available'
      }
    });

    res.status(201).json(newFile);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Ошибка при загрузке файла' });
  }
};

// GET /files/project/:projectId
export const getProjectFiles = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    
    const files = await prisma.fileItem.findMany({
      where: { projectId },
      include: {
        lockedBy: {
          select: { id: true, name: true, role: true }
        },
        tags: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(files);
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ message: 'Ошибка при получении файлов' });
  }
};

// POST /files/:id/lock
export const lockFile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // @ts-ignore
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    const file = await prisma.fileItem.findUnique({ where: { id } });
    
    if (!file) {
      return res.status(404).json({ message: 'Файл не найден' });
    }

    if (file.status === 'locked' && file.lockedById !== userId) {
      return res.status(403).json({ message: 'Файл уже заблокирован другим пользователем' });
    }

    const updatedFile = await prisma.fileItem.update({
      where: { id },
      data: {
        status: 'locked',
        lockedById: userId
      },
      include: {
        lockedBy: { select: { id: true, name: true } }
      }
    });

    res.json(updatedFile);
  } catch (error) {
    console.error('Lock file error:', error);
    res.status(500).json({ message: 'Ошибка при блокировке файла' });
  }
};

// POST /files/:id/unlock
export const unlockFile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // @ts-ignore
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    const file = await prisma.fileItem.findUnique({ where: { id } });
    
    if (!file) {
      return res.status(404).json({ message: 'Файл не найден' });
    }

    // Разрешаем разблокировать только тому, кто заблокировал, либо админу (в реальном приложении)
    if (file.status === 'locked' && file.lockedById !== userId) {
      // @ts-ignore
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Вы не можете разблокировать чужой файл' });
      }
    }

    const updatedFile = await prisma.fileItem.update({
      where: { id },
      data: {
        status: 'available',
        lockedById: null
      }
    });

    res.json(updatedFile);
  } catch (error) {
    console.error('Unlock file error:', error);
    res.status(500).json({ message: 'Ошибка при разблокировке файла' });
  }
};

// GET /files/download/:id
export const downloadFile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const file = await prisma.fileItem.findUnique({ where: { id } });
    
    if (!file) {
      return res.status(404).json({ message: 'Файл не найден' });
    }

    if (!fs.existsSync(file.path)) {
      return res.status(404).json({ message: 'Файл физически не найден на сервере' });
    }

    res.download(file.path, file.originalName);
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({ message: 'Ошибка при скачивании файла' });
  }
};

// POST /files/:id/tags
export const attachTagsToFile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tagIds } = req.body; // Array of Tag IDs

    const updatedFile = await prisma.fileItem.update({
      where: { id },
      data: {
        tags: {
          connect: tagIds.map((tagId: string) => ({ id: tagId }))
        }
      },
      include: { tags: true }
    });

    res.json(updatedFile);
  } catch (error) {
    console.error('Attach tags error:', error);
    res.status(500).json({ message: 'Ошибка при привязке тегов к файлу' });
  }
};
