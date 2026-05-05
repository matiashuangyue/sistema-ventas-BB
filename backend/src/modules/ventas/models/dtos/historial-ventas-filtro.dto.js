class HistorialVentasFiltroDto {
  constructor(query = {}) {
    this.desde = query.desde;
    this.hasta = query.hasta;
    this.cliente =
      typeof query.cliente === "string" ? query.cliente.trim() : "";
    this.page = query.page;
    this.limit = query.limit;
  }

  static from(query) {
    return new HistorialVentasFiltroDto(query);
  }
}

module.exports = HistorialVentasFiltroDto;
