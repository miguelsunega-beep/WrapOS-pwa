-- Adiciona 'checkin' ao enum StatusOS: representa o carro que entrou pelo
-- Check-in Rápido mas ainda não tem serviço nem data de saída definidos
-- (ainda não operável). Só o fluxo de check-in vai setar esse status
-- explicitamente no insert — o @default do model OrdemServico continua
-- aguardando_aprovacao, sem mudança nos demais pontos de criação de OS.

-- AlterEnum
ALTER TYPE "StatusOS" ADD VALUE 'checkin';
