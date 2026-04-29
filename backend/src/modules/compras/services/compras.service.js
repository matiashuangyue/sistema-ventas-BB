const AppError = require("../../../shared/errors/app-error");
const logger = require("../../../shared/logger/logger");
const comprasRepository = require("../repositories/compras.repository");

async function crearCompra(dto) {
  logger.info(`Se inicia la creacion de compra con ${dto.items.length} items`);

  if (!Array.isArray(dto.items) || dto.items.length === 0) {
    logger.warn("Creacion de compra rechazada: no se recibieron items");
    throw new AppError("La compra debe incluir al menos un item");
  }

  const compra = await comprasRepository.transaction(async (tx) => {
    let total = 0;
    const items = [];

    for (const item of dto.items) {
      const varianteId = Number(item.varianteId);
      const cantidad = Number(item.cantidad);
      const costoUnitario = Number(item.costoUnitario);

      if (!varianteId || !cantidad || item.costoUnitario == null) {
        logger.warn("Creacion de compra rechazada: item incompleto", {
          varianteId: item.varianteId,
          cantidad: item.cantidad,
          tieneCostoUnitario: item.costoUnitario != null,
        });
        throw new AppError("Hay items incompletos en la compra");
      }

      if (cantidad <= 0) {
        logger.warn(
          `Creacion de compra rechazada: cantidad invalida ${cantidad} para variante ${varianteId}`,
        );
        throw new AppError("La cantidad debe ser mayor a 0");
      }

      if (costoUnitario < 0) {
        logger.warn(
          `Creacion de compra rechazada: costo unitario negativo para variante ${varianteId}`,
        );
        throw new AppError("El costo unitario no puede ser negativo");
      }

      const variante = await comprasRepository.findVariante(tx, varianteId);

      if (!variante) {
        logger.warn(`Creacion de compra rechazada: variante ${varianteId} no existe`);
        throw new AppError(`La variante con ID ${varianteId} no existe`);
      }

      total += cantidad * costoUnitario;
      items.push({ varianteId, cantidad, costoUnitario });
    }

    const nuevaCompra = await comprasRepository.createCompra(tx, {
      proveedor: dto.proveedor,
      total,
      observaciones: dto.observaciones,
    });

    for (const item of items) {
      const subtotal = item.cantidad * item.costoUnitario;

      await comprasRepository.createCompraDetalle(tx, {
        compraId: nuevaCompra.id,
        varianteId: item.varianteId,
        cantidad: item.cantidad,
        costoUnitario: item.costoUnitario,
        subtotal,
      });

      await comprasRepository.updateStockVariante(tx, item.varianteId, {
        stock: {
          increment: item.cantidad,
        },
      });
    }

    return comprasRepository.findCompraById(tx, nuevaCompra.id);
  });

  logger.info(`Compra creada correctamente con id ${compra.id} y total ${compra.total}`);

  return compra;
}

async function listarCompras() {
  logger.info("Se inicia el listado de compras");

  const compras = await comprasRepository.findCompras();

  logger.info(`Listado de compras finalizado con ${compras.length} registros`);

  return compras;
}

module.exports = {
  crearCompra,
  listarCompras,
};
