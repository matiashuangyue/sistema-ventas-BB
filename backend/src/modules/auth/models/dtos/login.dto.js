class LoginDto {
  constructor(body = {}) {
    this.username =
      typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    this.password = body.password;
  }

  static from(body) {
    return new LoginDto(body);
  }
}

module.exports = LoginDto;
