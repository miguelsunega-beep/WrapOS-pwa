-- Ponto 2 do levantamento de histórico de movimentação de estoque (migration
-- 019): investigado, não decidido na hora — removerProduto (hard delete) não
-- tem nenhuma checagem de vínculo hoje (diferente de deletarCliente, que
-- inativa em vez de excluir quando há OS/agendamento vinculado). Com a FK
-- original (ON DELETE CASCADE), excluir um produto apagava seu histórico de
-- movimentação silenciosamente, sem aviso.
--
-- Decisão: trocar CASCADE por RESTRICT. Excluir um produto que já tem
-- qualquer linha em movimentacoes_estoque agora falha com 23503
-- (foreign_key_violation) em vez de apagar o histórico — useProdutosSupabase.ts
-- traduz esse erro pra uma mensagem clara na UI (ver commit correspondente).
-- Produto sem nenhuma movimentação continua excluível normalmente: RESTRICT
-- só bloqueia quando existe pelo menos uma linha filha de verdade.
--
-- DROP+ADD da constraint (não recria a tabela, não reescreve dados — troca
-- só a ação ON DELETE); gerado via `npx prisma migrate diff --from-schema
-- <schema antes desta migration> --to-schema prisma/schema.prisma --script`.
ALTER TABLE "movimentacoes_estoque" DROP CONSTRAINT "movimentacoes_estoque_lojaId_produtoId_fkey";

ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_lojaId_produtoId_fkey" FOREIGN KEY ("lojaId", "produtoId") REFERENCES "produtos"("lojaId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
