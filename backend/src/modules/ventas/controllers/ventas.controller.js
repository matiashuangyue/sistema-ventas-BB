const express = require("express");

const handleControllerError = require("../../../shared/http/handle-controller-error");
const CrearVentaDto = require("../models/dtos/crear-venta.dto");
const HistorialVentasFiltroDto = require("../models/dtos/historial-ventas-filtro.dto");
const ventasService = require("../services/ventas.service");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const dto = CrearVentaDto.from(req.body);
    const venta = await ventasService.crearVenta(dto);
    res.json(venta);
  } catch (error) {
    handleControllerError(res, error, "Error creando venta", 400, {
      exposeOriginalMessage: true,
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const ventas = await ventasService.listarVentas();
    res.json(ventas);
  } catch (error) {
    handleControllerError(res, error, "Error obteniendo ventas");
  }
});

router.get("/historial", async (req, res) => {
  try {
    const dto = HistorialVentasFiltroDto.from(req.query);
    const historial = await ventasService.obtenerHistorial(dto);
    res.json(historial);
  } catch (error) {
    handleControllerError(res, error, "Error obteniendo historial de ventas");
  }
});

router.get("/:id", async (req, res) => {
  try {
    const venta = await ventasService.obtenerVentaPorId(req.params.id);
    res.json(venta);
  } catch (error) {
    handleControllerError(res, error, "Error obteniendo detalle de venta");
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const resultado = await ventasService.eliminarVenta(req.params.id);
    res.json(resultado);
  } catch (error) {
    handleControllerError(res, error, "Error eliminando venta");
  }
});

module.exports = router;
