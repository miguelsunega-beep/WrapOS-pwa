import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import logger from '../lib/logger';
import prisma from '../lib/prisma';

const router = Router();

// Aplica o middleware de autenticação para todas as rotas deste arquivo
router.use(authMiddleware);

// GET / - Retorna todas as ordens de serviço filtradas pela loja logada
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // req.user é injetado pelo authMiddleware após verificação bem sucedida no Firebase
    const lojaId = req.user?.lojaId;

    if (!lojaId) {
      logger.error('lojaId ausente no request após passar pelo authMiddleware');
      res.status(500).json({ error: 'Internal server error: store identification failed' });
      return;
    }

    const ordens = await prisma.ordemServico.findMany({
      where: {
        lojaId: lojaId,
      },
      orderBy: {
        numero: 'desc',
      },
    });

    res.json(ordens);
  } catch (error) {
    logger.error({ err: error }, 'Erro ao buscar ordens de serviço da loja');
    res.status(500).json({ error: 'Error fetching service orders' });
  }
});

export default router;
