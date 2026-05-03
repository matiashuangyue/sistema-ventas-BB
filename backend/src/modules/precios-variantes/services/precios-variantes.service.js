const AppError = require("../../../shared/errors/app-error");
const logger = require("../../../shared/logger/logger");
const preciosVariantesRepository = require("../repositories/precios-variantes.repository");

async function guardarPrecioVariante(dto) {
  logger.info(
    `Se inicia guardado de precio para variante ${dto.varianteId || "sin variante"} y lista ${dto.listaPrecioId || "sin lista"}`,
  );

  if (
    !dto.varianteId ||
    !dto.listaPrecioId ||
    dto.precio == null ||
    dto.cantidadMinima == null
  ) {
    logger.warn("Guardado de precio rechazado: datos obligatorios faltantes");
    throw new AppError("Faltan datos obligatorios");
  }

  const varianteId = Number(dto.varianteId);
  const listaPrecioId = Number(dto.listaPrecioId);
  const cantidadMinima = Number(dto.cantidadMinima);

  const existente = await preciosVariantesRepository.findByEscala(
    varianteId,
    listaPrecioId,
    cantidadMinima,
  );

  if (existente) {
    const precioActualizado =
      await preciosVariantesRepository.updatePrecioVariante(existente.id, {
      precio: Number(dto.precio),
    });

    logger.info(`Precio de variante actualizado correctamente con id ${existente.id}`);

    return precioActualizado;
  }

  const precioCreado = await preciosVariantesRepository.createPrecioVariante({
    varianteId,
    listaPrecioId,
    precio: Number(dto.precio),
    cantidadMinima,
  });

  logger.info(`Precio de variante creado correctamente con id ${precioCreado.id}`);

  return precioCreado;
}

async function guardarPrecioPorProducto(dto) {
  logger.info(
    `Se inicia actualizacion masiva de precio para producto ${dto.productoId || "sin producto"} y lista ${dto.listaPrecioId || "sin lista"}`,
  );

  if (
    !dto.productoId ||
    !dto.listaPrecioId ||
    dto.precio == null ||
    dto.cantidadMinima == null
  ) {
    logger.warn("Actualizacion masiva de precio rechazada: datos obligatorios faltantes");
    throw new AppError("Faltan datos obligatorios");
  }

  const productoId = Number(dto.productoId);
  const listaPrecioId = Number(dto.listaPrecioId);
  const cantidadMinima = Number(dto.cantidadMinima);
  const precio = Number(dto.precio);

  if (
    Number.isNaN(productoId) ||
    Number.isNaN(listaPrecioId) ||
    Number.isNaN(cantidadMinima) ||
    Number.isNaN(precio)
  ) {
    throw new AppError("Datos numericos invalidos");
  }

  const resultado = await preciosVariantesRepository.transaction(async (tx) => {
    const variantes = await preciosVariantesRepository.findVariantesByProducto(
      productoId,
      tx,
    );

    if (variantes.length === 0) {
      throw new AppError("El producto no tiene variantes para actualizar");
    }

    const varianteIds = variantes.map((variante) => variante.id);
    const preciosExistentes =
      await preciosVariantesRepository.findByEscalaForVariantes(
        varianteIds,
        listaPrecioId,
        cantidadMinima,
        tx,
      );

    const variantesConPrecio = new Set(
      preciosExistentes.map((precioExistente) => precioExistente.varianteId),
    );
    const precioIdsExistentes = preciosExistentes.map(
      (precioExistente) => precioExistente.id,
    );
    const preciosNuevos = variantes
      .filter((variante) => !variantesConPrecio.has(variante.id))
      .map((variante) => ({
        varianteId: variante.id,
        listaPrecioId,
        precio,
        cantidadMinima,
      }));

    const actualizados = precioIdsExistentes.length
      ? await preciosVariantesRepository.updateManyPreciosVariantesByIds(
          precioIdsExistentes,
          { precio },
          tx,
        )
      : { count: 0 };

    const creados = preciosNuevos.length
      ? await preciosVariantesRepository.createManyPreciosVariantes(
          preciosNuevos,
          tx,
        )
      : { count: 0 };

    const precios = await preciosVariantesRepository.findByEscalaForVariantes(
      varianteIds,
      listaPrecioId,
      cantidadMinima,
      tx,
    );

    return {
      productoId,
      listaPrecioId,
      cantidadMinima,
      precio,
      variantesActualizadas: variantes.length,
      preciosActualizados: actualizados.count,
      preciosCreados: creados.count,
      precios,
    };
  });

  logger.info(
    `Actualizacion masiva de precio finalizada para producto ${productoId}: ${resultado.variantesActualizadas} variantes`,
  );

  return resultado;
}

async function listarPreciosVariantes() {
  logger.info("Se inicia el listado de precios de variantes");

  const precios = await preciosVariantesRepository.findManyWithRelations();

  logger.info(`Listado de precios de variantes finalizado con ${precios.length} registros`);

  return precios;
}

async function actualizarPrecioVariante(id, dto) {
  logger.info(`Se inicia la actualizacion de precio de variante ${id}`);

  const precio = await preciosVariantesRepository.updatePrecioVariante(Number(id), {
    precio: dto.precio == null ? dto.precio : Number(dto.precio),
    cantidadMinima:
      dto.cantidadMinima == null ? dto.cantidadMinima : Number(dto.cantidadMinima),
    listaPrecioId:
      dto.listaPrecioId == null ? dto.listaPrecioId : Number(dto.listaPrecioId),
    varianteId: dto.varianteId == null ? dto.varianteId : Number(dto.varianteId),
  });

  logger.info(`Precio de variante ${id} actualizado correctamente`);

  return precio;
}

async function eliminarPrecioVariante(id) {
  logger.info(`Se inicia la eliminacion de precio de variante ${id}`);

  const precio = await preciosVariantesRepository.deletePrecioVariante(Number(id));

  logger.info(`Precio de variante ${id} eliminado correctamente`);

  return precio;
}

module.exports = {
  actualizarPrecioVariante,
  eliminarPrecioVariante,
  guardarPrecioPorProducto,
  guardarPrecioVariante,
  listarPreciosVariantes,
};
