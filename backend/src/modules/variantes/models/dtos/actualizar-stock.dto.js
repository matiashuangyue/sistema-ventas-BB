class ActualizarStockDto {
  constructor(body = {}) {
    this.stock = body.stock;
  }

  static from(body) {
    return new ActualizarStockDto(body);
  }
}

module.exports = ActualizarStockDto;
