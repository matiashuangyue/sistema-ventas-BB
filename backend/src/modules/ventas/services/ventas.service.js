const AppError = require("../../../shared/errors/app-error");
const logger = require("../../../shared/logger/logger");
const ventasRepository = require("../repositories/ventas.repository");

async function crearVenta(dto) {
  logger.info(
    `Se inicia la creacion de venta para cliente ${dto.clienteId || "consumidor final"} con ${dto.items.length} items`,
  );

  if (!Array.isArray(dto.items) || dto.items.length === 0) {
    logger.warn("Creacion de venta rechazada: no se recibieron items");
    throw new AppError("La venta debe incluir items");
  }

  const ventaFinal = await ventasRepository.transaction(
    async (tx) => {
      let subtotal = 0;

      const nuevaVenta = await ventasRepository.createVenta(tx, {
        clienteId: dto.clienteId,
        subtotal: 0,
        descuento: dto.descuento,
        total: 0,
      });

      for (const item of dto.items) {
        const varianteId = Number(item.varianteId);
        const cantidad = Number(item.cantidad);

        if (!varianteId || !cantidad) {
          logger.warn("Creacion de venta rechazada: item incompleto", {
            varianteId: item.varianteId,
            cantidad: item.cantidad,
          });
          throw new AppError("Hay items incompletos");
        }

        if (cantidad <= 0) {
          logger.warn(
            `Creacion de venta rechazada: cantidad invalida ${cantidad} para variante ${varianteId}`,
          );
          throw new AppError("La cantidad debe ser mayor a 0");
        }

        const variante = await ventasRepository.findVariante(tx, varianteId);

        if (!variante) {
          logger.warn(`Creacion de venta rechazada: variante ${varianteId} no encontrada`);
          throw new AppError("Variante no encontrada");
        }

        if (variante.stock < cantidad) {
          logger.warn(
            `Creacion de venta rechazada: stock insuficiente para variante ${varianteId}`,
            { stockDisponible: variante.stock, cantidadSolicitada: cantidad },
          );
          throw new AppError(`Stock insuficiente para ${variante.nombre}`);
        }

        const preciosDisponibles =
          await ventasRepository.findPreciosDisponibles(
            tx,
            varianteId,
            cantidad,
          );

        if (preciosDisponibles.length === 0) {
          logger.warn(
            `Creacion de venta rechazada: no hay precio configurado para variante ${varianteId}`,
          );
          throw new AppError(`No hay precio configurado para ${variante.nombre}`);
        }

        const precioAplicado = preciosDisponibles[0];
        const precioUnitario = precioAplicado.precio;
        const subtotalItem = precioUnitario * cantidad;

        subtotal += subtotalItem;

        await ventasRepository.createVentaDetalle(tx, {
          ventaId: nuevaVenta.id,
          varianteId,
          cantidad,
          precioUnitario,
          subtotal: subtotalItem,
        });

        await ventasRepository.updateStockVariante(tx, varianteId, {
          stock: {
            decrement: cantidad,
          },
        });
      }

      if (dto.descuento > subtotal) {
        logger.warn("Creacion de venta rechazada: descuento mayor al subtotal", {
          descuento: dto.descuento,
          subtotal,
        });
        throw new AppError("El descuento no puede ser mayor al subtotal");
      }

      return ventasRepository.updateVenta(tx, nuevaVenta.id, {
        subtotal,
        total: subtotal - dto.descuento,
      });
    },
    { timeout: 600000 },
  );

  logger.info(
    `Venta creada correctamente con id ${ventaFinal.id} y total ${ventaFinal.total}`,
  );

  return ventaFinal;
}

async function listarVentas() {
  logger.info("Se inicia el listado de ventas");

  const ventas = await ventasRepository.findVentas();

  logger.info(`Listado de ventas finalizado con ${ventas.length} registros`);

  return ventas;
}

function crearWhereHistorial(dto) {
  const where = {};

  if (dto.desde || dto.hasta) {
    where.fecha = {};

    if (dto.desde) {
      where.fecha.gte = new Date(`${dto.desde}T00:00:00.000Z`);
    }

    if (dto.hasta) {
      where.fecha.lte = new Date(`${dto.hasta}T23:59:59.999Z`);
    }
  }

  if (dto.cliente) {
    where.cliente = {
      nombre: {
        contains: dto.cliente,
      },
    };
  }

  return where;
}

async function obtenerHistorial(dto) {
  logger.info("Se inicia la consulta de historial de ventas", {
    desde: dto.desde || null,
    hasta: dto.hasta || null,
    cliente: dto.cliente || null,
  });

  const ventas = await ventasRepository.findVentasHistorial(
    crearWhereHistorial(dto),
  );

  const historial = ventas.map((venta) => ({
    id: venta.id,
    fecha: venta.fecha,
    cliente: venta.cliente ? venta.cliente.nombre : "Consumidor Final",
    subtotal: venta.subtotal,
    descuento: venta.descuento,
    total: venta.total,
    cantidadItems: venta.detalles.length,
    unidadesTotales: venta.detalles.reduce(
      (acc, item) => acc + item.cantidad,
      0,
    ),
  }));

  logger.info(`Historial de ventas finalizado con ${historial.length} registros`);

  return historial;
}

async function obtenerVentaPorId(id) {
  logger.info(`Se inicia la busqueda de venta ${id}`);

  const venta = await ventasRepository.findVentaById(Number(id));

  if (!venta) {
    logger.warn(`Busqueda de venta sin resultados para id ${id}`);
    throw new AppError("Venta no encontrada", 404);
  }

  logger.info(`Venta ${id} encontrada correctamente`);

  return venta;
}

async function eliminarVenta(id) {
  const ventaId = Number(id);

  logger.info(`Se inicia la eliminacion de venta ${id}`);

  if (Number.isNaN(ventaId)) {
    logger.warn(`Eliminacion de venta rechazada: id invalido ${id}`);
    throw new AppError("ID de venta invalido");
  }

  const resultado = await ventasRepository.transaction(async (tx) => {
    const venta = await ventasRepository.findVentaWithDetalles(tx, ventaId);

    if (!venta) {
      return null;
    }

    for (const detalle of venta.detalles) {
      await ventasRepository.updateStockVariante(tx, detalle.varianteId, {
        stock: {
          increment: detalle.cantidad,
        },
      });
    }

    await ventasRepository.deleteVentaDetalles(tx, venta.id);
    await ventasRepository.deleteVenta(tx, venta.id);

    return venta.id;
  });

  if (resultado === null) {
    logger.warn(`Eliminacion de venta rechazada: venta ${ventaId} no encontrada`);
    throw new AppError("Venta no encontrada", 404);
  }

  logger.info(`Venta ${ventaId} eliminada correctamente`);

  return { ok: true };
}

module.exports = {
  crearVenta,
  eliminarVenta,
  listarVentas,
  obtenerHistorial,
  obtenerVentaPorId,
};
