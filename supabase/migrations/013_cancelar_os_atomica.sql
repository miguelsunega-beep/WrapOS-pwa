-- cancelar_os_atomica(): cancela a OS e reverte o agendamento vinculado (se
-- houver) pra 'agendado' numa única transação — antes, AppContext.tsx
-- (cancelarOS) fazia 2 chamadas independentes; uma falha na segunda deixava
-- a OS cancelada com o agendamento ainda preso em status antigo.
CREATE OR REPLACE FUNCTION cancelar_os_atomica(
  p_os_id          text,
  p_loja_id        text,
  p_agendamento_id text  -- nullable
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

-- PostgREST só expõe a função via /rpc se o role autenticado tiver EXECUTE —
-- concede explicitamente, mesmo padrão de concluir_os_atomica (migration 009).
GRANT EXECUTE ON FUNCTION cancelar_os_atomica(text, text, text) TO authenticated;
