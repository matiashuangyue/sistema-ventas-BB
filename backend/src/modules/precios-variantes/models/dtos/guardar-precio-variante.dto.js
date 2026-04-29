class GuardarPrecioVarianteDto {
  constructor(body = {}) {
    this.varianteId = body.varianteId;
    this.listaPrecioId = body.listaPrecioId;
    this.precio = body.precio;
    this.cantidadMinima = body.cantidadMinima;
  }

  static from(body) {
    return new GuardarPrecioVarianteDto(body);
  }
}

module.exports = GuardarPrecioVarianteDto;
