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

function normalizarEntero(valor, fallback, { min = 1, max = 100 } = {}) {
  const numero = Number(valor);

  if (!Number.isInteger(numero)) return fallback;

  return Math.min(Math.max(numero, min), max);
}

function crearFiltroListado(query = {}) {
  const search = String(query.search || query.q || "").trim();

  if (!search) {
    return undefined;
  }

  return {
    OR: [
      { nombre: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { telefono: { contains: search, mode: "insensitive" } },
      { direccion: { contains: search, mode: "insensitive" } },
      { localidad: { contains: search, mode: "insensitive" } },
      { cuit: { contains: search, mode: "insensitive" } },
    ],
  };
}

function usaPaginacion(query = {}) {
  return (
    query.page != null ||
    query.limit != null ||
    query.search != null ||
    query.q != null
  );
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

async function listarClientes(query = {}) {
  logger.info("Se inicia el listado de clientes");

  if (usaPaginacion(query)) {
    const page = normalizarEntero(query.page, 1, { min: 1, max: 100000 });
    const limit = normalizarEntero(query.limit, 25, { min: 1, max: 100 });
    const skip = (page - 1) * limit;
    const where = crearFiltroListado(query);
    const [total, clientes] = await clientesRepository.findClientesPage({
      where,
      skip,
      take: limit,
    });
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const paginaActual = Math.min(page, totalPages);

    if (page !== paginaActual) {
      const [totalRecalculado, clientesRecalculados] =
        await clientesRepository.findClientesPage({
          where,
          skip: (paginaActual - 1) * limit,
          take: limit,
        });

      logger.info(
        `Listado de clientes finalizado con ${clientesRecalculados.length} de ${totalRecalculado} registros`,
      );

      return {
        items: clientesRecalculados,
        page: paginaActual,
        limit,
        total: totalRecalculado,
        totalPages,
      };
    }

    logger.info(
      `Listado de clientes finalizado con ${clientes.length} de ${total} registros`,
    );

    return {
      items: clientes,
      page,
      limit,
      total,
      totalPages,
    };
  }

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
