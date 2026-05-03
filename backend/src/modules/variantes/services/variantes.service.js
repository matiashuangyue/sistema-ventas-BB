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

  const producto = await variantesRepository.findActiveProductoById(productoId);
  if (!producto) {
    logger.warn(`Creacion de variante rechazada: producto ${productoId} no encontrado`);
    throw new AppError("Producto no encontrado", 404);
  }

  const varianteExistente = await variantesRepository.findByNombreAndProducto(
    dto.nombre.trim(),
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
    nombre: dto.nombre.trim(),
    stock: dto.stock ?? 0,
    stockMinimo: dto.stockMinimo ?? 0,
    productoId,
    activo: true,
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

  const varianteId = Number(id);
  const productoId = dto.productoId ? Number(dto.productoId) : undefined;
  const nombre = dto.nombre?.trim();

  if (!varianteId || Number.isNaN(varianteId)) {
    throw new AppError("Variante invalida");
  }

  if (!nombre) {
    throw new AppError("El nombre es obligatorio");
  }

  const varianteActual = await variantesRepository.findById(varianteId);
  if (!varianteActual) {
    throw new AppError("Variante no encontrada", 404);
  }

  if (productoId) {
    const producto = await variantesRepository.findActiveProductoById(productoId);
    if (!producto) {
      throw new AppError("Producto no encontrado", 404);
    }
  }

  const productoDestinoId = productoId || varianteActual.productoId;
  const duplicada = await variantesRepository.findByNombreAndProductoExceptId(
    nombre,
    productoDestinoId,
    varianteId,
  );

  if (duplicada) {
    throw new AppError("Ya existe una variante activa con ese nombre para este producto");
  }

  const variante = await variantesRepository.updateVariante(varianteId, {
    nombre,
    stockMinimo: dto.stockMinimo != null ? Number(dto.stockMinimo) : undefined,
    productoId,
  });

  logger.info(`Variante ${id} actualizada correctamente`);

  return variante;
}

async function eliminarVariante(id) {
  const varianteId = Number(id);

  logger.info(`Se inicia el borrado logico de variante ${id}`);

  if (!varianteId || Number.isNaN(varianteId)) {
    throw new AppError("Variante invalida");
  }

  const varianteActual = await variantesRepository.findById(varianteId);
  if (!varianteActual) {
    throw new AppError("Variante no encontrada", 404);
  }

  const variante = await variantesRepository.softDeleteVariante(varianteId);

  logger.info(`Variante ${varianteId} eliminada logicamente`);

  return variante;
}

module.exports = {
  actualizarStock,
  actualizarVariante,
  crearVariante,
  eliminarVariante,
  listarVariantes,
};
