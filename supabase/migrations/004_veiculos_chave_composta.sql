-- DropForeignKey
ALTER TABLE "ordens_servico" DROP CONSTRAINT "ordens_servico_veiculoId_fkey";

-- DropIndex
DROP INDEX "veiculos_lojaId_idx";

-- AlterTable
ALTER TABLE "veiculos" DROP CONSTRAINT "veiculos_pkey",
ADD CONSTRAINT "veiculos_pkey" PRIMARY KEY ("lojaId", "id");

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_lojaId_veiculoId_fkey" FOREIGN KEY ("lojaId", "veiculoId") REFERENCES "veiculos"("lojaId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
