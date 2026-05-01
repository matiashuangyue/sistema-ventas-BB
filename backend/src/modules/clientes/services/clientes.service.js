const AppError = require("../../../shared/errors/app-error");
const logger = require("../../../shared/logger/logger");
const clientesRepository = require("../repositories/clientes.repository");

function dataFromDto(dto) {
  return {
    nombre: dto.nombre,
    email: dto.email,
    telefono: dto.telefono,
    direccion: dto.direccion,
    localidad: dto.localidad,
    cuit: dto.cuit,
    observaciones: dto.observaciones,
  };
}

async function crearCliente(dto) {
  logger.info(`Se inicia la creacion de cliente ${dto.nombre || "sin nombre"}`);

  if (!dto.nombre) {
    logger.warn("Creacion de cliente rechazada: nombre obligatorio faltante");
    throw new AppError("El nombre es obligatorio");
  }

  const cliente = await clientesRepository.createCliente(dataFromDto(dto));

  logger.info(`Cliente creado correctamente con id ${cliente.id}`);

  return cliente;
}

async function listarClientes() {
  logger.info("Se inicia el listado de clientes");

  const clientes = await clientesRepository.findClientes();

  logger.info(`Listado de clientes finalizado con ${clientes.length} registros`);

  return clientes;
}

async function buscarClientes(dto) {
  logger.info(`Se inicia la busqueda de clientes con termino ${dto.q || "vacio"}`);

  if (!dto.q) {
    logger.info("Busqueda de clientes finalizada sin termino de busqueda");
    return [];
  }

  const clientes = await clientesRepository.searchClientes(dto.q);

  logger.info(`Busqueda de clientes finalizada con ${clientes.length} registros`);

  return clientes;
}

async function actualizarCliente(id, dto) {
  logger.info(`Se inicia la actualizacion de cliente ${id}`);

  if (!dto.nombre) {
    logger.warn(`Actualizacion de cliente rechazada: nombre faltante para id ${id}`);
    throw new AppError("El nombre es obligatorio");
  }

  const cliente = await clientesRepository.updateCliente(Number(id), dataFromDto(dto));

  logger.info(`Cliente ${id} actualizado correctamente`);

  return cliente;
}

module.exports = {
  actualizarCliente,
  buscarClientes,
  crearCliente,
  listarClientes,
};
