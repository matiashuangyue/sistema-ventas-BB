class CrearVentaDto {
  constructor(body = {}) {
    this.clienteId = body.clienteId == null ? null : Number(body.clienteId);
    this.descuento = Number(body.descuento ?? 0);
    this.formaPago = body.formaPago;
    this.montoPagado =
      body.montoPagado == null || body.montoPagado === ""
        ? null
        : Number(body.montoPagado);
    this.observacionesPago = body.observacionesPago;
    this.items = Array.isArray(body.items)
      ? body.items.map((item) => ({
          varianteId: item.varianteId,
          cantidad: item.cantidad,
          precioEditado: item.precioEditado != null ? Number(item.precioEditado) : null,
        }))
      : [];
  }

  static from(body) {
    return new CrearVentaDto(body);
  }
}

module.exports = CrearVentaDto;
