const AppError = require("../../../shared/errors/app-error");
const logger = require("../../../shared/logger/logger");
const ventasRepository = require("../repositories/ventas.repository");

const FORMAS_PAGO_VALIDAS = new Set([
  "EFECTIVO",
  "TRANSFERENCIA",
  "TARJETA",
  "CUENTA_CORRIENTE",
  "OTRO",
]);

function redondearMonto(valor) {
  return Math.round(Number(valor) * 100) / 100;
}

function normalizarFormaPago(formaPago) {
  const valor = String(formaPago || "EFECTIVO").trim().toUpperCase();

  if (!FORMAS_PAGO_VALIDAS.has(valor)) {
    throw new AppError("Forma de pago invalida");
  }

  return valor;
}

function calcularEstadoPago(total, montoPagado) {
  if (montoPagado <= 0) {
    return "PENDIENTE";
  }

  if (montoPagado < total) {
    return "PARCIAL";
  }

  return "PAGADA";
}

function normalizarEntero(valor, fallback, { min = 1, max = 100 } = {}) {
  const numero = Number(valor);

  if (!Number.isInteger(numero)) return fallback;

  return Math.min(Math.max(numero, min), max);
}

function calcularPagoInicial(dto, total, formaPago) {
  const montoBase =
    dto.montoPagado == null
      ? formaPago === "CUENTA_CORRIENTE"
        ? 0
        : total
      : dto.montoPagado;

  if (!Number.isFinite(montoBase)) {
    throw new AppError("Monto pagado invalido");
  }

  const montoPagado = redondearMonto(montoBase);

  if (montoPagado < 0) {
    throw new AppError("El monto pagado no puede ser negativo");
  }

  if (formaPago === "CUENTA_CORRIENTE" && montoPagado > 0) {
    throw new AppError(
      "La forma cuenta corriente no puede registrar monto pagado",
    );
  }

  if (montoPagado > total) {
    throw new AppError("El monto pagado no puede superar el total");
  }

  if (total - montoPagado > 0 && !dto.clienteId) {
    throw new AppError(
      "Para dejar saldo pendiente tenes que seleccionar un cliente",
    );
  }

  return montoPagado;
}

function calcularPagoCorregido({ montoPagado }, total, formaPago, clienteId) {
  const montoBase = montoPagado == null ? 0 : montoPagado;

  if (!Number.isFinite(montoBase)) {
    throw new AppError("Monto pagado invalido");
  }

  const monto = redondearMonto(montoBase);

  if (monto < 0) {
    throw new AppError("El monto pagado no puede ser negativo");
  }

  if (formaPago === "CUENTA_CORRIENTE" && monto > 0) {
    throw new AppError(
      "La forma cuenta corriente no puede registrar monto pagado",
    );
  }

  if (monto > total) {
    throw new AppError("El monto pagado no puede superar el total");
  }

  if (total - monto > 0 && !clienteId) {
    throw new AppError(
      "Para dejar saldo pendiente tenes que seleccionar un cliente",
    );
  }

  return monto;
}

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

async function crearVenta(dto) {
  logger.info(
    `Se inicia la creacion de venta para cliente ${dto.clienteId || "consumidor final"} con ${dto.items.length} items`,
  );

  if (!Array.isArray(dto.items) || dto.items.length === 0) {
    logger.warn("Creacion de venta rechazada: no se recibieron items");
    throw new AppError("La venta debe incluir items");
  }

  if (!Number.isFinite(dto.descuento) || dto.descuento < 0) {
    logger.warn("Creacion de venta rechazada: descuento invalido", {
      descuento: dto.descuento,
    });
    throw new AppError("El descuento no puede ser negativo");
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

        const precioEditado = item.precioEditado;
        const usarPrecioEditado =
          precioEditado != null &&
          Number.isFinite(precioEditado) &&
          precioEditado > 0;

        if (usarPrecioEditado) {
          logger.info(
            `Variante ${varianteId}: precio editado $${precioEditado} (precio de lista: $${preciosDisponibles[0].precio})`,
          );
        }

        const precioUnitario = usarPrecioEditado ? precioEditado : preciosDisponibles[0].precio;
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

      const total = redondearMonto(subtotal - dto.descuento);
      const formaPago = normalizarFormaPago(dto.formaPago);
      const montoPagado = calcularPagoInicial(dto, total, formaPago);
      const saldoPendiente = redondearMonto(total - montoPagado);
      const estadoPago = calcularEstadoPago(total, montoPagado);

      await ventasRepository.updateVenta(tx, nuevaVenta.id, {
        subtotal,
        total,
        formaPago,
        montoPagado,
        saldoPendiente,
        estadoPago,
        observacionesPago: dto.observacionesPago || null,
      });

      if (dto.clienteId && montoPagado > 0) {
        await ventasRepository.createCobro(tx, {
          clienteId: dto.clienteId,
          ventaId: nuevaVenta.id,
          monto: montoPagado,
          formaPago,
          observaciones: dto.observacionesPago || null,
        });
      }

      return ventasRepository.findVentaByIdInTransaction(tx, nuevaVenta.id);
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
        mode: "insensitive",
      },
    };
  }

  return where;
}

