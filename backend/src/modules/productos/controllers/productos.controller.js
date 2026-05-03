const express = require("express");

const handleControllerError = require("../../../shared/http/handle-controller-error");
const ActualizarProductoDto = require("../models/dtos/actualizar-producto.dto");
const CrearProductoDto = require("../models/dtos/crear-producto.dto");
const productosService = require("../services/productos.service");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const dto = CrearProductoDto.from(req.body);
    const producto = await productosService.crearProducto(dto);
    res.json(producto);
  } catch (error) {
    handleControllerError(res, error, "Error creando producto");
  }
});

router.get("/", async (req, res) => {
  try {
    const productos = await productosService.listarProductos();
    res.json(productos);
  } catch (error) {
    handleControllerError(res, error, "Error obteniendo productos");
  }
});

router.put("/:id", async (req, res) => {
  try {
    const dto = ActualizarProductoDto.from(req.body);
    const producto = await productosService.actualizarProducto(req.params.id, dto);
    res.json(producto);
  } catch (error) {
    handleControllerError(res, error, "Error actualizando producto");
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const resultado = await productosService.eliminarProducto(req.params.id);
    res.json({ ok: true, ...resultado });
  } catch (error) {
    handleControllerError(res, error, "Error eliminando producto");
  }
});

module.exports = router;
