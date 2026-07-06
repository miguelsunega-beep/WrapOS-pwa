-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "StatusCliente" AS ENUM ('ativo', 'inativo');

-- CreateEnum
CREATE TYPE "StatusOS" AS ENUM ('em_andamento', 'aguardando_material', 'aguardando_aprovacao', 'concluido', 'cancelado');

-- CreateEnum
CREATE TYPE "StatusPagamento" AS ENUM ('pago', 'a_receber');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'MANAGER', 'OPERATOR');

-- CreateEnum
CREATE TYPE "StatusAgendamento" AS ENUM ('agendado', 'confirmado', 'concluido', 'cancelado');

-- CreateEnum
CREATE TYPE "StatusGarantia" AS ENUM ('ativa', 'acionada', 'expirada');

-- CreateEnum
CREATE TYPE "TipoLancamento" AS ENUM ('entrada', 'saida');

-- CreateTable
CREATE TABLE "lojas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "plano" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lojas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "authUserId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "lojaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "comoConheceu" TEXT NOT NULL,
    "dataCadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalGasto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cidade" TEXT,
    "status" "StatusCliente" NOT NULL DEFAULT 'ativo',

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("lojaId","id")
);

-- CreateTable
CREATE TABLE "veiculos" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "cor" TEXT NOT NULL,
    "placa" TEXT NOT NULL,

    CONSTRAINT "veiculos_pkey" PRIMARY KEY ("lojaId","id")
);

-- CreateTable
CREATE TABLE "ordens_servico" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "clienteId" TEXT NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "servicos" JSONB NOT NULL,
    "valorTotal" DOUBLE PRECISION NOT NULL,
    "formaPagamento" TEXT NOT NULL,
    "instaladorId" TEXT NOT NULL,
    "box" INTEGER NOT NULL,
    "comissao" DOUBLE PRECISION NOT NULL,
    "observacoes" TEXT NOT NULL,
    "status" "StatusOS" NOT NULL DEFAULT 'aguardando_aprovacao',
    "statusPagamento" "StatusPagamento",
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataFinalizacao" TIMESTAMP(3),
    "dataSaidaPrevista" TIMESTAMP(3),
    "agendamentoId" TEXT,
    "materiaisUsados" JSONB,
    "entregue" BOOLEAN DEFAULT false,
    "dataSaida" TIMESTAMP(3),

    CONSTRAINT "ordens_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agendamentos" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "instaladorId" TEXT NOT NULL,
    "box" INTEGER NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "horario" TEXT NOT NULL,
    "duracao" INTEGER NOT NULL,
    "status" "StatusAgendamento" NOT NULL DEFAULT 'agendado',
    "valor" DOUBLE PRECISION,
    "reagendamentos" INTEGER,

    CONSTRAINT "agendamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instaladores" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "especialidades" TEXT[],
    "comissaoPadrao" DOUBLE PRECISION NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "instaladores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lancamentos_financeiro" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "tipo" "TipoLancamento" NOT NULL,
    "categoria" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "formaPagamento" TEXT NOT NULL,
    "osId" TEXT,

    CONSTRAINT "lancamentos_financeiro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produtos" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "fornecedor" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "minimo" INTEGER NOT NULL,
    "unidade" TEXT NOT NULL,
    "valorUnitario" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "garantias" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "osId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "servico" TEXT NOT NULL,
    "produto" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "status" "StatusGarantia" NOT NULL DEFAULT 'ativa',

    CONSTRAINT "garantias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metas" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "faturamento" DOUBLE PRECISION NOT NULL,
    "numeroOS" INTEGER NOT NULL,
    "ticketMedio" DOUBLE PRECISION NOT NULL,
    "novosClientes" INTEGER NOT NULL,

    CONSTRAINT "metas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracoes" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "nomeLoja" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "corPrimaria" TEXT NOT NULL,
    "numeroBoxes" INTEGER NOT NULL,
    "comissaoPadrao" DOUBLE PRECISION NOT NULL,
    "notifEstoque" BOOLEAN DEFAULT true,
    "notifGarantia" BOOLEAN DEFAULT true,
    "notifPosVenda" BOOLEAN DEFAULT true,

    CONSTRAINT "configuracoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicos" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "preco" DOUBLE PRECISION,
    "tempEstimado" INTEGER,
    "duracaoDias" INTEGER,

    CONSTRAINT "servicos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_authUserId_key" ON "usuarios"("authUserId");

-- CreateIndex
CREATE INDEX "usuarios_lojaId_idx" ON "usuarios"("lojaId");

-- CreateIndex
CREATE UNIQUE INDEX "ordens_servico_numero_key" ON "ordens_servico"("numero");

-- CreateIndex
CREATE INDEX "ordens_servico_lojaId_idx" ON "ordens_servico"("lojaId");

-- CreateIndex
CREATE INDEX "agendamentos_lojaId_idx" ON "agendamentos"("lojaId");

-- CreateIndex
CREATE INDEX "instaladores_lojaId_idx" ON "instaladores"("lojaId");

-- CreateIndex
CREATE INDEX "lancamentos_financeiro_lojaId_idx" ON "lancamentos_financeiro"("lojaId");

-- CreateIndex
CREATE INDEX "produtos_lojaId_idx" ON "produtos"("lojaId");

-- CreateIndex
CREATE INDEX "garantias_lojaId_idx" ON "garantias"("lojaId");

-- CreateIndex
CREATE INDEX "metas_lojaId_idx" ON "metas"("lojaId");

-- CreateIndex
CREATE UNIQUE INDEX "configuracoes_lojaId_key" ON "configuracoes"("lojaId");

-- CreateIndex
CREATE INDEX "servicos_lojaId_idx" ON "servicos"("lojaId");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veiculos" ADD CONSTRAINT "veiculos_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veiculos" ADD CONSTRAINT "veiculos_lojaId_clienteId_fkey" FOREIGN KEY ("lojaId", "clienteId") REFERENCES "clientes"("lojaId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_lojaId_clienteId_fkey" FOREIGN KEY ("lojaId", "clienteId") REFERENCES "clientes"("lojaId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_lojaId_veiculoId_fkey" FOREIGN KEY ("lojaId", "veiculoId") REFERENCES "veiculos"("lojaId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instaladores" ADD CONSTRAINT "instaladores_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos_financeiro" ADD CONSTRAINT "lancamentos_financeiro_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "garantias" ADD CONSTRAINT "garantias_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metas" ADD CONSTRAINT "metas_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracoes" ADD CONSTRAINT "configuracoes_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicos" ADD CONSTRAINT "servicos_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

