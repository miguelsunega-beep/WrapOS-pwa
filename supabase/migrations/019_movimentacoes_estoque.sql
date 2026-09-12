-- Histórico de movimentação de estoque (item de maior esforço da lista de
-- prontidão comercial — ver docs/ANALISE-PRODUTO-COMERCIAL-2026-09.md, seção
-- 5: "é a promessa central do produto pro nicho"). Antes desta migration, a
-- tela de Estoque pedia o motivo da baixa e descartava (`void motivo` em
-- useProdutosSupabase.ts) — não existia nenhum registro de quem/quando/por
-- quê a quantidade de um produto mudou.
--
-- Levantamento feito ANTES de desenhar esta tabela (grep por todo update de
-- quantidade em produtos — frontend, RPCs, triggers de banco: nenhum
-- trigger encontrado) — resultado: 2 pontos de escrita real, cobertos aqui:
--   1. Ajuste manual (Entrada/Baixa de estoque, tela Estoque) — RPC nova
--      ajustar_estoque_atomica, abaixo.
--   2. Consumo/devolução de material em OS — RPC já existente
--      salvar_materiais_os_atomica (migration 012/015), estendida abaixo
--      pra também gravar o histórico, na mesma transação.
-- Um 3º ponto foi encontrado (edição direta de produtos.quantidade via tela
-- "Editar Produto", campo antes rotulado "Qtd. Inicial", que ficava editável
-- mesmo depois da criação) — decisão tomada foi travar esse campo na origem
-- (ver useEstoque.ts/Estoque.tsx) em vez de tratá-lo como uma 3ª origem de
-- histórico, então não existe origem correspondente nesta tabela.
--
-- concluir_os_atomica (migration 009/015) tem seu próprio cálculo de delta de
-- estoque (diffEstoqueDeltas comparando materiaisUsados salvos vs. os
-- recebidos na conclusão) e NÃO foi alterada nesta migration — gap aceito
-- conscientemente, mesmo espírito dos outros gaps já documentados no projeto:
-- se a OS for concluída com materiais diferentes dos já salvos por
-- salvarMateriaisOS, esse delta específico altera produtos.quantidade sem
-- gerar linha em movimentacoes_estoque. Revisitar se isso incomodar na
-- prática.

-- ── DDL (gerado via `npx prisma migrate diff --from-schema <schema antes
-- desta migration> --to-schema prisma/schema.prisma --script`, sem edição
-- manual) ──────────────────────────────────────────────────────
CREATE TYPE "TipoMovimentacaoEstoque" AS ENUM ('entrada', 'saida', 'ajuste');

CREATE TYPE "OrigemMovimentacaoEstoque" AS ENUM ('ajuste_manual', 'os_materiais');

CREATE TABLE "movimentacoes_estoque" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "tipo" "TipoMovimentacaoEstoque" NOT NULL,
    "origem" "OrigemMovimentacaoEstoque" NOT NULL,
    "delta" DECIMAL(10,2) NOT NULL,
    "quantidadeAnterior" DECIMAL(10,2) NOT NULL,
    "quantidadeNova" DECIMAL(10,2) NOT NULL,
    "motivo" TEXT,
    "referenciaId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentacoes_estoque_pkey" PRIMARY KEY ("lojaId","id")
);

CREATE INDEX "movimentacoes_estoque_lojaId_produtoId_createdAt_idx" ON "movimentacoes_estoque"("lojaId", "produtoId", "createdAt");

ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- onDelete: CASCADE (diferente do padrão Restrict de OrdemServico.cliente) —
-- deliberado: excluir um produto (removerProduto, sem tela de inativação)
-- não deve passar a falhar com erro de FK só porque acumulou histórico.
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_lojaId_produtoId_fkey" FOREIGN KEY ("lojaId", "produtoId") REFERENCES "produtos"("lojaId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: mesmo padrão único do resto do schema ({tabela}_por_loja, FOR ALL,
-- subquery em usuarios) — replicado literalmente de produtos_por_loja
-- (supabase/policies.sql), não um padrão novo.
ALTER TABLE movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "movimentacoes_estoque_por_loja" ON "public"."movimentacoes_estoque";
CREATE POLICY "movimentacoes_estoque_por_loja"
ON "public"."movimentacoes_estoque"
FOR ALL
TO public
USING (
  ("lojaId" IN ( SELECT usuarios."lojaId"
   FROM usuarios
   WHERE (usuarios."authUserId" = (auth.uid())::text)))
);

-- ── RPC nova: ajuste manual (Entrada/Baixa de estoque) ─────────────────
-- Substitui o update direto que useProdutosSupabase.ts fazia em
-- ajustarQuantidade (registrarEntradaEstoque/baixarEstoque) — grava
-- produtos.quantidade + a linha de histórico na mesma transação, pra nunca
-- divergir. SECURITY INVOKER (default — não declarado como SECURITY
-- DEFINER), mesmo padrão das outras 5 RPCs: roda com as permissões de quem
-- chamou, então a RLS de produtos/movimentacoes_estoque se aplica dentro
-- dela. search_path fixo desde a criação (migration 018 precisou corrigir
-- isso retroativamente nas 5 RPCs anteriores; esta já nasce corrigida).
--
-- Lock de linha via `SELECT ... FOR UPDATE` (não um UPDATE direto com
-- expressão) porque precisamos do valor ANTERIOR pra gravar o snapshot em
-- movimentacoes_estoque — ler e escrever em statements separados dentro da
-- mesma transação, com a linha travada entre os dois, evita a race de dois
-- ajustes concorrentes no mesmo produto lerem o mesmo "anterior".
--
-- `p_delta` usa sinal NATURAL (positivo = entrada, negativo = saída) — ao
-- contrário do `estoqueDeltas` interno de AppContext.tsx (diffEstoqueDeltas,
-- "positivo = baixa"). Client (useProdutosSupabase.ts) já converte antes de
-- chamar.
CREATE OR REPLACE FUNCTION ajustar_estoque_atomica(
  p_produto_id      text,
  p_loja_id         text,
  p_movimentacao_id text,
  p_tipo            text,    -- 'entrada' | 'saida', cast pra enum internamente
  p_delta           numeric, -- sinal natural
  p_motivo          text,
  p_usuario_id      text
)
RETURNS numeric  -- quantidade nova (já clampada), pro client reconciliar o estado local
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_anterior numeric;
  v_nova     numeric;
