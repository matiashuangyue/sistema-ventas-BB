const logger = require("../../../shared/logger/logger");
const listasPrecioRepository = require("../repositories/listas-precio.repository");

async function crearListaPrecio(dto) {
  logger.info(`Se inicia la creacion de lista de precio ${dto.nombre || "sin nombre"}`);

  const lista = await listasPrecioRepository.createListaPrecio({
    nombre: dto.nombre,
  });

  logger.info(`Lista de precio creada correctamente con id ${lista.id}`);

  return lista;
}

async function inicializarListasPrecio() {
  try {
    logger.info("Se inicia la inicializacion de listas de precio base");

    const listas = ["Lista 1", "Lista 2", "Lista 3"];

    for (const nombre of listas) {
      const existente = await listasPrecioRepository.findByNombre(nombre);

      if (!existente) {
        const lista = await listasPrecioRepository.createListaPrecio({
          nombre,
          activa: true,
        });

        logger.info(`Lista de precio base creada con id ${lista.id}: ${nombre}`);
      }
    }

    logger.info("Listas de precio inicializadas");
  } catch (error) {
    logger.error("Error inicializando listas de precio", {
      message: error.message,
    });
  }
}

async function listarListasPrecio() {
  logger.info("Se inicia el listado de listas de precio");

  const listas = await listasPrecioRepository.findManyWithPrecios();

  logger.info(`Listado de listas de precio finalizado con ${listas.length} registros`);

  return listas;
}

module.exports = {
  crearListaPrecio,
  inicializarListasPrecio,
  listarListasPrecio,
};
