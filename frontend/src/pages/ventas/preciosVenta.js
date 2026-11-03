export const redondearMonto = (valor) => Math.round((Number(valor) + Number.EPSILON) * 100) / 100;

export function normalizarAumento(valor = 0) {
  if (!["string", "number"].includes(typeof valor)) return null;
  const porcentaje = Number(valor);
  return Number.isFinite(porcentaje) && porcentaje >= 0 ? porcentaje : null;
}

export function obtenerPrecioAplicado(variante, cantidad) {
  const precio = variante?.precios
    ?.filter((p) => p.cantidadMinima != null && p.cantidadMinima <= cantidad && cantidad > 0)
    .sort((a, b) => b.cantidadMinima - a.cantidadMinima)[0];
  return {
    precioUnitario: precio?.precio ?? 0,
    cantidadMinima: precio?.cantidadMinima ?? null,
  };
}

export function calcularPrecioItem(item, variante, aumentoPorcentaje = 0) {
  const aplicado = obtenerPrecioAplicado(variante, Number(item.cantidad));
  const precioBase = Number(item.precioEditado ?? aplicado.precioUnitario);
  const porcentaje = normalizarAumento(aumentoPorcentaje);
  const precioUnitario = porcentaje == null ? NaN : redondearMonto(precioBase * (1 + porcentaje / 100));
  const subtotal = redondearMonto(precioUnitario * Number(item.cantidad));
  const valido = [precioBase, precioUnitario, subtotal].every((valor) =>
    Number.isFinite(valor) && valor >= 0 && Number.isSafeInteger(Math.round(valor * 100)));
  return { ...aplicado, precioLista: aplicado.precioUnitario, precioBase, precioUnitario, subtotal, valido };
}

export function calcularSubtotalVenta(carrito, variantes, aumentoPorcentaje = 0) {
  return redondearMonto(carrito.reduce((total, item) => {
    const variante = variantes.find((v) => v.id === item.varianteId);
    if (!variante || !item.cantidad) return total;
    return total + calcularPrecioItem(item, variante, aumentoPorcentaje).subtotal;
  }, 0));
}
