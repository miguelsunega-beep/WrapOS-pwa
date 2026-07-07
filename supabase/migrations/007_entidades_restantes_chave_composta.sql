-- DropIndex
DROP INDEX "agendamentos_lojaId_idx";

-- DropIndex
DROP INDEX "instaladores_lojaId_idx";

-- DropIndex
DROP INDEX "garantias_lojaId_idx";

-- DropIndex
DROP INDEX "metas_lojaId_idx";

-- DropIndex
DROP INDEX "servicos_lojaId_idx";

-- AlterTable
ALTER TABLE "agendamentos" DROP CONSTRAINT "agendamentos_pkey",
ADD CONSTRAINT "agendamentos_pkey" PRIMARY KEY ("lojaId", "id");

-- AlterTable
ALTER TABLE "instaladores" DROP CONSTRAINT "instaladores_pkey",
ADD CONSTRAINT "instaladores_pkey" PRIMARY KEY ("lojaId", "id");

-- AlterTable
ALTER TABLE "garantias" DROP CONSTRAINT "garantias_pkey",
ADD CONSTRAINT "garantias_pkey" PRIMARY KEY ("lojaId", "id");

-- AlterTable
ALTER TABLE "metas" DROP CONSTRAINT "metas_pkey",
ADD CONSTRAINT "metas_pkey" PRIMARY KEY ("lojaId", "id");

-- AlterTable
ALTER TABLE "configuracoes" DROP CONSTRAINT "configuracoes_pkey",
ADD CONSTRAINT "configuracoes_pkey" PRIMARY KEY ("lojaId", "id");

-- AlterTable
ALTER TABLE "servicos" DROP CONSTRAINT "servicos_pkey",
ADD CONSTRAINT "servicos_pkey" PRIMARY KEY ("lojaId", "id");
