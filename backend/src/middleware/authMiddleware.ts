import { Request, Response, NextFunction } from 'express';
import { auth } from '../lib/firebase';
import logger from '../lib/logger';
import prisma from '../lib/prisma';

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Token de autenticação ausente ou inválido no cabeçalho');
      res.status(401).json({ error: 'Unauthorized: Missing or invalid token format' });
      return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      logger.warn('Token de autenticação vazio após Bearer');
      res.status(401).json({ error: 'Unauthorized: Token is empty' });
      return;
    }

    const decodedToken = await auth.verifyIdToken(token);

    // Busca o usuário no banco de dados com base no firebaseUid
    const dbUser = await prisma.usuario.findUnique({
      where: { firebaseUid: decodedToken.uid },
    });

    if (!dbUser) {
      logger.warn({ uid: decodedToken.uid }, 'Usuário não encontrado no banco de dados');
      res.status(401).json({ error: 'Unauthorized: User not registered in database' });
      return;
    }

    // Injeta o token decodificado, lojaId e role no objeto de request
    req.user = {
      ...decodedToken,
      lojaId: dbUser.lojaId,
      role: dbUser.role,
    };

    next();
  } catch (error) {
    logger.error({ err: error }, 'Falha na validação do token Firebase');
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
