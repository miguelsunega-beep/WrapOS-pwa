-- DropIndex
DROP INDEX "lancamentos_financeiro_lojaId_idx";

-- DropIndex
DROP INDEX "produtos_lojaId_idx";

-- AlterTable
ALTER TABLE "lancamentos_financeiro" DROP CONSTRAINT "lancamentos_financeiro_pkey",
ADD CONSTRAINT "lancamentos_financeiro_pkey" PRIMARY KEY ("lojaId", "id");

-- AlterTable
ALTER TABLE "produtos" DROP CONSTRAINT "produtos_pkey",
ADD CONSTRAINT "produtos_pkey" PRIMARY KEY ("lojaId", "id");
