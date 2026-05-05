CREATE INDEX "Producto_activo_nombre_idx" ON "Producto"("activo", "nombre");

CREATE INDEX "Variante_activo_productoId_idx" ON "Variante"("activo", "productoId");

CREATE INDEX "Variante_activo_nombre_idx" ON "Variante"("activo", "nombre");

CREATE INDEX "PrecioVariante_varianteId_cantidadMinima_idx" ON "PrecioVariante"("varianteId", "cantidadMinima");

CREATE INDEX "PrecioVariante_listaPrecioId_idx" ON "PrecioVariante"("listaPrecioId");
