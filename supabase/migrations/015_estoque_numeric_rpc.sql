-- Segue a migration 014 (produtos.quantidade/minimo: Int → numeric(10,2)).
-- As duas RPCs que aplicam baixa/devolução de estoque faziam
-- `(item->>'delta')::integer` — truncava qualquer delta fracionário (metro,
-- ML) antes mesmo de chegar no UPDATE, independente do tipo da coluna.
-- Troca mecânica: ::integer → ::numeric, mesmo padrão de transação atômica,
-- nada mais muda no corpo das duas functions.
--
-- Suporte a baixa de retalho vinculado a um produtoId real (origem='retalho'
-- com produtoId preenchido) NÃO precisou de nenhum IF/branch novo aqui: o
-- filtro que decide QUAIS materiais viram delta de estoque já é feito em JS,
-- em diffEstoqueDeltas (AppContext.tsx) — que passou a agregar também
-- origem='retalho' com produtoId, exatamente como já fazia para
-- origem='estoque'. O array p_estoque_deltas chega aqui já resolvido
-- ({produtoId, delta}, sem o campo `origem`), e o loop abaixo sempre aplicou
-- a baixa genericamente por produtoId, qualquer que fosse a origem original.
-- Continua verdade o que o header de concluir_os_atomica já dizia: a
-- function SQL não decide nada, só executa valores já prontos — a decisão
-- de "isso conta como baixa de estoque" é e continua sendo cálculo em JS.
-- Retalho sem produtoId (texto livre) nunca entra em p_estoque_deltas, então
-- continua sem baixa e sem erro, sem precisar de tratamento explícito aqui.

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
