const express = require("express");

const handleControllerError = require("../../../shared/http/handle-controller-error");
const ActualizarPrecioVarianteDto = require("../models/dtos/actualizar-precio-variante.dto");
const GuardarPrecioProductoDto = require("../models/dtos/guardar-precio-producto.dto");
const GuardarPrecioVarianteDto = require("../models/dtos/guardar-precio-variante.dto");
const preciosVariantesService = require("../services/precios-variantes.service");

const router = express.Router();

router.post("/por-producto", async (req, res) => {
  try {
    const dto = GuardarPrecioProductoDto.from(req.body);
    const resultado =
      await preciosVariantesService.guardarPrecioPorProducto(dto);
    res.json(resultado);
  } catch (error) {
    handleControllerError(res, error, "Error actualizando precios por producto");
  }
});

router.post("/", async (req, res) => {
  try {
    const dto = GuardarPrecioVarianteDto.from(req.body);
    const precioVariante =
      await preciosVariantesService.guardarPrecioVariante(dto);
    res.json(precioVariante);
  } catch (error) {
    handleControllerError(res, error, "Error creando/actualizando precio");
  }
});

router.get("/", async (req, res) => {
  try {
    const precios = await preciosVariantesService.listarPreciosVariantes();
    res.json(precios);
  } catch (error) {
    handleControllerError(res, error, "Error obteniendo precios de variantes");
  }
});

router.put("/:id", async (req, res) => {
  try {
    const dto = ActualizarPrecioVarianteDto.from(req.body);
    const actualizado = await preciosVariantesService.actualizarPrecioVariante(
      req.params.id,
      dto,
    );
    res.json(actualizado);
  } catch (error) {
    handleControllerError(res, error, "Error actualizando precio");
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await preciosVariantesService.eliminarPrecioVariante(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    handleControllerError(res, error, "Error eliminando precio");
  }
});

module.exports = router;
