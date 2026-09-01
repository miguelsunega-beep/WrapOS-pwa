-- Alternativa A do plano de otimização de Estoque (ver relatório de
-- levantamento anterior): resolve na raiz o truncamento pra inteiro que
-- acontecia em 3 pontos independentes (coluna Int, RPCs com cast ::integer,
-- parseInt() no client) e substitui o hack CATEGORIAS_ROLO hardcoded
-- (useEstoque.ts) por um campo real de tipo de controle.
--
-- quantidade/minimo: Int → numeric(10,2). Confirmado empiricamente ANTES de
-- decidir o tipo — criada uma tabela de teste com coluna numeric(10,2),
-- consultada via REST com a anon key, e o valor voltou como number nativo no
-- JSON (`6.00`, não `"6.00"`) — ao contrário de bigint/int8, que o
-- PostgREST/Postgres retornam como string. Ou seja, nenhuma normalização
-- extra é necessária em useProdutosSupabase.ts só por causa da troca de tipo;
-- o client já lê `row.quantidade as number` corretamente.
--
-- tipoControle: novo enum TipoControleEstoque ('unidade'|'bobina'|'volume'),
-- NOT NULL DEFAULT 'unidade' — nenhum produto existente muda de
-- comportamento por causa do default; o backfill abaixo marca os que já
-- eram tratados como rolo pelo hack antigo.
--
-- quantidadeOriginal: nullable, só relevante pra tipoControle='bobina'
-- (comprimento total no momento do cadastro/reabastecimento; a metragem
-- restante continua em `quantidade`, mesmo padrão de hoje).
--
-- isRetalho: marca produto que é sobra de corte reaproveitável, não remessa
-- comprada nova — usado pra filtrar a listagem principal e exibir uma badge
-- diferente no Round 2 de UI. Nenhum fluxo cria isRetalho=true ainda nesta
-- etapa (não há UI pra isso); o campo só entra pronto no schema.

-- ── DDL (gerado via `npx prisma migrate diff --from-schema <schema antes
-- desta migration> --to-schema prisma/schema.prisma --script`, sem edição
-- manual) ──────────────────────────────────────────────────────
CREATE TYPE "TipoControleEstoque" AS ENUM ('unidade', 'bobina', 'volume');

ALTER TABLE "produtos" ADD COLUMN     "isRetalho" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "quantidadeOriginal" DECIMAL(10,2),
ADD COLUMN     "tipoControle" "TipoControleEstoque" NOT NULL DEFAULT 'unidade',
ALTER COLUMN "quantidade" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "minimo" SET DATA TYPE DECIMAL(10,2);

-- ── Migração one-time de dados existentes ──────────────────────
-- Produtos que o hack CATEGORIAS_ROLO (useEstoque.ts) já tratava como rolo
-- (categoria PPF/Envelopamento) recebem tipoControle='bobina' de verdade.
-- quantidadeOriginal usa a quantidade ATUAL como aproximação — o
-- "comprimento total original" de antes desta migration não é recuperável
-- com precisão (nunca foi armazenado separadamente; a coluna quantidade
-- sempre guardou só o "restante", que já pode ter sido parcialmente
-- consumido por OS's concluídas). Aceito conscientemente: é só um ponto de
-- partida, não um histórico retroativo.
UPDATE "produtos"
SET "tipoControle" = 'bobina',
    "quantidadeOriginal" = "quantidade"
WHERE "categoria" IN ('PPF', 'Envelopamento');

-- RLS: nenhuma mudança necessária. As policies de "produtos" (ver
-- supabase/policies.sql) filtram só por "lojaId" na USING — não referenciam
-- quantidade/minimo/tipoControle/isRetalho, então colunas novas ou com tipo
-- alterado não afetam o predicado. Confirmado via pg_policies antes de
-- aplicar esta migration (1 policy em produtos, "produtos_por_loja", igual
-- às outras 10 entidades — nenhuma policy referencia essas colunas).
