class ActualizarVentaDto {
  constructor(body = {}) {
    this.version = body?.version;
    this.descuento = body?.descuento;
    this.items = Array.isArray(body?.items)
      ? body.items.map((item) => ({
          detalleId: item?.detalleId,
          varianteId: item?.varianteId,
          cantidad: item?.cantidad,
          precioUnitario: item?.precioUnitario,
        }))
      : [];
  }

  static from(body) {
    return new ActualizarVentaDto(body);
  }
}

module.exports = ActualizarVentaDto;
