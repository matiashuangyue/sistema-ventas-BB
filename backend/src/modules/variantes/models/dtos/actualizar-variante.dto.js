class ActualizarVarianteDto {
  constructor(body = {}) {
    this.nombre = body.nombre;
    this.stockMinimo = body.stockMinimo;
    this.productoId = body.productoId;
  }

  static from(body) {
    return new ActualizarVarianteDto(body);
  }
}

module.exports = ActualizarVarianteDto;
