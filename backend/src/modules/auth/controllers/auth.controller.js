const express = require("express");

const authMiddleware = require("../../../middlewares/auth.middleware");
const handleControllerError = require("../../../shared/http/handle-controller-error");
const LoginDto = require("../models/dtos/login.dto");
const RegistrarUsuarioDto = require("../models/dtos/registrar-usuario.dto");
const authService = require("../services/auth.service");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const dto = RegistrarUsuarioDto.from(req.body);
    const usuario = await authService.registrarUsuario(dto);
    res.json(usuario);
  } catch (error) {
    handleControllerError(res, error, "Error interno al registrar usuario");
  }
});

router.post("/login", async (req, res) => {
  try {
    const dto = LoginDto.from(req.body);
    const resultado = await authService.login(dto);
    res.json(resultado);
  } catch (error) {
    handleControllerError(res, error, "Error en login");
  }
});

router.get("/me", authMiddleware, (req, res) => {
  res.json({
    mensaje: "Usuario autenticado",
    user: req.user,
  });
});

module.exports = router;
