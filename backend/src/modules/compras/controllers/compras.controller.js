const express = require("express");

const authMiddleware = require("../../../middlewares/auth.middleware");
const handleControllerError = require("../../../shared/http/handle-controller-error");
const CrearCompraDto = require("../models/dtos/crear-compra.dto");
const comprasService = require("../services/compras.service");

const router = express.Router();

router.post("/", authMiddleware, async (req, res) => {
  try {
    const dto = CrearCompraDto.from(req.body);
    const compra = await comprasService.crearCompra(dto);
    res.json(compra);
  } catch (error) {
    handleControllerError(res, error, "Error creando compra", 400, {
      exposeOriginalMessage: true,
    });
  }
});

router.get("/", authMiddleware, async (req, res) => {
  try {
    const compras = await comprasService.listarCompras();
    res.json(compras);
  } catch (error) {
    handleControllerError(res, error, "Error obteniendo compras");
  }
});

module.exports = router;
