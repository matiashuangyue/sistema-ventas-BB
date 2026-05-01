class DashboardFiltrosDto {
  constructor(query = {}) {
    this.desde = query.desde;
    this.hasta = query.hasta;
  }

  static from(query) {
    return new DashboardFiltrosDto(query);
  }
}

module.exports = DashboardFiltrosDto;
