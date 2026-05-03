class ActualizarProductoDto {
  constructor(body = {}) {
    this.nombre = body.nombre;
    this.categoria = body.categoria;
  }

  static from(body) {
    return new ActualizarProductoDto(body);
  }
}

module.exports = ActualizarProductoDto;
