class CrearCobroDto {
  constructor(body = {}) {
    this.ventaId = body?.ventaId;
    this.monto = body?.monto;
    this.formaPago = body?.formaPago;
    this.observaciones = body?.observaciones;
  }

  static from(body) {
    return new CrearCobroDto(body);
  }
}

module.exports = CrearCobroDto;
