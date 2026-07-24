-- DropIndex
DROP INDEX "ordens_servico_numero_key";

-- AlterTable
ALTER TABLE "lojas" ADD COLUMN     "proximoNumero" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "ordens_servico" ALTER COLUMN "numero" DROP DEFAULT;
DROP SEQUENCE IF EXISTS "ordens_servico_numero_seq";

-- CreateIndex
CREATE UNIQUE INDEX "ordens_servico_lojaId_numero_key" ON "ordens_servico"("lojaId", "numero");

-- CreateFunction
-- Gera o próximo número de OS de forma atômica, por loja. O UPDATE ... RETURNING
-- é serializado pelo Postgres por linha (a linha de "lojas" é bloqueada até o
-- commit), então duas OS criadas ao mesmo tempo na mesma loja nunca recebem o
-- mesmo número, mesmo sem transação explícita no client. Chamada via
-- supabase.rpc('proximo_numero_os', { loja_id_param: lojaId }) em
-- useOrdensServicoSupabase.ts, antes de cada insert em ordens_servico.
CREATE OR REPLACE FUNCTION proximo_numero_os(loja_id_param text)
RETURNS integer
LANGUAGE sql
AS $$
  UPDATE lojas
  SET "proximoNumero" = "proximoNumero" + 1
  WHERE id = loja_id_param
  RETURNING "proximoNumero" - 1;
$$;

-- PostgREST só expõe a função via /rpc se o role autenticado tiver EXECUTE —
-- concede explicitamente em vez de depender do privilégio default de PUBLIC.
GRANT EXECUTE ON FUNCTION proximo_numero_os(text) TO authenticated;
