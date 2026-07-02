-- CreateEnum
CREATE TYPE "StatusAgendamento" AS ENUM ('agendado', 'confirmado', 'concluido', 'cancelado');

-- CreateEnum
CREATE TYPE "StatusGarantia" AS ENUM ('ativa', 'acionada', 'expirada');

-- CreateEnum
CREATE TYPE "TipoLancamento" AS ENUM ('entrada', 'saida');

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

