import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import logger from '../lib/logger';
import prisma from '../lib/prisma';

const router = Router();

// Aplica o middleware de autenticação
router.use(authMiddleware);

interface MigrationPayload {
  clientes?: any[];
  veiculos?: any[];
  ordens?: any[];
}

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.uid;
    const lojaId = req.user?.lojaId;
    if (!userId || !lojaId) {
      logger.error('userId ou lojaId ausente no request');
      res.status(401).json({ error: 'Unauthorized: User authentication and store assignment required' });
      return;
    }

    const { clientes = [], veiculos = [], ordens = [] } = req.body as MigrationPayload;

    logger.info(
      { userId, clientesCount: clientes.length, veiculosCount: veiculos.length, ordensCount: ordens.length },
      'Iniciando migração de dados localStorage para PostgreSQL'
    );

    // 1. Migração de Clientes
    for (const c of clientes) {
      await prisma.cliente.upsert({
        where: { id: c.id },
        update: {
          nome: c.nome,
          telefone: c.telefone,
          email: c.email,
          cpf: c.cpf,
          comoConheceu: c.comoConheceu,
          dataCadastro: c.dataCadastro ? new Date(c.dataCadastro) : new Date(),
          totalGasto: c.totalGasto || 0,
          cidade: c.cidade || null,
          status: c.status || 'ativo',
          userId: userId,
          lojaId: lojaId,
        },
        create: {
          id: c.id,
          nome: c.nome,
          telefone: c.telefone,
          email: c.email,
          cpf: c.cpf,
          comoConheceu: c.comoConheceu,
          dataCadastro: c.dataCadastro ? new Date(c.dataCadastro) : new Date(),
          totalGasto: c.totalGasto || 0,
          cidade: c.cidade || null,
          status: c.status || 'ativo',
          userId: userId,
          lojaId: lojaId,
        },
      });
    }

    // 2. Migração de Veículos
    for (const v of veiculos) {
      await prisma.veiculo.upsert({
        where: { id: v.id },
        update: {
          clienteId: v.clienteId,
          marca: v.marca,
          modelo: v.modelo,
          ano: v.ano,
          cor: v.cor,
          placa: v.placa,
          userId: userId,
          lojaId: lojaId,
        },
        create: {
          id: v.id,
          clienteId: v.clienteId,
          marca: v.marca,
          modelo: v.modelo,
          ano: v.ano,
          cor: v.cor,
          placa: v.placa,
          userId: userId,
          lojaId: lojaId,
        },
      });
    }

    // 3. Migração de Ordens de Serviço
    for (const o of ordens) {
      await prisma.ordemServico.upsert({
        where: { id: o.id },
        update: {
          numero: o.numero,
          clienteId: o.clienteId,
          veiculoId: o.veiculoId,
          servicos: o.servicos || [],
          valorTotal: o.valorTotal || 0,
          formaPagamento: o.formaPagamento,
          instaladorId: o.instaladorId,
          box: o.box,
          comissao: o.comissao || 0,
          observacoes: o.observacoes || '',
          status: o.status || 'aguardando_aprovacao',
          statusPagamento: o.statusPagamento || null,
          dataCriacao: o.dataCriacao ? new Date(o.dataCriacao) : new Date(),
          dataFinalizacao: o.dataFinalizacao ? new Date(o.dataFinalizacao) : null,
          dataSaidaPrevista: o.dataSaidaPrevista ? new Date(o.dataSaidaPrevista) : null,
          agendamentoId: o.agendamentoId || null,
          materiaisUsados: o.materiaisUsados || [],
          entregue: o.entregue !== undefined ? o.entregue : false,
          dataSaida: o.dataSaida ? new Date(o.dataSaida) : null,
          userId: userId,
          lojaId: lojaId,
        },
        create: {
          id: o.id,
          numero: o.numero,
          clienteId: o.clienteId,
          veiculoId: o.veiculoId,
          servicos: o.servicos || [],
          valorTotal: o.valorTotal || 0,
          formaPagamento: o.formaPagamento,
          instaladorId: o.instaladorId,
          box: o.box,
          comissao: o.comissao || 0,
          observacoes: o.observacoes || '',
          status: o.status || 'aguardando_aprovacao',
          statusPagamento: o.statusPagamento || null,
          dataCriacao: o.dataCriacao ? new Date(o.dataCriacao) : new Date(),
          dataFinalizacao: o.dataFinalizacao ? new Date(o.dataFinalizacao) : null,
          dataSaidaPrevista: o.dataSaidaPrevista ? new Date(o.dataSaidaPrevista) : null,
          agendamentoId: o.agendamentoId || null,
          materiaisUsados: o.materiaisUsados || [],
          entregue: o.entregue !== undefined ? o.entregue : false,
          dataSaida: o.dataSaida ? new Date(o.dataSaida) : null,
          userId: userId,
          lojaId: lojaId,
        },
      });
    }

    logger.info({ userId }, 'Migração de dados completada com sucesso');
    res.status(200).json({ success: true, message: 'Data migrated successfully' });
  } catch (error) {
    logger.error({ err: error }, 'Erro durante a migração de dados');
    res.status(500).json({ error: 'Migration failed' });
  }
});

export default router;
