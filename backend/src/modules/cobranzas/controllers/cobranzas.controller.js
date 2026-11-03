const express = require("express");

const optionalAuthMiddleware = require("../../../middlewares/optional-auth.middleware");
const handleControllerError = require("../../../shared/http/handle-controller-error");
const CrearCobroDto = require("../models/dtos/crear-cobro.dto");
const CrearAjusteCuentaDto = require("../models/dtos/crear-ajuste-cuenta.dto");
const cobranzasService = require("../services/cobranzas.service");

const router = express.Router();

router.get("/resumen", async (req, res) => {
  try {
    const resumen = await cobranzasService.listarResumen({
      cliente: req.query.cliente,
      soloConDeuda: req.query.soloConDeuda,
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

router.post("/clientes/:clienteId/ajustes", optionalAuthMiddleware, async (req, res) => {
  try {
    const dto = CrearAjusteCuentaDto.from(req.body);
    const cuenta = await cobranzasService.registrarAjuste(req.params.clienteId, dto, req.user?.id);
    res.json(cuenta);
  } catch (error) {
    handleControllerError(res, error, "Error registrando ajuste de cuenta corriente");
  }
});

router.post("/clientes/:clienteId/cobros", async (req, res) => {
  try {
    const dto = CrearCobroDto.from(req.body);
    const cuenta = await cobranzasService.registrarCobroCliente(req.params.clienteId, dto);
    res.json(cuenta);
  } catch (error) {
    handleControllerError(res, error, "Error registrando cobro de cuenta corriente");
  }
});

router.get("/cobros", async (req, res) => {
  try {
    const listado = await cobranzasService.listarCobrosDelDia(req.query.fecha);
    res.set("Cache-Control", "no-store");
    res.json(listado);
  } catch (error) {
    handleControllerError(res, error, "Error obteniendo cobranzas del dia");
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
