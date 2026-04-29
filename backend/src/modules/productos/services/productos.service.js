const AppError = require("../../../shared/errors/app-error");
const logger = require("../../../shared/logger/logger");
const productosRepository = require("../repositories/productos.repository");

async function crearProducto(dto) {
  logger.info(`Se inicia la creacion del producto ${dto.nombre || "sin nombre"}`);

  if (!dto.nombre) {
    logger.warn("Creacion de producto rechazada: nombre obligatorio faltante");
    throw new AppError("El nombre es obligatorio");
  }

  const existente = await productosRepository.findActiveByName(dto.nombre);
  if (existente) {
    logger.warn(`Creacion de producto rechazada: producto activo existente ${dto.nombre}`);
    throw new AppError(
      "Ya existe un producto activo con ese nombre. Si queres agregar una variante, usa el producto existente.",
    );
  }

  const producto = await productosRepository.createProducto({
    nombre: dto.nombre,
    categoria: dto.categoria,
    activo: true,
  });

  logger.info(`Producto creado correctamente con id ${producto.id}`);

  return producto;
}

async function listarProductos() {
  logger.info("Se inicia el listado de productos activos");

  const productos = await productosRepository.findActiveWithVariantes();

  logger.info(`Listado de productos finalizado con ${productos.length} registros`);

  return productos;
}

module.exports = {
  crearProducto,
  listarProductos,
};
