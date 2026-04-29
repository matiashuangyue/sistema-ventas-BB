class CrearClienteDto {
  constructor(body = {}) {
    this.nombre = body.nombre;
    this.email = body.email;
    this.telefono = body.telefono;
    this.direccion = body.direccion;
    this.localidad = body.localidad;
    this.cuit = body.cuit;
    this.observaciones = body.observaciones;
  }

  static from(body) {
    return new CrearClienteDto(body);
  }
}

module.exports = CrearClienteDto;
