-- AlterTable
ALTER TABLE "Venta"
ADD COLUMN "formaPago" TEXT NOT NULL DEFAULT 'EFECTIVO',
ADD COLUMN "montoPagado" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "saldoPendiente" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "estadoPago" TEXT NOT NULL DEFAULT 'PAGADA',
ADD COLUMN "observacionesPago" TEXT;

-- CreateTable
CREATE TABLE "Cobro" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER,
    "ventaId" INTEGER,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monto" DOUBLE PRECISION NOT NULL,
    "formaPago" TEXT NOT NULL,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cobro_pkey" PRIMARY KEY ("id")
);

-- Backfill existing sales as paid, preserving current behavior.
UPDATE "Venta"
SET "montoPagado" = "total",
    "saldoPendiente" = 0,
    "estadoPago" = 'PAGADA'
WHERE "montoPagado" = 0;

INSERT INTO "Cobro" ("clienteId", "ventaId", "fecha", "monto", "formaPago", "observaciones", "createdAt")
SELECT "clienteId", "id", "fecha", "total", "formaPago", 'Pago registrado al migrar venta existente', "createdAt"
FROM "Venta"
WHERE "clienteId" IS NOT NULL
  AND "total" > 0;

-- CreateIndex
CREATE INDEX "Cobro_clienteId_idx" ON "Cobro"("clienteId");
CREATE INDEX "Cobro_ventaId_idx" ON "Cobro"("ventaId");

-- AddForeignKey
ALTER TABLE "Cobro" ADD CONSTRAINT "Cobro_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Cobro" ADD CONSTRAINT "Cobro_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE SET NULL ON UPDATE CASCADE;
