class CrearProductoDto {
  constructor(body = {}) {
    this.nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
    this.categoria = body.categoria;
  }

  static from(body) {
    return new CrearProductoDto(body);
  }
}

module.exports = CrearProductoDto;
