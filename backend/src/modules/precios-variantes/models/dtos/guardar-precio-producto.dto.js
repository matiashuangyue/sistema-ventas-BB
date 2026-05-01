class GuardarPrecioProductoDto {
  constructor(body = {}) {
    this.productoId = body.productoId;
    this.listaPrecioId = body.listaPrecioId;
    this.precio = body.precio;
    this.cantidadMinima = body.cantidadMinima;
  }

  static from(body) {
    return new GuardarPrecioProductoDto(body);
  }
}

module.exports = GuardarPrecioProductoDto;
