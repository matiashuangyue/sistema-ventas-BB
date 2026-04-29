const AppError = require("../../../shared/errors/app-error");
const logger = require("../../../shared/logger/logger");
const variantesRepository = require("../repositories/variantes.repository");

async function crearVariante(dto) {
  const productoId = Number(dto.productoId);

  logger.info(
    `Se inicia la creacion de variante ${dto.nombre || "sin nombre"} para producto ${dto.productoId || "sin producto"}`,
  );

  if (!dto.nombre || !dto.productoId) {
    logger.warn("Creacion de variante rechazada: nombre o productoId faltante");
    throw new AppError("Faltan datos: nombre y productoId son obligatorios");
  }

  const varianteExistente = await variantesRepository.findByNombreAndProducto(
    dto.nombre,
    productoId,
  );

  if (varianteExistente) {
    logger.warn(
      `Creacion de variante rechazada: variante existente ${dto.nombre} para producto ${productoId}`,
    );
    throw new AppError(
      "Ya existe una variante con ese nombre para este producto. Usa la existente o cambia el nombre.",
    );
  }

  const variante = await variantesRepository.createVariante({
    nombre: dto.nombre,
    stock: dto.stock ?? 0,
    stockMinimo: dto.stockMinimo ?? 0,
    productoId,
  });

  logger.info(`Variante creada correctamente con id ${variante.id}`);

  return variante;
}

async function listarVariantes() {
  logger.info("Se inicia el listado de variantes");

  const variantes = await variantesRepository.findManyWithRelations();

  logger.info(`Listado de variantes finalizado con ${variantes.length} registros`);

  return variantes;
}

async function actualizarStock(id, dto) {
  logger.info(`Se inicia la actualizacion de stock de variante ${id}`);

  if (dto.stock == null) {
    logger.warn(`Actualizacion de stock rechazada: stock faltante para variante ${id}`);
    throw new AppError("Stock invalido");
  }

  const varianteId = Number(id);
  const varianteActual = await variantesRepository.findById(varianteId);

  if (!varianteActual) {
    logger.warn(`Actualizacion de stock rechazada: variante ${varianteId} no encontrada`);
    throw new AppError("Variante no encontrada", 404);
  }

  const nuevoStock = Number(dto.stock);
  if (Number.isNaN(nuevoStock) || nuevoStock < 0) {
    logger.warn(
      `Actualizacion de stock rechazada: stock invalido ${dto.stock} para variante ${varianteId}`,
    );
    throw new AppError("El stock no puede quedar negativo");
  }

  const variante = await variantesRepository.updateVariante(varianteId, {
    stock: nuevoStock,
  });

  logger.info(
    `Stock actualizado correctamente para variante ${varianteId}. Nuevo stock: ${nuevoStock}`,
  );

  return variante;
}

async function actualizarVariante(id, dto) {
  logger.info(`Se inicia la actualizacion de variante ${id}`);

  const variante = await variantesRepository.updateVariante(Number(id), {
    nombre: dto.nombre,
    stockMinimo: dto.stockMinimo != null ? Number(dto.stockMinimo) : undefined,
    productoId: dto.productoId ? Number(dto.productoId) : undefined,
  });

  logger.info(`Variante ${id} actualizada correctamente`);

  return variante;
}

module.exports = {
  actualizarStock,
  actualizarVariante,
  crearVariante,
  listarVariantes,
};
