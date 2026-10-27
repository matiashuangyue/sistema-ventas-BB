const { createHash } = require("node:crypto");
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
  if (montoPagado >= total) {
    return "PAGADA";
  }

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

function conVersionEdicion(venta) {
  // Solo datos de la venta: cambios de catalogo o stock no invalidan el borrador.
  const { id, clienteId, fecha, subtotal, descuento, total, montoPagado,
    saldoPendiente, estadoPago, formaPago, observacionesPago } = venta;
  const versionEdicion = createHash("sha256").update(JSON.stringify({
    id, clienteId, fecha, subtotal, descuento, total, montoPagado,
    saldoPendiente, estadoPago, formaPago, observacionesPago,
    detalles: [...venta.detalles].sort((a, b) => a.id - b.id).map((detalle) => ({
      id: detalle.id,
      varianteId: detalle.varianteId,
      cantidad: detalle.cantidad,
      precioUnitario: detalle.precioUnitario,
      subtotal: detalle.subtotal,
      descuentoItem: detalle.descuentoItem,
    })),
    cobros: [...venta.cobros].sort((a, b) => a.id - b.id).map((cobro) => ({
      id: cobro.id,
      monto: cobro.monto,
      fecha: cobro.fecha,
      formaPago: cobro.formaPago,
      observaciones: cobro.observaciones,
    })),
  })).digest("hex");
  return { ...venta, versionEdicion };
}

function esIdValido(valor) {
  return Number.isInteger(valor) && valor > 0 && valor <= 2147483647;
}

function esMontoValido(valor) {
  return typeof valor === "number" && Number.isFinite(valor) && valor >= 0 &&
    Number.isSafeInteger(Math.round(valor * 100));
}

