class CrearCobroDto {
  constructor(body = {}) {
    this.ventaId = body.ventaId == null ? null : Number(body.ventaId);
    this.monto =
      body.monto == null || body.monto === "" ? null : Number(body.monto);
    this.formaPago = body.formaPago;
    this.observaciones = body.observaciones;
  }

  static from(body) {
    return new CrearCobroDto(body);
  }
}

module.exports = CrearCobroDto;
