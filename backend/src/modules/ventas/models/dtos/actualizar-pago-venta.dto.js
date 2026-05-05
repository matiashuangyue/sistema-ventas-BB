class ActualizarPagoVentaDto {
  constructor(body = {}) {
    this.formaPago = body.formaPago;
    this.montoPagado =
      body.montoPagado == null || body.montoPagado === ""
        ? null
        : Number(body.montoPagado);
    this.observacionesPago = body.observacionesPago;
  }

  static from(body) {
    return new ActualizarPagoVentaDto(body);
  }
}

module.exports = ActualizarPagoVentaDto;
