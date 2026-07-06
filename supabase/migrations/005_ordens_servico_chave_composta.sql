-- DropIndex
DROP INDEX "ordens_servico_lojaId_idx";

-- AlterTable
ALTER TABLE "ordens_servico" DROP CONSTRAINT "ordens_servico_pkey",
ADD CONSTRAINT "ordens_servico_pkey" PRIMARY KEY ("lojaId", "id");
