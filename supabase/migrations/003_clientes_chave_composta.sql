-- DropForeignKey
ALTER TABLE "veiculos" DROP CONSTRAINT "veiculos_clienteId_fkey";

-- DropForeignKey
ALTER TABLE "ordens_servico" DROP CONSTRAINT "ordens_servico_clienteId_fkey";

-- DropIndex
DROP INDEX "clientes_lojaId_idx";

-- AlterTable
ALTER TABLE "clientes" DROP CONSTRAINT "clientes_pkey",
ADD CONSTRAINT "clientes_pkey" PRIMARY KEY ("lojaId", "id");

-- AddForeignKey
ALTER TABLE "veiculos" ADD CONSTRAINT "veiculos_lojaId_clienteId_fkey" FOREIGN KEY ("lojaId", "clienteId") REFERENCES "clientes"("lojaId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_lojaId_clienteId_fkey" FOREIGN KEY ("lojaId", "clienteId") REFERENCES "clientes"("lojaId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

