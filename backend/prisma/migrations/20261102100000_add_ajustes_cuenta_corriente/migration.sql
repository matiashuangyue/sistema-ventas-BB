BEGIN;

-- El nuevo valor predeterminado no modifica las ventas existentes.
ALTER TABLE "Venta" ALTER COLUMN "formaPago" SET DEFAULT 'CUENTA_CORRIENTE';

-- Los ajustes son movimientos de cuenta; no alteran ventas, cobros ni stock.
CREATE TABLE "AjusteCuentaCorriente" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monto" DOUBLE PRECISION NOT NULL,
    "motivo" TEXT NOT NULL,
    "usuarioId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AjusteCuentaCorriente_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AjusteCuentaCorriente_clienteId_fecha_idx" ON "AjusteCuentaCorriente"("clienteId", "fecha");
CREATE INDEX "AjusteCuentaCorriente_usuarioId_idx" ON "AjusteCuentaCorriente"("usuarioId");

ALTER TABLE "AjusteCuentaCorriente" ADD CONSTRAINT "AjusteCuentaCorriente_clienteId_fkey"
    FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AjusteCuentaCorriente" ADD CONSTRAINT "AjusteCuentaCorriente_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
