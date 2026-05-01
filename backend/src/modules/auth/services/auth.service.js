const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const env = require("../../../config/env");
const AppError = require("../../../shared/errors/app-error");
const logger = require("../../../shared/logger/logger");
const authRepository = require("../repositories/auth.repository");

function toPublicUsuario(usuario) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    username: usuario.username,
    email: usuario.email,
    rol: usuario.rol,
  };
}

async function registrarUsuario(dto) {
  logger.info(
    `Se inicia el registro del usuario con nombre ${dto.nombre || "sin nombre"}`,
  );

  if (dto.codigoInvitacion !== env.invitationCode) {
    logger.warn(
      `Registro rechazado por codigo de invitacion incorrecto para usuario ${dto.username || "sin usuario"}`,
    );
    throw new AppError(
      "Codigo de invitacion incorrecto. Acceso denegado.",
      401,
    );
  }

  if (!dto.nombre || !dto.username || !dto.password || !dto.email) {
    logger.warn("Registro rechazado por datos obligatorios faltantes", {
      tieneNombre: Boolean(dto.nombre),
      tieneUsername: Boolean(dto.username),
      tienePassword: Boolean(dto.password),
      tieneEmail: Boolean(dto.email),
    });
    throw new AppError(
      "Faltan datos obligatorios (nombre, usuario, email y clave)",
    );
  }

  const existeUsuario = await authRepository.findByUsername(dto.username);
  if (existeUsuario) {
    logger.warn(`Registro rechazado: username ya existente ${dto.username}`);
    throw new AppError("El nombre de usuario ya esta en uso");
  }

  const existeEmail = await authRepository.findByEmail(dto.email);
  if (existeEmail) {
    logger.warn(`Registro rechazado: email ya registrado para ${dto.username}`);
    throw new AppError("El correo electronico ya esta registrado");
  }

  const passwordHash = await bcrypt.hash(dto.password, 10);
  const usuario = await authRepository.createUsuario({
    nombre: dto.nombre,
    username: dto.username,
    email: dto.email,
    password: passwordHash,
    rol: dto.rol || "admin",
  });

  logger.info(
    `Usuario registrado correctamente con id ${usuario.id} y username ${usuario.username}`,
  );

  return toPublicUsuario(usuario);
}

async function login(dto) {
  logger.info(`Se inicia login del usuario ${dto.username || "sin usuario"}`);

  const usuario = await authRepository.findByUsername(dto.username);

  if (!usuario) {
    logger.warn(`Login rechazado: usuario no encontrado ${dto.username}`);
    throw new AppError("Usuario o contrasena incorrectos", 401);
  }

  if (!usuario.activo) {
    logger.warn(`Login rechazado: usuario inactivo ${usuario.username}`);
    throw new AppError("Usuario inactivo", 403);
  }

  const passwordOk = await bcrypt.compare(dto.password || "", usuario.password);
  if (!passwordOk) {
    logger.warn(
      `Login rechazado: contrasena incorrecta para ${usuario.username}`,
    );
    throw new AppError("Usuario o contrasena incorrectos", 401);
  }

  const token = jwt.sign(
    {
      id: usuario.id,
      username: usuario.username,
      rol: usuario.rol,
    },
    env.jwtSecret,
    { expiresIn: "8h" },
  );

  logger.info(`Login exitoso para usuario ${usuario.username}`);

  return {
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      username: usuario.username,
      rol: usuario.rol,
    },
  };
}

module.exports = {
  login,
  registrarUsuario,
};