function usaPaginacionHistorial(dto = {}) {
  return dto.page != null || dto.limit != null;
}

function mapHistorialVenta(venta) {
  return {
    id: venta.id,
    fecha: venta.fecha,
    cliente: venta.cliente ? venta.cliente.nombre : "Consumidor Final",
    subtotal: venta.subtotal,
    descuento: venta.descuento,
    total: venta.total,
    formaPago: venta.formaPago,
    montoPagado: venta.montoPagado,
    saldoPendiente: venta.saldoPendiente,
    estadoPago: venta.estadoPago,
    cantidadItems: venta.detalles.length,
    unidadesTotales: venta.detalles.reduce(
      (acc, item) => acc + item.cantidad,
      0,
    ),
  };
}

async function obtenerHistorial(dto) {
  logger.info("Se inicia la consulta de historial de ventas", {
    desde: dto.desde || null,
    hasta: dto.hasta || null,
    cliente: dto.cliente || null,
  });

  const where = crearWhereHistorial(dto);

  if (usaPaginacionHistorial(dto)) {
    const page = normalizarEntero(dto.page, 1, { min: 1, max: 100000 });
    const limit = normalizarEntero(dto.limit, 10, { min: 1, max: 100 });
    const skip = (page - 1) * limit;
    const [total, ventas] = await ventasRepository.findVentasHistorialPage({
      where,
      skip,
      take: limit,
    });
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const paginaActual = Math.min(page, totalPages);
    let ventasPagina = ventas;
    let totalFinal = total;

    if (page !== paginaActual) {
      const [totalRecalculado, ventasRecalculadas] =
        await ventasRepository.findVentasHistorialPage({
          where,
          skip: (paginaActual - 1) * limit,
          take: limit,
        });
      ventasPagina = ventasRecalculadas;
      totalFinal = totalRecalculado;
    }

    const historial = ventasPagina.map(mapHistorialVenta);

    logger.info(
      `Historial de ventas finalizado con ${historial.length} de ${totalFinal} registros`,
    );

    return {
      items: historial,
      page: paginaActual,
      limit,
      total: totalFinal,
      totalPages,
    };
  }

  const ventas = await ventasRepository.findVentasHistorial(
    where,
  );

  const historial = ventas.map(mapHistorialVenta);

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

async function actualizarPagoVenta(id, dto) {
  const ventaId = Number(id);

  logger.info(`Se inicia la actualizacion de pago de venta ${id}`);

  if (Number.isNaN(ventaId)) {
    logger.warn(`Actualizacion de pago rechazada: id invalido ${id}`);
    throw new AppError("ID de venta invalido");
  }

  const ventaActualizada = await ventasRepository.transaction(async (tx) => {
    const venta = await ventasRepository.findVentaByIdInTransaction(tx, ventaId);

    if (!venta) {
      throw new AppError("Venta no encontrada", 404);
    }

    const formaPago = normalizarFormaPago(dto.formaPago || venta.formaPago);
    const montoPagado = calcularPagoCorregido(
      {
        montoPagado:
          dto.montoPagado == null ? venta.montoPagado : dto.montoPagado,
      },
      venta.total,
      formaPago,
      venta.clienteId,
    );
    const saldoPendiente = redondearMonto(venta.total - montoPagado);
    const estadoPago = calcularEstadoPago(venta.total, montoPagado);
    const observacionesPago = dto.observacionesPago || null;

    await ventasRepository.deleteCobrosByVentaId(tx, venta.id);

    if (venta.clienteId && montoPagado > 0) {
      await ventasRepository.createCobro(tx, {
        clienteId: venta.clienteId,
        ventaId: venta.id,
        monto: montoPagado,
        formaPago,
        observaciones: observacionesPago || "Pago ajustado desde historial",
      });
    }

    return ventasRepository.updateVenta(tx, venta.id, {
      formaPago,
      montoPagado,
      saldoPendiente,
      estadoPago,
      observacionesPago,
    });
  }, { timeout: 30000 });

  logger.info(`Pago de venta ${ventaId} actualizado correctamente`);

  return ventaActualizada;
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

    await ventasRepository.updateStockVariantesByDeltas(
      tx,
      agruparCantidadesPorVariante(venta.detalles),
    );

    await ventasRepository.deleteCobrosByVentaId(tx, venta.id);
    await ventasRepository.deleteVentaDetalles(tx, venta.id);
    await ventasRepository.deleteVenta(tx, venta.id);

    return venta.id;
  }, { timeout: 30000 });

  if (resultado === null) {
    logger.warn(`Eliminacion de venta rechazada: venta ${ventaId} no encontrada`);
    throw new AppError("Venta no encontrada", 404);
  }

  logger.info(`Venta ${ventaId} eliminada correctamente`);

  return { ok: true };
}

module.exports = {
  actualizarPagoVenta,
  crearVenta,
  eliminarVenta,
  listarVentas,
  obtenerHistorial,
  obtenerVentaPorId,
};
