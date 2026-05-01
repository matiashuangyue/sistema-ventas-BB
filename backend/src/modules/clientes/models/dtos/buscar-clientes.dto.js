class BuscarClientesDto {
  constructor(query = {}) {
    this.q = typeof query.q === "string" ? query.q.trim() : "";
  }

  static from(query) {
    return new BuscarClientesDto(query);
  }
}

module.exports = BuscarClientesDto;
