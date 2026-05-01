class CrearCompraDto {
  constructor(body = {}) {
    this.proveedor = body.proveedor ?? null;
    this.observaciones = body.observaciones ?? null;
    this.items = Array.isArray(body.items) ? body.items : [];
  }

  static from(body) {
    return new CrearCompraDto(body);
  }
}

module.exports = CrearCompraDto;
