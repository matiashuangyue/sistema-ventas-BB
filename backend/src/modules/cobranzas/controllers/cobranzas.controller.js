const express = require("express");

const handleControllerError = require("../../../shared/http/handle-controller-error");
const CrearCobroDto = require("../models/dtos/crear-cobro.dto");
const cobranzasService = require("../services/cobranzas.service");

const router = express.Router();

router.get("/resumen", async (req, res) => {
  try {
    const resumen = await cobranzasService.listarResumen({
      cliente: req.query.cliente,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json(resumen);
  } catch (error) {
    handleControllerError(res, error, "Error obteniendo resumen de cobranzas");
  }
});

router.get("/clientes/:clienteId/cuenta-corriente", async (req, res) => {
  try {
    const cuenta = await cobranzasService.obtenerCuentaCorriente(
      req.params.clienteId,
    );
    res.json(cuenta);
  } catch (error) {
    handleControllerError(res, error, "Error obteniendo cuenta corriente");
  }
});

router.post("/cobros", async (req, res) => {
  try {
    const dto = CrearCobroDto.from(req.body);
    const cuenta = await cobranzasService.registrarCobro(dto);
    res.json(cuenta);
  } catch (error) {
    handleControllerError(res, error, "Error registrando cobro", 400, {
      exposeOriginalMessage: true,
    });
  }
});

module.exports = router;