async function actualizarVenta(id, dto) {
  const ventaId = Number(id);
  if (!esIdValido(ventaId)) throw new AppError("ID de venta invalido");
  if (!Array.isArray(dto.items) || dto.items.length === 0) {
    throw new AppError("La venta debe incluir al menos un producto");
  }
  if (typeof dto.version !== "string" || !dto.version) {
    throw new AppError("Volve a abrir la venta antes de editarla", 409);
  }
  if (!esMontoValido(dto.descuento)) throw new AppError("Descuento invalido");

  for (const item of dto.items) {
    if (!item || !esIdValido(item.varianteId) || !esIdValido(item.cantidad) ||
        (item.detalleId != null && !esIdValido(item.detalleId))) {
      throw new AppError("Cada producto debe tener una cantidad entera mayor a 0");
    }
    if (!esMontoValido(item.precioUnitario)) {
      throw new AppError("El precio unitario debe ser un numero mayor o igual a 0");
    }
  }

  try {
    const resultado = await ventasRepository.transaction(async (tx) => {
      await ventasRepository.lockVenta(tx, ventaId);
      const venta = await ventasRepository.findVentaByIdInTransaction(tx, ventaId);
      if (!venta) throw new AppError("Venta no encontrada", 404);
      if (dto.version !== conVersionEdicion(venta).versionEdicion) {
        throw new AppError("La venta cambio mientras la editabas. Volve a abrirla para ver los datos actuales", 409);
      }

      const detallesOriginales = new Map(venta.detalles.map((item) => [item.id, item]));
      const idsConservados = new Set();
      const items = dto.items.map((item) => {
        if (item.detalleId != null) {
          const original = detallesOriginales.get(item.detalleId);
          if (!original || original.varianteId !== item.varianteId || idsConservados.has(item.detalleId)) {
            throw new AppError("El detalle no corresponde a la venta o esta repetido");
          }
          idsConservados.add(item.detalleId);
        }
        const subtotal = redondearMonto(item.precioUnitario * item.cantidad);
        if (!esMontoValido(subtotal)) throw new AppError("Importe de producto invalido");
        return { ...item, subtotal };
      });
      const subtotal = redondearMonto(items.reduce((suma, item) => suma + item.subtotal, 0));
      if (!esMontoValido(subtotal)) throw new AppError("Subtotal invalido");
      const descuento = redondearMonto(dto.descuento);
      if (descuento > subtotal) throw new AppError("El descuento no puede ser mayor al subtotal");
      const total = redondearMonto(subtotal - descuento);
      const saldoPendiente = redondearMonto(total - venta.montoPagado);
      if (saldoPendiente < 0) {
        throw new AppError("El nuevo total es menor que lo ya cobrado. Revisa los pagos registrados antes de reducir la venta");
      }
      if (saldoPendiente > 0 && !venta.clienteId) {
        throw new AppError("La venta no tiene cliente asociado y no puede quedar con saldo pendiente");
      }

      const cantidadesAnteriores = new Map(agruparCantidadesPorVariante(venta.detalles)
        .map(({ varianteId, cantidad }) => [varianteId, cantidad]));
      const cantidadesNuevas = new Map(agruparCantidadesPorVariante(items)
        .map(({ varianteId, cantidad }) => [varianteId, cantidad]));
      const variantes = [...new Set([...cantidadesAnteriores.keys(), ...cantidadesNuevas.keys()])]
        .sort((a, b) => a - b);

      for (const varianteId of variantes) {
        const anterior = cantidadesAnteriores.get(varianteId) || 0;
        const cantidad = cantidadesNuevas.get(varianteId) || 0;
        if (cantidad > 2147483647) throw new AppError("Cantidad de producto invalida");
        const variante = await ventasRepository.findVarianteForEdit(tx, varianteId);
        if (!variante) throw new AppError("Variante no encontrada");
        if (cantidad > anterior && (!variante.activo || !variante.producto?.activo)) {
          throw new AppError(`El producto ${variante.nombre} ya no esta activo`);
        }
        const delta = anterior - cantidad;
        if (delta === 0) continue;
        const actualizado = await ventasRepository.adjustStockForEdit(tx, varianteId, delta);
        if (actualizado.count !== 1) {
          throw new AppError(`Stock insuficiente para ${variante.nombre}`);
        }
      }

      await ventasRepository.deleteVentaDetallesExcept(tx, ventaId, [...idsConservados]);
      for (const item of items) {
        const data = {
          varianteId: item.varianteId,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          subtotal: item.subtotal,
        };
        if (item.detalleId != null) {
          await ventasRepository.updateVentaDetalle(tx, item.detalleId, data);
        } else {
          await ventasRepository.createVentaDetalle(tx, { ...data, ventaId });
        }
      }

      // Los cobros (incluidas sus fechas) se conservan: solo cambia la deuda.
      return ventasRepository.updateVenta(tx, ventaId, {
        subtotal, descuento, total, saldoPendiente,
        estadoPago: calcularEstadoPago(total, venta.montoPagado),
      });
    }, { timeout: 30000 });

    logger.info(`Venta ${ventaId} editada correctamente`);
    return conVersionEdicion(resultado);
  } catch (error) {
    if (error.code === "P2034" || error.code === "40P01") {
      throw new AppError("La venta o el stock cambiaron durante el guardado. Volve a abrir la venta e intenta nuevamente", 409);
    }
    throw error;
  }
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

        const stockActualizado = await ventasRepository.adjustStockForEdit(tx, varianteId, -cantidad);
        if (stockActualizado.count !== 1) {
          throw new AppError(`Stock insuficiente para ${variante.nombre}`);
        }
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

  return conVersionEdicion(venta);
}

async function actualizarPagoVenta(id, dto) {
  const ventaId = Number(id);

  logger.info(`Se inicia la actualizacion de pago de venta ${id}`);

  if (Number.isNaN(ventaId)) {
    logger.warn(`Actualizacion de pago rechazada: id invalido ${id}`);
    throw new AppError("ID de venta invalido");
  }

  const ventaActualizada = await ventasRepository.transaction(async (tx) => {
    await ventasRepository.lockVenta(tx, ventaId);
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

  return conVersionEdicion(ventaActualizada);
}

async function eliminarVenta(id) {
  const ventaId = Number(id);

  logger.info(`Se inicia la eliminacion de venta ${id}`);

  if (Number.isNaN(ventaId)) {
    logger.warn(`Eliminacion de venta rechazada: id invalido ${id}`);
    throw new AppError("ID de venta invalido");
  }

  const resultado = await ventasRepository.transaction(async (tx) => {
    await ventasRepository.lockVenta(tx, ventaId);
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
  actualizarVenta,
  actualizarPagoVenta,
  crearVenta,
  eliminarVenta,
  listarVentas,
  obtenerHistorial,
  obtenerVentaPorId,
};
