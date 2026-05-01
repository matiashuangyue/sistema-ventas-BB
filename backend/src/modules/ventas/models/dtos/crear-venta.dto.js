class CrearVentaDto {
  constructor(body = {}) {
    this.clienteId = body.clienteId == null ? null : Number(body.clienteId);
    this.descuento = Number(body.descuento ?? 0);
    this.items = Array.isArray(body.items) ? body.items : [];
  }

  static from(body) {
    return new CrearVentaDto(body);
  }
}

module.exports = CrearVentaDto;
