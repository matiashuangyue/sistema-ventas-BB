class CrearAjusteCuentaDto {
  constructor(body = {}) {
    this.tipo = body?.tipo;
    this.monto = body?.monto;
    this.motivo = body?.motivo;
  }

  static from(body) {
    return new CrearAjusteCuentaDto(body);
  }
}

module.exports = CrearAjusteCuentaDto;
