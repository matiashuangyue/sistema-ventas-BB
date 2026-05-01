class ActualizarPrecioVarianteDto {
  constructor(body = {}) {
    this.precio = body.precio;
    this.cantidadMinima = body.cantidadMinima;
    this.listaPrecioId = body.listaPrecioId;
    this.varianteId = body.varianteId;
  }

  static from(body) {
    return new ActualizarPrecioVarianteDto(body);
  }
}

module.exports = ActualizarPrecioVarianteDto;
