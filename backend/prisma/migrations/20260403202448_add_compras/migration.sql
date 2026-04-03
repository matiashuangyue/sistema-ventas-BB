-- CreateTable
CREATE TABLE "Compra" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "proveedor" TEXT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total" REAL NOT NULL,
    "observaciones" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CompraDetalle" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "compraId" INTEGER NOT NULL,
    "varianteId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "costoUnitario" REAL NOT NULL,
    "subtotal" REAL NOT NULL,
    CONSTRAINT "CompraDetalle_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "Compra" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CompraDetalle_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "Variante" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
