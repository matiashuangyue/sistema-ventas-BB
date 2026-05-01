const express = require("express");

const handleControllerError = require("../../../shared/http/handle-controller-error");
const ActualizarStockDto = require("../models/dtos/actualizar-stock.dto");
const ActualizarVarianteDto = require("../models/dtos/actualizar-variante.dto");
const CrearVarianteDto = require("../models/dtos/crear-variante.dto");
const variantesService = require("../services/variantes.service");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const dto = CrearVarianteDto.from(req.body);
    const variante = await variantesService.crearVariante(dto);
    res.json(variante);
  } catch (error) {
    handleControllerError(res, error, "Error creando variante");
  }
});

router.get("/", async (req, res) => {
  try {
    const variantes = await variantesService.listarVariantes();
    res.json(variantes);
  } catch (error) {
    handleControllerError(res, error, "Error obteniendo variantes");
  }
});

router.put("/:id/stock", async (req, res) => {
  try {
    const dto = ActualizarStockDto.from(req.body);
    const variante = await variantesService.actualizarStock(req.params.id, dto);
    res.json(variante);
  } catch (error) {
    handleControllerError(res, error, "Error actualizando stock");
  }
});

router.put("/:id", async (req, res) => {
  try {
    const dto = ActualizarVarianteDto.from(req.body);
    const variante = await variantesService.actualizarVariante(
      req.params.id,
      dto,
    );
    res.json(variante);
  } catch (error) {
    handleControllerError(res, error, "Error actualizando variante");
  }
});

module.exports = router;
