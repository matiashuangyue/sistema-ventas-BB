const AppError = require("../../../shared/errors/app-error");
const logger = require("../../../shared/logger/logger");
const comprasRepository = require("../repositories/compras.repository");

function agruparCantidadesPorVariante(items) {
  const cantidades = new Map();

  for (const item of items) {
    cantidades.set(
      item.varianteId,
      (cantidades.get(item.varianteId) || 0) + item.cantidad,
    );
  }

  return Array.from(cantidades.entries()).map(([varianteId, cantidad]) => ({
    varianteId,
    cantidad,
  }));
}

function normalizarItemsCompra(items) {
  return items.map((item) => {
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

    return {
      varianteId,
      cantidad,
      costoUnitario,
      subtotal: cantidad * costoUnitario,
    };
  });
}

async function crearCompra(dto) {
  logger.info(`Se inicia la creacion de compra con ${dto.items.length} items`);

  if (!Array.isArray(dto.items) || dto.items.length === 0) {
    logger.warn("Creacion de compra rechazada: no se recibieron items");
    throw new AppError("La compra debe incluir al menos un item");
  }

  const items = normalizarItemsCompra(dto.items);
  const total = items.reduce((acc, item) => acc + item.subtotal, 0);
  const varianteIds = [...new Set(items.map((item) => item.varianteId))];

  const compra = await comprasRepository.transaction(async (tx) => {
    const variantes = await comprasRepository.findVariantesByIds(tx, varianteIds);
    const variantesEncontradas = new Set(
      variantes.map((variante) => variante.id),
    );
    const variantesFaltantes = varianteIds.filter(
      (varianteId) => !variantesEncontradas.has(varianteId),
    );

    if (variantesFaltantes.length > 0) {
      logger.warn("Creacion de compra rechazada: variantes inexistentes o inactivas", {
        variantesFaltantes,
      });
      throw new AppError("Hay variantes inexistentes o inactivas en la compra");
    }

    const nuevaCompra = await comprasRepository.createCompra(tx, {
      proveedor: dto.proveedor,
      total,
      observaciones: dto.observaciones,
    });

    await comprasRepository.createManyCompraDetalles(
      tx,
      items.map((item) => ({
        compraId: nuevaCompra.id,
        varianteId: item.varianteId,
        cantidad: item.cantidad,
        costoUnitario: item.costoUnitario,
        subtotal: item.subtotal,
      })),
    );

    await comprasRepository.updateStockVariantesByDeltas(
      tx,
      agruparCantidadesPorVariante(items),
    );

    return comprasRepository.findCompraById(tx, nuevaCompra.id);
  }, { timeout: 30000 });

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
