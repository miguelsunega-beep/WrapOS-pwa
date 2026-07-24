-- concluir_os_atomica(): faz as 7 escritas da conclusão de uma OS (status da
-- OS, lançamento de receita, garantia, totalGasto do cliente, numeroOS da
-- meta, baixa de estoque por produto, lançamento de despesa de material) numa
-- única transação — se qualquer uma falhar, nenhuma é aplicada. Antes,
-- AppContext.tsx (concluirOS) fazia até 7 chamadas independentes ao Supabase;
-- uma falha no meio deixava o sistema num estado inconsistente (ex.: estoque
-- debitado sem o lançamento financeiro correspondente).
--
-- Todo o CÁLCULO (nome do cliente, prazo de garantia, deltas de estoque,
-- custo de materiais por origem) continua em JavaScript, exatamente como
-- antes — essa função só recebe valores já prontos e grava; não decide nada.
--
-- Idempotência: replica exatamente as duas checagens que já existiam em JS
-- (!lancamentos.some(...) pra receita, !garantias.some(...) pra garantia) —
-- não duplica nenhuma das duas se a função for chamada mais de uma vez pra
-- mesma OS. O delta de totalGasto/numeroOS e o lançamento de despesa de
-- material NÃO têm essa proteção, replicando fielmente o comportamento atual
-- em JS (que também nunca teve essa checagem pra essas partes — a UI só nunca
-- conseguia chamar concluirOS duas vezes pra mesma OS porque o próprio
-- concluirOS já retornava cedo se os.status já fosse 'concluido').
CREATE OR REPLACE FUNCTION concluir_os_atomica(
  p_os_id                       text,
  p_loja_id                     text,
  p_os_patch                    jsonb,   -- {status, dataFinalizacao, statusPagamento, materiaisUsados, entregue}
  p_lancamento_receita          jsonb,   -- nullable: {id, tipo, categoria, descricao, valor, data, formaPagamento}
  p_garantia                    jsonb,   -- nullable: {id, clienteId, veiculoId, servico, produto, dataInicio, dataFim, status}
  p_cliente_id                  text,
  p_cliente_delta_total_gasto   numeric,
  p_meta_id                     text,
  p_meta_delta_numero_os        integer,
  p_estoque_deltas              jsonb,   -- array de {produtoId, delta} — positivo baixa, negativo devolve (ver diffEstoqueDeltas em AppContext.tsx)
  p_lancamento_despesa_material jsonb,   -- nullable, mesmo formato de p_lancamento_receita
  p_agendamento_id              text     -- nullable
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  item jsonb;
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

  -- 5. Meta: aplica o delta de numeroOS (já calculado em JS) — filtra por id
  -- (não só lojaId) igual ao useMetasSupabase.ts original, já que metas não
  -- tem constraint de unicidade em lojaId sozinho (ver prisma/schema.prisma).
  UPDATE metas
  SET "numeroOS" = "numeroOS" + p_meta_delta_numero_os
  WHERE "lojaId" = p_loja_id AND id = p_meta_id;

  -- 6. Estoque: aplica os deltas já calculados em JS (diffEstoqueDeltas) —
  -- positivo baixa, negativo devolve; GREATEST(0, ...) replica o
  -- Math.max(0, ...) de baixarEstoque (é um no-op quando o delta é negativo,
  -- já que o resultado só aumenta nesse caso).
  FOR item IN SELECT * FROM jsonb_array_elements(coalesce(p_estoque_deltas, '[]'::jsonb))
  LOOP
    UPDATE produtos
    SET quantidade = GREATEST(0, quantidade - (item->>'delta')::integer)
    WHERE "lojaId" = p_loja_id AND id = item->>'produtoId';
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

-- PostgREST só expõe a função via /rpc se o role autenticado tiver EXECUTE —
-- concede explicitamente, mesmo padrão de proximo_numero_os (migration 008).
GRANT EXECUTE ON FUNCTION concluir_os_atomica(
  text, text, jsonb, jsonb, jsonb, text, numeric, text, integer, jsonb, jsonb, text
) TO authenticated;
