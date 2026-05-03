const AppError = require("../../../shared/errors/app-error");
const logger = require("../../../shared/logger/logger");
const productosRepository = require("../repositories/productos.repository");

async function crearProducto(dto) {
  logger.info(`Se inicia la creacion del producto ${dto.nombre || "sin nombre"}`);

  const nombre = dto.nombre?.trim();
  const categoria = dto.categoria?.trim() || null;

  if (!nombre) {
    logger.warn("Creacion de producto rechazada: nombre obligatorio faltante");
    throw new AppError("El nombre es obligatorio");
  }

  const existente = await productosRepository.findActiveByName(nombre);
  if (existente) {
    logger.warn(`Creacion de producto rechazada: producto activo existente ${nombre}`);
    throw new AppError(
      "Ya existe un producto activo con ese nombre. Si queres agregar una variante, usa el producto existente.",
    );
  }

  const producto = await productosRepository.createProducto({
    nombre,
    categoria,
    activo: true,
  });

  logger.info(`Producto creado correctamente con id ${producto.id}`);

  return producto;
}

async function listarProductos() {
  logger.info("Se inicia el listado de productos activos");

  const productos = await productosRepository.findActiveWithVariantCount();
  const productosNormalizados = productos.map((producto) => ({
    id: producto.id,
    nombre: producto.nombre,
    categoria: producto.categoria,
    activo: producto.activo,
    createdAt: producto.createdAt,
    variantesActivas: producto._count.variantes,
  }));

  logger.info(
    `Listado de productos finalizado con ${productosNormalizados.length} registros`,
  );

  return productosNormalizados;
}

async function actualizarProducto(id, dto) {
  const productoId = Number(id);
  const nombre = dto.nombre?.trim();
  const categoria = dto.categoria?.trim() || null;

  logger.info(`Se inicia la actualizacion del producto ${id}`);

  if (!productoId || Number.isNaN(productoId)) {
    throw new AppError("Producto invalido");
  }

  if (!nombre) {
    throw new AppError("El nombre es obligatorio");
  }

  const productoActual = await productosRepository.findActiveById(productoId);
  if (!productoActual) {
    throw new AppError("Producto no encontrado", 404);
  }

  const existente = await productosRepository.findActiveByNameExceptId(
    nombre,
    productoId,
  );

  if (existente) {
    throw new AppError("Ya existe un producto activo con ese nombre");
  }

  const producto = await productosRepository.updateProducto(productoId, {
    nombre,
    categoria,
  });

  logger.info(`Producto ${productoId} actualizado correctamente`);

  return producto;
}

async function eliminarProducto(id) {
  const productoId = Number(id);

  logger.info(`Se inicia el borrado logico del producto ${id}`);

  if (!productoId || Number.isNaN(productoId)) {
    throw new AppError("Producto invalido");
  }

  const resultado = await productosRepository.transaction(async (tx) => {
    const productoActual = await productosRepository.findActiveById(productoId, tx);

    if (!productoActual) {
      throw new AppError("Producto no encontrado", 404);
    }

    const variantes = await productosRepository.softDeleteVariantesByProducto(
      productoId,
      tx,
    );
    const producto = await productosRepository.softDeleteProducto(productoId, tx);

    return {
      producto,
      variantesEliminadas: variantes.count,
    };
  });

  logger.info(
    `Producto ${productoId} eliminado logicamente junto a ${resultado.variantesEliminadas} variantes`,
  );

  return resultado;
}

module.exports = {
  actualizarProducto,
  crearProducto,
  eliminarProducto,
  listarProductos,
};
