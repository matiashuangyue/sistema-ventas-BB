const express = require("express");

const handleControllerError = require("../../../shared/http/handle-controller-error");
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

module.exports = router;
