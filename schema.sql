-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "StatusCliente" AS ENUM ('ativo', 'inativo');

-- CreateEnum
CREATE TYPE "StatusOS" AS ENUM ('checkin', 'em_andamento', 'aguardando_material', 'aguardando_aprovacao', 'concluido', 'cancelado');

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

-- CreateEnum
CREATE TYPE "TipoControleEstoque" AS ENUM ('unidade', 'bobina', 'volume');

-- CreateTable
CREATE TABLE "lojas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "plano" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proximoNumero" INTEGER NOT NULL DEFAULT 1,

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
    "numero" INTEGER NOT NULL,
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

    CONSTRAINT "ordens_servico_pkey" PRIMARY KEY ("lojaId","id")
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

    CONSTRAINT "agendamentos_pkey" PRIMARY KEY ("lojaId","id")
);

-- CreateTable
CREATE TABLE "instaladores" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "especialidades" TEXT[],
    "comissaoPadrao" DOUBLE PRECISION NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "instaladores_pkey" PRIMARY KEY ("lojaId","id")
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

    CONSTRAINT "lancamentos_financeiro_pkey" PRIMARY KEY ("lojaId","id")
);

-- CreateTable
CREATE TABLE "produtos" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "fornecedor" TEXT NOT NULL,
    "quantidade" DECIMAL(10,2) NOT NULL,
    "minimo" DECIMAL(10,2) NOT NULL,
    "unidade" TEXT NOT NULL,
    "valorUnitario" DOUBLE PRECISION NOT NULL,
    "tipoControle" "TipoControleEstoque" NOT NULL DEFAULT 'unidade',
    "quantidadeOriginal" DECIMAL(10,2),
    "isRetalho" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("lojaId","id")
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

    CONSTRAINT "garantias_pkey" PRIMARY KEY ("lojaId","id")
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

    CONSTRAINT "metas_pkey" PRIMARY KEY ("lojaId","id")
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

    CONSTRAINT "configuracoes_pkey" PRIMARY KEY ("lojaId","id")
);