BEGIN
  SELECT quantidade INTO v_anterior
  FROM produtos
  WHERE "lojaId" = p_loja_id AND id = p_produto_id
  FOR UPDATE;

  IF v_anterior IS NULL THEN
    RAISE EXCEPTION 'Produto % não encontrado na loja %', p_produto_id, p_loja_id;
  END IF;

  -- GREATEST(0, ...) replica o Math.max(0, ...) que baixarEstoque já fazia —
  -- nunca deixa a quantidade negativa, mesmo sob concorrência.
  v_nova := GREATEST(0, v_anterior + p_delta);

  UPDATE produtos
  SET quantidade = v_nova
  WHERE "lojaId" = p_loja_id AND id = p_produto_id;

  INSERT INTO movimentacoes_estoque
    (id, "lojaId", "produtoId", tipo, origem, delta, "quantidadeAnterior", "quantidadeNova", motivo, "referenciaId", "usuarioId")
  VALUES (
    p_movimentacao_id, p_loja_id, p_produto_id, p_tipo::"TipoMovimentacaoEstoque", 'ajuste_manual',
    (v_nova - v_anterior), v_anterior, v_nova, p_motivo, NULL, p_usuario_id
  );

  RETURN v_nova;
END;
$$;

GRANT EXECUTE ON FUNCTION ajustar_estoque_atomica(text, text, text, text, numeric, text, text) TO authenticated;

-- ── RPC existente estendida: consumo/devolução de material em OS ──────
-- Mesma function de sempre (migration 012, ajustada pra numeric na 015),
-- agora também grava uma linha em movimentacoes_estoque por produto afetado,
-- na mesma transação — e recebe p_usuario_id (novo) pra isso. Assinatura
-- muda (5 parâmetros em vez de 4): DROP explícito primeiro, porque
-- CREATE OR REPLACE não substitui uma function quando a lista de parâmetros
-- é diferente — ele cria uma segunda sobrecarga, deixando as duas
-- coexistindo (e PostgREST não sabe resolver a ambiguidade num /rpc).
--
-- Mesmo motivo do lock explícito em ajustar_estoque_atomica: SELECT ... FOR
-- UPDATE antes de calcular a nova quantidade, em vez de um UPDATE com
-- expressão direta — precisamos do valor anterior pro snapshot, mesmo sob
-- concorrência.
--
-- p_estoque_deltas continua no formato interno de sempre (positivo = baixa,
-- negativo = devolve — ver diffEstoqueDeltas), com um campo novo por item:
-- movimentacaoId (gerado em JS, mesmo uid() de sempre — nenhuma RPC deste
-- projeto gera id no banco). Produto não encontrado (ex.: excluído) é
-- ignorado silenciosamente, mesmo comportamento de antes (um UPDATE sem
-- match também não gerava erro).
DROP FUNCTION IF EXISTS salvar_materiais_os_atomica(text, text, jsonb, jsonb);

CREATE OR REPLACE FUNCTION salvar_materiais_os_atomica(
  p_os_id            text,
  p_loja_id          text,
  p_materiais_usados jsonb,
  p_estoque_deltas   jsonb,   -- array de {produtoId, delta, movimentacaoId}
  p_usuario_id       text
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  item            jsonb;
  v_anterior      numeric;
  v_nova          numeric;
  v_delta_natural numeric; -- sinal invertido do item->>'delta' (que é "positivo=baixa")
BEGIN
  UPDATE ordens_servico
  SET "materiaisUsados" = p_materiais_usados
  WHERE "lojaId" = p_loja_id AND id = p_os_id;

  FOR item IN SELECT * FROM jsonb_array_elements(coalesce(p_estoque_deltas, '[]'::jsonb))
  LOOP
    SELECT quantidade INTO v_anterior
    FROM produtos
    WHERE "lojaId" = p_loja_id AND id = item->>'produtoId'
    FOR UPDATE;

    IF v_anterior IS NULL THEN
      CONTINUE;
    END IF;

    v_delta_natural := -(item->>'delta')::numeric;
    v_nova := GREATEST(0, v_anterior + v_delta_natural);

    UPDATE produtos SET quantidade = v_nova
    WHERE "lojaId" = p_loja_id AND id = item->>'produtoId';

    INSERT INTO movimentacoes_estoque
      (id, "lojaId", "produtoId", tipo, origem, delta, "quantidadeAnterior", "quantidadeNova", motivo, "referenciaId", "usuarioId")
    VALUES (
      item->>'movimentacaoId', p_loja_id, item->>'produtoId',
      CASE WHEN v_nova >= v_anterior THEN 'entrada' ELSE 'saida' END::"TipoMovimentacaoEstoque",
      'os_materiais', (v_nova - v_anterior), v_anterior, v_nova, NULL, p_os_id, p_usuario_id
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION salvar_materiais_os_atomica(text, text, jsonb, jsonb, text) TO authenticated;
