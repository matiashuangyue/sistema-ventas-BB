class CrearListaPrecioDto {
  constructor(body = {}) {
    this.nombre = body.nombre;
  }

  static from(body) {
    return new CrearListaPrecioDto(body);
  }
}

module.exports = CrearListaPrecioDto;
