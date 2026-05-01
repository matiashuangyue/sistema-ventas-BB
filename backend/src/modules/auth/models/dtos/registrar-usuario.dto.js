class RegistrarUsuarioDto {
  constructor(body = {}) {
    this.nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
    this.username =
      typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    this.password = body.password;
    this.email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    this.rol = body.rol;
    this.codigoInvitacion =
      typeof body.codigoInvitacion === "string"
        ? body.codigoInvitacion.trim()
        : "";
  }

  static from(body) {
    return new RegistrarUsuarioDto(body);
  }
}

module.exports = RegistrarUsuarioDto;
