const express = require("express");

const handleControllerError = require("../../../shared/http/handle-controller-error");
const CrearListaPrecioDto = require("../models/dtos/crear-lista-precio.dto");
const listasPrecioService = require("../services/listas-precio.service");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const dto = CrearListaPrecioDto.from(req.body);
    const lista = await listasPrecioService.crearListaPrecio(dto);
    res.json(lista);
  } catch (error) {
    handleControllerError(res, error, "Error creando lista de precio");
  }
});

router.get("/", async (req, res) => {
  try {
    const listas = await listasPrecioService.listarListasPrecio();
    res.json(listas);
  } catch (error) {
    handleControllerError(res, error, "Error obteniendo listas de precio");
  }
});

module.exports = router;
