class CrearVarianteDto {
  constructor(body = {}) {
    this.nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
    this.stock = body.stock ?? 0;
    this.stockMinimo = body.stockMinimo ?? 0;
    this.productoId = body.productoId;
  }

  static from(body) {
    return new CrearVarianteDto(body);
  }
}

module.exports = CrearVarianteDto;
