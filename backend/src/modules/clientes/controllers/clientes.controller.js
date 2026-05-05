const express = require("express");

const handleControllerError = require("../../../shared/http/handle-controller-error");
const ActualizarClienteDto = require("../models/dtos/actualizar-cliente.dto");
const BuscarClientesDto = require("../models/dtos/buscar-clientes.dto");
const CrearClienteDto = require("../models/dtos/crear-cliente.dto");
const clientesService = require("../services/clientes.service");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const dto = CrearClienteDto.from(req.body);
    const cliente = await clientesService.crearCliente(dto);
    res.json(cliente);
  } catch (error) {
    handleControllerError(
      res,
      error,
      "Error creando cliente. Tal vez el email ya existe.",
    );
  }
});

router.get("/", async (req, res) => {
  try {
    const clientes = await clientesService.listarClientes(req.query);
    res.json(clientes);
  } catch (error) {
    handleControllerError(res, error, "Error obteniendo clientes");
  }
});

router.get("/buscar", async (req, res) => {
  try {
    const dto = BuscarClientesDto.from(req.query);
    const clientes = await clientesService.buscarClientes(dto);
    res.json(clientes);
  } catch (error) {
    handleControllerError(res, error, "Error buscando clientes");
  }
});

router.put("/:id", async (req, res) => {
  try {
    const dto = ActualizarClienteDto.from(req.body);
    const cliente = await clientesService.actualizarCliente(req.params.id, dto);
    res.json(cliente);
  } catch (error) {
    handleControllerError(res, error, "Error actualizando cliente");
  }
});

module.exports = router;