-- CreateTable
CREATE TABLE "servicos" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "preco" DOUBLE PRECISION,
    "tempEstimado" INTEGER,
    "duracaoDias" INTEGER,

    CONSTRAINT "servicos_pkey" PRIMARY KEY ("lojaId","id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_authUserId_key" ON "usuarios"("authUserId");

-- CreateIndex
CREATE INDEX "usuarios_lojaId_idx" ON "usuarios"("lojaId");

-- CreateIndex
CREATE UNIQUE INDEX "ordens_servico_lojaId_numero_key" ON "ordens_servico"("lojaId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "configuracoes_lojaId_key" ON "configuracoes"("lojaId");

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


-- CreateFunction
-- proximo_numero_os(): gera o próximo número de OS de forma atômica, por loja
-- (ver supabase/migrations/008_numero_os_por_loja.sql).
CREATE OR REPLACE FUNCTION proximo_numero_os(loja_id_param text)
RETURNS integer
LANGUAGE sql
AS $$
  UPDATE lojas
  SET "proximoNumero" = "proximoNumero" + 1
  WHERE id = loja_id_param
  RETURNING "proximoNumero" - 1;
$$;

GRANT EXECUTE ON FUNCTION proximo_numero_os(text) TO authenticated;


-- CreateFunction
-- concluir_os_atomica(): faz as 7 escritas da conclusão de uma OS numa única
-- transação (ver supabase/migrations/009_concluir_os_atomica.sql).
-- Cast do delta de estoque ::integer -> ::numeric na migration 015 (ver
-- supabase/migrations/015_estoque_numeric_rpc.sql), acompanhando
-- produtos.quantidade/minimo virarem numeric(10,2) na migration 014.
CREATE OR REPLACE FUNCTION concluir_os_atomica(
  p_os_id                       text,
  p_loja_id                     text,
  p_os_patch                    jsonb,
  p_lancamento_receita          jsonb,
  p_garantia                    jsonb,
  p_cliente_id                  text,
  p_cliente_delta_total_gasto   numeric,
  p_meta_id                     text,
  p_meta_delta_numero_os        integer,
  p_estoque_deltas              jsonb,
  p_lancamento_despesa_material jsonb,
  p_agendamento_id              text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  item jsonb;
BEGIN
  UPDATE ordens_servico
  SET status            = (p_os_patch->>'status')::"StatusOS",
      "dataFinalizacao" = (p_os_patch->>'dataFinalizacao')::date,
      "statusPagamento" = (p_os_patch->>'statusPagamento')::"StatusPagamento",
      "materiaisUsados" = p_os_patch->'materiaisUsados',
      entregue          = (p_os_patch->>'entregue')::boolean
  WHERE "lojaId" = p_loja_id AND id = p_os_id;

  IF p_lancamento_receita IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM lancamentos_financeiro
       WHERE "lojaId" = p_loja_id AND "osId" = p_os_id AND tipo = 'entrada'
     )
  THEN
    INSERT INTO lancamentos_financeiro (id, "lojaId", tipo, categoria, descricao, valor, data, "formaPagamento", "osId")
    VALUES (
      p_lancamento_receita->>'id', p_loja_id,
      (p_lancamento_receita->>'tipo')::"TipoLancamento",
      p_lancamento_receita->>'categoria',
      p_lancamento_receita->>'descricao',
      (p_lancamento_receita->>'valor')::float8,
      (p_lancamento_receita->>'data')::date,
      p_lancamento_receita->>'formaPagamento',
      p_os_id
    );
  END IF;

  IF p_garantia IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM garantias WHERE "lojaId" = p_loja_id AND "osId" = p_os_id)
  THEN
    INSERT INTO garantias (id, "lojaId", "osId", "clienteId", "veiculoId", servico, produto, "dataInicio", "dataFim", status)
    VALUES (
      p_garantia->>'id', p_loja_id, p_os_id,
      p_garantia->>'clienteId', p_garantia->>'veiculoId',
      p_garantia->>'servico', p_garantia->>'produto',
      (p_garantia->>'dataInicio')::date, (p_garantia->>'dataFim')::date,
      (p_garantia->>'status')::"StatusGarantia"
    );
  END IF;

  UPDATE clientes
  SET "totalGasto" = "totalGasto" + p_cliente_delta_total_gasto
  WHERE "lojaId" = p_loja_id AND id = p_cliente_id;

  UPDATE metas
  SET "numeroOS" = "numeroOS" + p_meta_delta_numero_os
  WHERE "lojaId" = p_loja_id AND id = p_meta_id;

  FOR item IN SELECT * FROM jsonb_array_elements(coalesce(p_estoque_deltas, '[]'::jsonb))
  LOOP
    UPDATE produtos
    SET quantidade = GREATEST(0, quantidade - (item->>'delta')::numeric)
    WHERE "lojaId" = p_loja_id AND id = item->>'produtoId';
  END LOOP;

  IF p_lancamento_despesa_material IS NOT NULL THEN
    INSERT INTO lancamentos_financeiro (id, "lojaId", tipo, categoria, descricao, valor, data, "formaPagamento", "osId")
    VALUES (
      p_lancamento_despesa_material->>'id', p_loja_id,
      (p_lancamento_despesa_material->>'tipo')::"TipoLancamento",
      p_lancamento_despesa_material->>'categoria',
      p_lancamento_despesa_material->>'descricao',
      (p_lancamento_despesa_material->>'valor')::float8,
      (p_lancamento_despesa_material->>'data')::date,
      p_lancamento_despesa_material->>'formaPagamento',
      p_os_id
    );
  END IF;

  IF p_agendamento_id IS NOT NULL THEN
    UPDATE agendamentos SET status = 'concluido' WHERE "lojaId" = p_loja_id AND id = p_agendamento_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION concluir_os_atomica(
  text, text, jsonb, jsonb, jsonb, text, numeric, text, integer, jsonb, jsonb, text
) TO authenticated;


-- CreateFunction
-- registrar_pagamento_os_atomica(): faz as 2 escritas de registrarPagamentoOS
-- (lançamento de receita + statusPagamento da OS) numa única transação (ver
-- supabase/migrations/011_registrar_pagamento_os_atomica.sql).
CREATE OR REPLACE FUNCTION registrar_pagamento_os_atomica(
  p_os_id              text,
  p_loja_id            text,
  p_os_patch           jsonb,
  p_lancamento_receita jsonb
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  linhas_afetadas integer;
BEGIN
  UPDATE ordens_servico
  SET "statusPagamento" = (p_os_patch->>'statusPagamento')::"StatusPagamento"
  WHERE "lojaId" = p_loja_id AND id = p_os_id;

  GET DIAGNOSTICS linhas_afetadas = ROW_COUNT;
  IF linhas_afetadas = 0 THEN
    RAISE EXCEPTION 'registrar_pagamento_os_atomica: nenhuma OS encontrada para lojaId=%, id=%', p_loja_id, p_os_id;
  END IF;

  IF p_lancamento_receita IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM lancamentos_financeiro
       WHERE "lojaId" = p_loja_id AND "osId" = p_os_id AND tipo = 'entrada'
     )
  THEN
    INSERT INTO lancamentos_financeiro (id, "lojaId", tipo, categoria, descricao, valor, data, "formaPagamento", "osId")
    VALUES (
      p_lancamento_receita->>'id', p_loja_id,
      'entrada',
      p_lancamento_receita->>'categoria',
      p_lancamento_receita->>'descricao',
      (p_lancamento_receita->>'valor')::float8,
      (p_lancamento_receita->>'data')::date,
      p_lancamento_receita->>'formaPagamento',
      p_os_id
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION registrar_pagamento_os_atomica(
  text, text, jsonb, jsonb
) TO authenticated;


-- CreateFunction
-- salvar_materiais_os_atomica(): grava os materiais da OS e aplica os deltas
-- de estoque numa única transação (ver
-- supabase/migrations/012_salvar_materiais_os_atomica.sql).
-- Cast do delta de estoque ::integer -> ::numeric na migration 015 (ver
-- supabase/migrations/015_estoque_numeric_rpc.sql).
CREATE OR REPLACE FUNCTION salvar_materiais_os_atomica(
  p_os_id            text,
  p_loja_id          text,
  p_materiais_usados jsonb,
  p_estoque_deltas   jsonb
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  item jsonb;
BEGIN
  UPDATE ordens_servico
  SET "materiaisUsados" = p_materiais_usados
  WHERE "lojaId" = p_loja_id AND id = p_os_id;

  FOR item IN SELECT * FROM jsonb_array_elements(coalesce(p_estoque_deltas, '[]'::jsonb))
  LOOP
    UPDATE produtos
    SET quantidade = GREATEST(0, quantidade - (item->>'delta')::numeric)
    WHERE "lojaId" = p_loja_id AND id = item->>'produtoId';
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION salvar_materiais_os_atomica(text, text, jsonb, jsonb) TO authenticated;


-- CreateFunction
-- cancelar_os_atomica(): cancela a OS e reverte o agendamento vinculado (se
-- houver) pra 'agendado' numa única transação (ver
-- supabase/migrations/013_cancelar_os_atomica.sql).
CREATE OR REPLACE FUNCTION cancelar_os_atomica(
  p_os_id          text,
  p_loja_id        text,
  p_agendamento_id text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE ordens_servico
  SET status = 'cancelado'
  WHERE "lojaId" = p_loja_id AND id = p_os_id;

  IF p_agendamento_id IS NOT NULL THEN
    UPDATE agendamentos
    SET status = 'agendado'
    WHERE "lojaId" = p_loja_id AND id = p_agendamento_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION cancelar_os_atomica(text, text, text) TO authenticated;
