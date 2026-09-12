-- Fecha o gap deixado deliberadamente aberto na migration 019: dentro de
-- concluir_os_atomica (migration 009, ajustada pra numeric na 015), o passo
-- 6 (baixa/devolução de estoque) já calcula e aplica seu PRÓPRIO delta —
-- distinto do que salvar_materiais_os_atomica (editar materiais numa OS
-- ainda aberta) já grava — comparando materiaisUsados já salvos vs. os
-- recebidos na conclusão (ver diffEstoqueDeltas em AppContext.tsx/concluirOS).
-- Esse delta específico não gerava linha em movimentacoes_estoque. Mesmo
-- padrão do Item 4 original (salvar_materiais_os_atomica): grava a linha na
-- MESMA transação que já aplica quantidade, sem alterar a lógica de consumo
-- em si — nenhum dos outros 7 passos da function muda.
--
-- origem='os_conclusao' (novo valor do enum, ver migration 020 — aplicada
-- ANTES desta, em transação separada, porque Postgres não deixa usar um
-- enum recém-adicionado na mesma transação em que foi criado).
--
-- Assinatura muda (12 → 13 parâmetros: +p_usuario_id) — DROP explícito
-- primeiro, mesmo motivo/mesmo padrão já usado em salvar_materiais_os_atomica
-- (migration 019): CREATE OR REPLACE não substitui uma function quando a
-- lista de parâmetros é diferente, cria uma segunda sobrecarga e deixa as
-- duas coexistindo (PostgREST não resolve a ambiguidade num /rpc).
--
-- Mesmo motivo do lock explícito nas outras duas RPCs de estoque
-- (ajustar_estoque_atomica, salvar_materiais_os_atomica, migration 019):
-- SELECT ... FOR UPDATE antes de calcular a nova quantidade, em vez de um
-- UPDATE com expressão direta — precisamos do valor anterior pro snapshot
-- em movimentacoes_estoque, mesmo sob concorrência. p_estoque_deltas
-- continua no formato interno de sempre (positivo = baixa, negativo =
-- devolve — diffEstoqueDeltas), com o campo novo por item: movimentacaoId
-- (gerado em JS, mesmo uid() de sempre).
DROP FUNCTION IF EXISTS concluir_os_atomica(
  text, text, jsonb, jsonb, jsonb, text, numeric, text, integer, jsonb, jsonb, text
);

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
  p_estoque_deltas              jsonb,   -- array de {produtoId, delta, movimentacaoId}
  p_lancamento_despesa_material jsonb,
  p_agendamento_id              text,
  p_usuario_id                  text
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
  -- 1. Ordem de Serviço
  UPDATE ordens_servico
  SET status            = (p_os_patch->>'status')::"StatusOS",
      "dataFinalizacao" = (p_os_patch->>'dataFinalizacao')::date,
      "statusPagamento" = (p_os_patch->>'statusPagamento')::"StatusPagamento",
      "materiaisUsados" = p_os_patch->'materiaisUsados',
      entregue          = (p_os_patch->>'entregue')::boolean
  WHERE "lojaId" = p_loja_id AND id = p_os_id;

  -- 2. Lançamento de receita — idempotente (não duplica se já existir entrada pra essa OS)
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

  -- 3. Garantia — idempotente (não duplica se já existir garantia pra essa OS)
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

  -- 4. Cliente: aplica o delta de totalGasto (já calculado em JS)
  UPDATE clientes
  SET "totalGasto" = "totalGasto" + p_cliente_delta_total_gasto
  WHERE "lojaId" = p_loja_id AND id = p_cliente_id;

  -- 5. Meta: aplica o delta de numeroOS (já calculado em JS)
  UPDATE metas
  SET "numeroOS" = "numeroOS" + p_meta_delta_numero_os
  WHERE "lojaId" = p_loja_id AND id = p_meta_id;

  -- 6. Estoque: aplica os deltas já calculados em JS (diffEstoqueDeltas) e
  -- agora também grava o histórico em movimentacoes_estoque, origem=
  -- 'os_conclusao' — mesmo padrão de lock+snapshot de
  -- ajustar_estoque_atomica/salvar_materiais_os_atomica (migration 019).
  -- Produto não encontrado (ex.: excluído) é ignorado silenciosamente,
  -- mesmo comportamento de antes (um UPDATE sem match também não gerava erro).
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
      'os_conclusao', (v_nova - v_anterior), v_anterior, v_nova, NULL, p_os_id, p_usuario_id
    );
  END LOOP;

  -- 7. Despesa de material — sem checagem de idempotência (mesmo
  -- comportamento de hoje em JS, que também nunca teve essa proteção).
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

  -- 8. Agendamento vinculado (se houver): marca como concluído
  IF p_agendamento_id IS NOT NULL THEN
    UPDATE agendamentos SET status = 'concluido' WHERE "lojaId" = p_loja_id AND id = p_agendamento_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION concluir_os_atomica(
  text, text, jsonb, jsonb, jsonb, text, numeric, text, integer, jsonb, jsonb, text, text
) TO authenticated;
