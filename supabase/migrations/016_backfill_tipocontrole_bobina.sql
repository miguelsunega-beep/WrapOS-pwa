-- Reaplica o backfill one-time da migration 014 (tipoControle='bobina' +
-- quantidadeOriginal para produtos PPF/Envelopamento), que foi revertido nas
-- 3 linhas afetadas (p1, p2, p3, todas da loja de teste e2e) por um efeito
-- colateral não previsto: rodar a suíte Playwright (`npx playwright test`)
-- entre a migration 014 e este momento disparou e2e/global-setup.ts, que faz
-- DELETE + INSERT em `produtos` da loja de teste a partir de um array local
-- (DEMO_PRODUTOS) sem os campos tipoControle/quantidadeOriginal/isRetalho —
-- as linhas recriadas caíram no DEFAULT da coluna ('unidade', null),
-- apagando o backfill sem nenhum erro visível.
--
-- Esta migration só refaz o UPDATE, idêntico ao da 014. Não resolve a causa
-- raiz (e2e/global-setup.ts ainda vai reverter isso de novo na próxima vez
-- que a suíte rodar) — isso fica para uma correção separada no seed,
-- deliberadamente fora desta migration.
UPDATE "produtos"
SET "tipoControle" = 'bobina',
    "quantidadeOriginal" = "quantidade"
WHERE "categoria" IN ('PPF', 'Envelopamento');
