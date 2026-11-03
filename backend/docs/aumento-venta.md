# Aumento porcentual por venta

En Ventas se puede indicar un porcentaje de aumento para todos los productos
de la venta actual. Se recalcula cada precio unitario y cada importe de línea.
También se aplica a productos agregados después de indicar el porcentaje.
Cambiar el porcentaje reemplaza el aumento anterior; poner cero lo quita.
La lista de precios no se modifica.

El porcentaje queda guardado en el borrador al salir o recargar la pantalla.
Se reinicia a cero al confirmar la venta o limpiar el borrador. Se puede quitar
con el botón **Quitar aumento** antes de confirmar.

`POST /ventas` acepta `aumentoPorcentaje`, opcional y con valor predeterminado
cero. Debe ser un número finito mayor o igual a cero; admite decimales y valores
mayores a cien. El servidor aplica el porcentaje al precio de lista según la
cantidad, o al `precioEditado` base cuando el ítem tiene un precio manual.
El frontend envía esos precios base, sin el aumento ya aplicado.

El precio unitario aumentado se redondea a centavos antes de multiplicarlo por
la cantidad. La suma de los importes de línea determina el subtotal; después
se aplica el descuento general. El pago y la deuda se calculan sobre ese total.
No se agrega un segundo recargo al final de la boleta.

Cada `VentaDetalle.precioUnitario` e importe quedan guardados con el aumento.
El historial, la edición y el PDF usan esos precios guardados. No se requiere
migración ni se recalculan las ventas anteriores. El porcentaje es una opción
al crear la venta; no es una tasa de interés ni modifica automáticamente deuda
ya registrada.

`node tests/aumento-venta.test.js` verifica cálculos, redondeo por unidad,
precios manuales, escalas, pagos, validación y reversión transaccional con
Prisma simulado, sin abrir la base real.

Para activar la función, desplegar primero el backend actualizado y luego el
frontend. El backend anterior no reconoce el porcentaje; ambos cambios deben
estar publicados para que la venta guarde los precios que muestra la pantalla.
