-- registrar_pagamento_os_atomica(): faz as 2 escritas de registrarPagamentoOS
-- (lançamento de receita + statusPagamento da OS) numa única transação — se
-- qualquer uma falhar, nenhuma é aplicada. Antes, AppContext.tsx
-- (registrarPagamentoOS) fazia duas chamadas independentes ao Supabase
-- (adicionarLancamento + atualizarOSCloud); uma falha no meio deixava o
-- sistema num estado inconsistente (receita lançada sem a OS refletir como
-- paga, ou o inverso). Mesmo padrão de concluir_os_atomica (migration 009).
--
-- Todo o CÁLCULO (nome do cliente, forma de pagamento recebida) continua em
-- JavaScript, exatamente como antes — essa função só recebe valores já
-- prontos e grava; não decide nada.
--
-- Idempotência: replica exatamente a mesma checagem que já existia em JS
-- (!lancamentos.some(l => l.osId === id && l.tipo === 'entrada')) — não
-- duplica o lançamento de receita se a função for chamada mais de uma vez
-- pra mesma OS (ex: clique duplo). O UPDATE de statusPagamento não tem (nem
-- precisa de) proteção equivalente — é idempotente por natureza, sempre grava
-- o mesmo valor 'pago'. `tipo` é fixado em 'entrada' tanto na checagem quanto
-- no INSERT (em vez de ler de p_lancamento_receita->>'tipo') porque esta
-- function é específica pra receita de pagamento de OS, não um insert
-- genérico de lançamento — evita os dois lados divergirem por engano.
--
-- Aborta a transação inteira (RAISE EXCEPTION) se o UPDATE não encontrar
-- nenhuma OS pra esse (lojaId, id) — sem isso, a function seguiria e
-- inseriria o lançamento de receita mesmo com a OS inexistente/errada,
-- reabrindo o mesmo tipo de inconsistência que essa migration existe pra
-- resolver.
CREATE OR REPLACE FUNCTION registrar_pagamento_os_atomica(
  p_os_id              text,
  p_loja_id            text,
  p_os_patch           jsonb,   -- {statusPagamento}
  p_lancamento_receita jsonb    -- nullable: {id, categoria, descricao, valor, data, formaPagamento} (tipo é sempre 'entrada', não lido daqui)
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  linhas_afetadas integer;
BEGIN
  -- 1. Ordem de Serviço
  UPDATE ordens_servico
  SET "statusPagamento" = (p_os_patch->>'statusPagamento')::"StatusPagamento"
  WHERE "lojaId" = p_loja_id AND id = p_os_id;

  GET DIAGNOSTICS linhas_afetadas = ROW_COUNT;
  IF linhas_afetadas = 0 THEN
    RAISE EXCEPTION 'registrar_pagamento_os_atomica: nenhuma OS encontrada para lojaId=%, id=%', p_loja_id, p_os_id;
  END IF;

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

-- PostgREST só expõe a função via /rpc se o role autenticado tiver EXECUTE —
-- concede explicitamente, mesmo padrão de concluir_os_atomica (migration 009).
GRANT EXECUTE ON FUNCTION registrar_pagamento_os_atomica(
  text, text, jsonb, jsonb
) TO authenticated;
