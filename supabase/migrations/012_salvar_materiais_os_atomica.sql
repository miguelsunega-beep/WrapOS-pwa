-- salvar_materiais_os_atomica(): grava os materiais da OS e aplica os deltas
-- de estoque numa única transação — mesmo motivo de concluir_os_atomica
-- (migration 009): antes, AppContext.tsx (salvarMateriaisOS) fazia 1 chamada
-- por produto alterado + 1 pra OS, todas independentes; uma falha no meio
-- deixava estoque debitado sem o registro de materiais correspondente (ou
-- vice-versa).
--
-- Todo o CÁLCULO dos deltas (diffEstoqueDeltas) continua em JavaScript,
-- exatamente como em concluir_os_atomica — esta função só recebe valores já
-- prontos e grava.
CREATE OR REPLACE FUNCTION salvar_materiais_os_atomica(
  p_os_id            text,
  p_loja_id          text,
  p_materiais_usados jsonb,   -- array completo de MaterialUsado, já mesclado
  p_estoque_deltas   jsonb    -- array de {produtoId, delta} — positivo baixa, negativo devolve (ver diffEstoqueDeltas)
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
    SET quantidade = GREATEST(0, quantidade - (item->>'delta')::integer)
    WHERE "lojaId" = p_loja_id AND id = item->>'produtoId';
  END LOOP;
END;
$$;

-- PostgREST só expõe a função via /rpc se o role autenticado tiver EXECUTE —
-- concede explicitamente, mesmo padrão de concluir_os_atomica (migration 009).
GRANT EXECUTE ON FUNCTION salvar_materiais_os_atomica(text, text, jsonb, jsonb) TO authenticated;
