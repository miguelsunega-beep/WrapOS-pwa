import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/authMiddleware';
import logger from '../lib/logger';

const router = Router();
const prisma = new PrismaClient();

// Aplica o middleware de autenticação para todas as rotas deste arquivo
router.use(authMiddleware);

// GET / - Retorna todas as ordens de serviço filtradas pelo usuário logado
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // req.user é injetado pelo authMiddleware após verificação bem sucedida no Firebase
    const userId = req.user?.uid;

    if (!userId) {
      logger.error('userId ausente no request após passar pelo authMiddleware');
      res.status(500).json({ error: 'Internal server error: user identification failed' });
      return;
    }

    const ordens = await prisma.ordemServico.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        numero: 'desc',
      },
    });

    res.json(ordens);
  } catch (error) {
    logger.error({ err: error }, 'Erro ao buscar ordens de serviço do usuário');
    res.status(500).json({ error: 'Error fetching service orders' });
  }
});

export default router;
