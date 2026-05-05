const AppError = require("../../../shared/errors/app-error");
const logger = require("../../../shared/logger/logger");
const cobranzasRepository = require("../repositories/cobranzas.repository");

const FORMAS_COBRO_VALIDAS = new Set([
  "EFECTIVO",
  "TRANSFERENCIA",
  "TARJETA",
  "OTRO",
]);

function redondearMonto(valor) {
  return Math.round(Number(valor) * 100) / 100;
}

function normalizarFormaPago(formaPago) {
  const valor = String(formaPago || "EFECTIVO").trim().toUpperCase();

  if (!FORMAS_COBRO_VALIDAS.has(valor)) {
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

function mapResumenCliente(cliente) {
  const saldoPendiente = redondearMonto(
    cliente.ventas.reduce((acc, venta) => acc + venta.saldoPendiente, 0),
  );
  const totalVendido = redondearMonto(
    cliente.ventas.reduce((acc, venta) => acc + venta.total, 0),
  );
  const totalCobrado = redondearMonto(
    cliente.ventas.reduce((acc, venta) => acc + venta.montoPagado, 0),
  );
  const ventasPendientes = cliente.ventas.filter(
    (venta) => venta.saldoPendiente > 0,
  );

  return {
    id: cliente.id,
    nombre: cliente.nombre,
    telefono: cliente.telefono,
    localidad: cliente.localidad,
    cuit: cliente.cuit,
    saldoPendiente,
    totalVendido,
    totalCobrado,
    cantidadVentasPendientes: ventasPendientes.length,
    ultimaVenta: cliente.ventas[0]?.fecha || null,
  };
}

function ordenarMovimientos(movimientos) {
  return movimientos.sort((a, b) => {
    const fechaA = new Date(a.fecha).getTime();
    const fechaB = new Date(b.fecha).getTime();

    if (fechaA !== fechaB) {
      return fechaA - fechaB;
    }

    if (a.ventaId !== b.ventaId) {
      return (a.ventaId || 0) - (b.ventaId || 0);
    }

    if (a.tipo !== b.tipo) {
      return a.tipo === "DEBITO" ? -1 : 1;
    }

    return a.id.localeCompare(b.id);
  });
}

function construirMovimientos(ventas) {
  const movimientos = [];

  for (const venta of ventas) {
    movimientos.push({
      id: `venta-${venta.id}`,
      tipo: "DEBITO",
      fecha: venta.fecha,
      concepto: `Venta #${venta.id}`,
      monto: venta.total,
      ventaId: venta.id,
      cobroId: null,
      formaPago: venta.formaPago,
    });

    for (const cobro of venta.cobros) {
      movimientos.push({
        id: `cobro-${cobro.id}`,
        tipo: "CREDITO",
        fecha: cobro.fecha,
        concepto: `Cobro venta #${venta.id}`,
        monto: cobro.monto,
        ventaId: venta.id,
        cobroId: cobro.id,
        formaPago: cobro.formaPago,
        observaciones: cobro.observaciones,
      });
    }
  }

  let saldo = 0;

  return ordenarMovimientos(movimientos).map((movimiento) => {
    saldo =
      movimiento.tipo === "DEBITO"
        ? saldo + movimiento.monto
        : saldo - movimiento.monto;

    return {
      ...movimiento,
      saldo: redondearMonto(saldo),
    };
  });
}

function construirVentasPendientes(ventas) {
  return ventas
    .filter((venta) => venta.saldoPendiente > 0)
    .map((venta) => ({
      id: venta.id,
      fecha: venta.fecha,
      total: venta.total,
      montoPagado: venta.montoPagado,
      saldoPendiente: venta.saldoPendiente,
      estadoPago: venta.estadoPago,
      formaPago: venta.formaPago,
    }))
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
}

function calcularTotalesResumen(clientes) {
  const totales = clientes.reduce(
    (acc, cliente) => ({
      saldoPendiente: acc.saldoPendiente + cliente.saldoPendiente,
      clientesConSaldo:
        acc.clientesConSaldo + (cliente.saldoPendiente > 0 ? 1 : 0),
      ventasPendientes:
        acc.ventasPendientes + cliente.cantidadVentasPendientes,
    }),
    { saldoPendiente: 0, clientesConSaldo: 0, ventasPendientes: 0 },
  );

  return {
    ...totales,
    saldoPendiente: redondearMonto(totales.saldoPendiente),
  };
}

async function listarResumen(filtros = {}) {
  logger.info("Se inicia la consulta de resumen de cobranzas", {
    cliente: filtros.cliente || null,
  });

  const page = normalizarEntero(filtros.page, 1, { min: 1, max: 100000 });
  const limit = normalizarEntero(filtros.limit, 10, { min: 1, max: 100 });
  const clientes = await cobranzasRepository.findClientesConCuenta(
    filtros.cliente,
  );

  const resumen = clientes
    .map(mapResumenCliente)
    .filter(
      (cliente) =>
        cliente.saldoPendiente > 0 ||
        cliente.totalVendido > 0 ||
        Boolean(filtros.cliente),
    )
    .sort((a, b) => {
      if (a.saldoPendiente !== b.saldoPendiente) {
        return b.saldoPendiente - a.saldoPendiente;
      }

      return a.nombre.localeCompare(b.nombre);
    });

  const total = resumen.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const paginaActual = Math.min(page, totalPages);
  const inicio = (paginaActual - 1) * limit;
  const items = resumen.slice(inicio, inicio + limit);

  logger.info(
    `Resumen de cobranzas finalizado con ${items.length} de ${total} clientes`,
  );

  return {
    items,
    page: paginaActual,
    limit,
    total,
    totalPages,
    totales: calcularTotalesResumen(resumen),
  };
}

async function obtenerCuentaCorriente(clienteId) {
  const id = Number(clienteId);

  logger.info(`Se inicia la consulta de cuenta corriente del cliente ${id}`);

  if (!Number.isFinite(id)) {
    throw new AppError("ID de cliente invalido");
  }

  const cliente = await cobranzasRepository.findClienteConCuenta(id);

  if (!cliente) {
    logger.warn(`Cuenta corriente rechazada: cliente ${id} no encontrado`);
    throw new AppError("Cliente no encontrado", 404);
  }

  const movimientos = construirMovimientos(cliente.ventas);
  const saldoPendiente = redondearMonto(
    cliente.ventas.reduce((acc, venta) => acc + venta.saldoPendiente, 0),
  );
  const totalVendido = redondearMonto(
    cliente.ventas.reduce((acc, venta) => acc + venta.total, 0),
  );
  const totalCobrado = redondearMonto(
    cliente.ventas.reduce((acc, venta) => acc + venta.montoPagado, 0),
  );

  return {
    cliente: {
      id: cliente.id,
      nombre: cliente.nombre,
      telefono: cliente.telefono,
      localidad: cliente.localidad,
      cuit: cliente.cuit,
      email: cliente.email,
    },
    resumen: {
      saldoPendiente,
      totalVendido,
      totalCobrado,
      ventasPendientes: cliente.ventas.filter(
        (venta) => venta.saldoPendiente > 0,
      ).length,
    },
    ventasPendientes: construirVentasPendientes(cliente.ventas),
    movimientos,
  };
}

async function registrarCobro(dto) {
  logger.info(`Se inicia el registro de cobro para venta ${dto.ventaId}`);

  if (!dto.ventaId || !Number.isFinite(dto.ventaId)) {
    throw new AppError("La venta es obligatoria");
  }

  if (dto.monto == null || !Number.isFinite(dto.monto)) {
    throw new AppError("El monto es obligatorio");
  }

  const monto = redondearMonto(dto.monto);

  if (monto <= 0) {
    throw new AppError("El monto debe ser mayor a 0");
  }

  const formaPago = normalizarFormaPago(dto.formaPago);

  const clienteId = await cobranzasRepository.transaction(async (tx) => {
    const venta = await cobranzasRepository.findVentaParaCobro(tx, dto.ventaId);

    if (!venta) {
      throw new AppError("Venta no encontrada", 404);
    }

    if (!venta.clienteId) {
      throw new AppError("La venta no tiene cliente asociado");
    }

    if (venta.saldoPendiente <= 0) {
      throw new AppError("La venta ya esta pagada");
    }

    if (monto > venta.saldoPendiente) {
      throw new AppError("El cobro supera el saldo pendiente");
    }

    const nuevoMontoPagado = redondearMonto(venta.montoPagado + monto);
    const nuevoSaldo = redondearMonto(venta.total - nuevoMontoPagado);

    await cobranzasRepository.createCobro(tx, {
      clienteId: venta.clienteId,
      ventaId: venta.id,
      monto,
      formaPago,
      observaciones: dto.observaciones || null,
    });

    await cobranzasRepository.updateVentaPago(tx, venta.id, {
      montoPagado: nuevoMontoPagado,
      saldoPendiente: nuevoSaldo,
      estadoPago: calcularEstadoPago(venta.total, nuevoMontoPagado),
    });

    return venta.clienteId;
  });

  logger.info(`Cobro registrado correctamente para cliente ${clienteId}`);

  return obtenerCuentaCorriente(clienteId);
}

module.exports = {
  listarResumen,
  obtenerCuentaCorriente,
  registrarCobro,
};
