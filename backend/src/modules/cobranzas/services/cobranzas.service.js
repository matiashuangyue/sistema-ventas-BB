const AppError = require("../../../shared/errors/app-error");
const logger = require("../../../shared/logger/logger");
const cobranzasRepository = require("../repositories/cobranzas.repository");

const ZONA_HORARIA_COBRANZAS = "America/Argentina/Buenos_Aires";

const FORMAS_COBRO_VALIDAS = new Set([
  "EFECTIVO",
  "TRANSFERENCIA",
  "TARJETA",
  "OTRO",
]);

function redondearMonto(valor) {
  return Math.round(Number(valor) * 100) / 100;
}

function obtenerRangoDia(fecha) {
  if (fecha === undefined) {
    const partes = new Intl.DateTimeFormat("en", {
      timeZone: ZONA_HORARIA_COBRANZAS,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const valores = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
    fecha = `${valores.year}-${valores.month}-${valores.day}`;
  }

  if (
    typeof fecha !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
    fecha.startsWith("0000-")
  ) {
    throw new AppError("La fecha debe ser una fecha valida con formato AAAA-MM-DD");
  }

  const fechaCalendario = new Date(`${fecha}T00:00:00Z`);
  if (
    !Number.isFinite(fechaCalendario.getTime()) ||
    fechaCalendario.toISOString().slice(0, 10) !== fecha
  ) {
    throw new AppError("La fecha debe ser una fecha valida con formato AAAA-MM-DD");
  }

  // La jornada se mide en Argentina (UTC-03), independientemente del servidor.
  const desde = new Date(`${fecha}T00:00:00-03:00`);
  const hasta = new Date(desde.getTime() + 24 * 60 * 60 * 1000);

  return { fecha, desde, hasta };
}

async function listarCobrosDelDia(fechaSolicitada) {
  const { fecha, desde, hasta } = obtenerRangoDia(fechaSolicitada);
  const items = await cobranzasRepository.findCobrosEntreFechas(desde, hasta);
  const porFormaPago = new Map();
  let totalCentavos = 0;

  for (const cobro of items) {
    const centavos = Math.round(Number(cobro.monto) * 100);
    totalCentavos += centavos;
    const acumulado = porFormaPago.get(cobro.formaPago) || {
      cantidadCobros: 0,
      centavos: 0,
    };
    acumulado.cantidadCobros += 1;
    acumulado.centavos += centavos;
    porFormaPago.set(cobro.formaPago, acumulado);
  }

  return {
    fecha,
    zonaHoraria: ZONA_HORARIA_COBRANZAS,
    items,
    cantidadCobros: items.length,
    totalCobrado: totalCentavos / 100,
    totalesPorFormaPago: Array.from(porFormaPago, ([formaPago, totales]) => ({
      formaPago,
      cantidadCobros: totales.cantidadCobros,
      totalCobrado: totales.centavos / 100,
    })).sort((a, b) => a.formaPago.localeCompare(b.formaPago)),
  };
}

function normalizarFormaPago(formaPago) {
  if (formaPago != null && typeof formaPago !== "string") {
    throw new AppError("Forma de pago invalida");
  }
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

function normalizarBooleano(valor) {
  return ["1", "true", "si"].includes(
    String(valor || "").trim().toLowerCase(),
  );
}

function sumarImportes(items, campo) {
  return items.reduce((total, item) => total + Math.round(item[campo] * 100), 0) / 100;
}

function resumenCuenta(cliente) {
  const ventas = cliente.ventas || [];
  const ajustes = cliente.ajustesCuenta || [];
  const cobrosGenerales = cliente.cobros || [];
  const totalAjustes = sumarImportes(ajustes, "monto");
  const totalCobrosGenerales = sumarImportes(cobrosGenerales, "monto");
  return {
    saldoPendiente: redondearMonto(sumarImportes(ventas, "saldoPendiente") + totalAjustes - totalCobrosGenerales),
    totalVendido: sumarImportes(ventas, "total"),
    totalCobrado: redondearMonto(sumarImportes(ventas, "montoPagado") + totalCobrosGenerales),
    totalAjustes,
    ventasPendientes: ventas.filter((venta) => venta.saldoPendiente > 0).length,
  };
}

function mapResumenCliente(cliente) {
  const resumen = resumenCuenta(cliente);
  return {
    id: cliente.id,
    nombre: cliente.nombre,
    telefono: cliente.telefono,
    localidad: cliente.localidad,
    cuit: cliente.cuit,
    saldoPendiente: resumen.saldoPendiente,
    totalVendido: resumen.totalVendido,
    totalCobrado: resumen.totalCobrado,
    totalAjustes: resumen.totalAjustes,
    cantidadAjustes: (cliente.ajustesCuenta || []).length,
    cantidadVentasPendientes: resumen.ventasPendientes,
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

function construirMovimientos(ventas, ajustes = [], cobrosGenerales = []) {
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

    for (const cobro of venta.cobros || []) {
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

  for (const ajuste of ajustes) {
    movimientos.push({
      id: `ajuste-${ajuste.id}`,
      tipo: ajuste.monto > 0 ? "DEBITO" : "CREDITO",
      fecha: ajuste.fecha,
      concepto: ajuste.monto > 0 ? "Ajuste: aumento de saldo" : "Ajuste: disminucion de saldo",
      monto: Math.abs(ajuste.monto),
      ventaId: null,
      cobroId: null,
      ajusteId: ajuste.id,
      formaPago: null,
      observaciones: ajuste.motivo,
      usuario: ajuste.usuario || null,
    });
  }

  for (const cobro of cobrosGenerales) {
    movimientos.push({
      id: `cobro-${cobro.id}`,
      tipo: "CREDITO",
      fecha: cobro.fecha,
      concepto: "Cobro de cuenta corriente",
      monto: cobro.monto,
      ventaId: null,
      cobroId: cobro.id,
      formaPago: cobro.formaPago,
      observaciones: cobro.observaciones,
    });
  }

  let saldo = 0;

  return ordenarMovimientos(movimientos).map((movimiento) => {
    saldo = redondearMonto(
      movimiento.tipo === "DEBITO"
        ? saldo + movimiento.monto
        : saldo - movimiento.monto,
    );

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
      subtotal: venta.subtotal,
      descuento: venta.descuento,
      total: venta.total,
      montoPagado: venta.montoPagado,
      saldoPendiente: venta.saldoPendiente,
      estadoPago: venta.estadoPago,
      formaPago: venta.formaPago,
      detalles: (venta.detalles || []).map((detalle) => ({
        id: detalle.id,
        cantidad: detalle.cantidad,
        precioUnitario: detalle.precioUnitario,
        subtotal: detalle.subtotal,
        productoNombre: detalle.variante?.producto?.nombre || "Producto",
        varianteNombre: detalle.variante?.nombre || "Variante",
      })),
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
  const soloConDeuda = normalizarBooleano(filtros.soloConDeuda);

  logger.info("Se inicia la consulta de resumen de cobranzas", {
    cliente: filtros.cliente || null,
    soloConDeuda,
  });

  const page = normalizarEntero(filtros.page, 1, { min: 1, max: 100000 });
  const limit = normalizarEntero(filtros.limit, 10, { min: 1, max: 100 });
  const clientes = await cobranzasRepository.findClientesConCuenta(
    filtros.cliente,
  );

  const resumen = clientes
    .map(mapResumenCliente)
    .filter((cliente) => {
      if (soloConDeuda) {
        return cliente.saldoPendiente > 0;
      }

      return (
        cliente.saldoPendiente !== 0 ||
        cliente.totalVendido > 0 ||
        cliente.totalCobrado > 0 ||
        cliente.cantidadAjustes > 0 ||
        Boolean(filtros.cliente)
      );
    })
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
  const id = validarId(clienteId, "cliente");

  logger.info(`Se inicia la consulta de cuenta corriente del cliente ${id}`);

  const cliente = await cobranzasRepository.findClienteConCuenta(id);

  if (!cliente) {
    logger.warn(`Cuenta corriente rechazada: cliente ${id} no encontrado`);
    throw new AppError("Cliente no encontrado", 404);
  }

  return construirCuenta(cliente);
}

function construirCuenta(cliente) {
  return {
    cliente: {
      id: cliente.id,
      nombre: cliente.nombre,
      telefono: cliente.telefono,
      localidad: cliente.localidad,
      cuit: cliente.cuit,
      email: cliente.email,
    },
    resumen: resumenCuenta(cliente),
    ventasPendientes: construirVentasPendientes(cliente.ventas),
    movimientos: construirMovimientos(cliente.ventas, cliente.ajustesCuenta, cliente.cobros),
  };
}

function validarId(valor, entidad) {
  if (!["string", "number"].includes(typeof valor) || String(valor).trim() === "") {
    throw new AppError(`ID de ${entidad} invalido`);
  }
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0 || id > 2147483647) {
    throw new AppError(`ID de ${entidad} invalido`);
  }
  return id;
}

function validarMonto(valor) {
  if (!["string", "number"].includes(typeof valor) || String(valor).trim() === "") {
    throw new AppError("El monto es obligatorio y debe ser un numero");
  }
  const numero = Number(valor);
  const centavos = Math.round(numero * 100);
  if (!Number.isFinite(numero) || !Number.isSafeInteger(centavos)) {
    throw new AppError("El monto debe ser un numero valido");
  }
  if (centavos <= 0) {
    throw new AppError("El monto debe ser mayor a 0");
  }
  return centavos / 100;
}

function validarTexto(valor, campo, obligatorio = false) {
  if (valor == null && !obligatorio) return null;
  if (typeof valor !== "string" || (obligatorio && !valor.trim())) {
    throw new AppError(`${campo} ${obligatorio ? "es obligatorio" : "debe ser texto"}`);
  }
  const texto = valor.trim();
  if (texto.length > 500) throw new AppError(`${campo} no puede superar los 500 caracteres`);
  return texto || null;
}

function validarDatosCobro(dto) {
  const monto = validarMonto(dto.monto);
  const formaPago = normalizarFormaPago(dto.formaPago);
  const observaciones = validarTexto(dto.observaciones, "Las observaciones");
  return { monto, formaPago, observaciones };
}

async function bloquearCuenta(tx, clienteId) {
  // Todos los cobros toman primero el cliente y luego sus ventas en orden de ID.
  // Asi tambien se espera a ediciones de ventas antes de comprobar el saldo neto.
  await cobranzasRepository.lockCliente(tx, clienteId);
  await cobranzasRepository.lockVentasCliente(tx, clienteId);
  const cliente = await cobranzasRepository.findClienteConCuenta(clienteId, tx);
  if (!cliente) throw new AppError("Cliente no encontrado", 404);
  return cliente;
}

function validarSaldoCobro(cliente, monto) {
  const saldo = resumenCuenta(cliente).saldoPendiente;
  if (saldo <= 0) throw new AppError("El cliente no tiene saldo pendiente");
  if (monto > saldo) throw new AppError("El cobro supera el saldo de la cuenta corriente");
}

async function aplicarCobroVenta(tx, venta, datos) {
  const nuevoMontoPagado = redondearMonto(venta.montoPagado + datos.monto);
  await cobranzasRepository.createCobro(tx, {
    clienteId: venta.clienteId,
    ventaId: venta.id,
    ...datos,
  });
  await cobranzasRepository.updateVentaPago(tx, venta.id, {
    montoPagado: nuevoMontoPagado,
    saldoPendiente: redondearMonto(venta.total - nuevoMontoPagado),
    estadoPago: calcularEstadoPago(venta.total, nuevoMontoPagado),
  });
}

async function registrarAjuste(clienteId, dto, usuarioId = null) {
  const id = validarId(clienteId, "cliente");
  const monto = validarMonto(dto.monto);
  if (!["DEBITO", "CREDITO"].includes(dto.tipo)) throw new AppError("Tipo de ajuste invalido");
  const motivo = validarTexto(dto.motivo, "El motivo", true);
  const autorId = usuarioId == null ? null : validarId(usuarioId, "usuario");

  return cobranzasRepository.transaction(async (tx) => {
    await cobranzasRepository.lockCliente(tx, id);
    const cliente = await cobranzasRepository.findClienteConCuenta(id, tx);
    if (!cliente) throw new AppError("Cliente no encontrado", 404);
    await cobranzasRepository.createAjuste(tx, {
      clienteId: id,
      monto: dto.tipo === "DEBITO" ? monto : -monto,
      motivo,
      usuarioId: autorId,
    });
    return construirCuenta(await cobranzasRepository.findClienteConCuenta(id, tx));
  });
}

async function registrarCobroCliente(clienteId, dto) {
  const id = validarId(clienteId, "cliente");
  const datos = validarDatosCobro(dto);
  return cobranzasRepository.transaction(async (tx) => {
    const cliente = await bloquearCuenta(tx, id);
    validarSaldoCobro(cliente, datos.monto);
    let restante = datos.monto;
    const pendientes = cliente.ventas
      .filter((venta) => venta.saldoPendiente > 0)
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha) || a.id - b.id);
    for (const venta of pendientes) {
      if (restante <= 0) break;
      const monto = Math.min(restante, venta.saldoPendiente);
      await aplicarCobroVenta(tx, venta, { ...datos, monto });
      restante = redondearMonto(restante - monto);
    }
    if (restante > 0) {
      await cobranzasRepository.createCobro(tx, {
        clienteId: id,
        ventaId: null,
        ...datos,
        monto: restante,
      });
    }
    return construirCuenta(await cobranzasRepository.findClienteConCuenta(id, tx));
  });
}

async function registrarCobro(dto) {
  const ventaId = validarId(dto.ventaId, "venta");
  const datos = validarDatosCobro(dto);

  return cobranzasRepository.transaction(async (tx) => {
    // La primera lectura solo identifica al cliente; los importes se releen bloqueados.
    const referencia = await cobranzasRepository.findVentaParaCobro(tx, ventaId);
    if (!referencia) throw new AppError("Venta no encontrada", 404);
    if (!referencia.clienteId) throw new AppError("La venta no tiene cliente asociado");
    const cliente = await bloquearCuenta(tx, referencia.clienteId);
    const venta = cliente.ventas.find((item) => item.id === ventaId);
    if (!venta) throw new AppError("Venta no encontrada", 404);
    if (venta.saldoPendiente <= 0) throw new AppError("La venta ya esta pagada");
    if (datos.monto > venta.saldoPendiente) throw new AppError("El cobro supera el saldo pendiente");
    validarSaldoCobro(cliente, datos.monto);

    await aplicarCobroVenta(tx, venta, datos);
    return construirCuenta(await cobranzasRepository.findClienteConCuenta(cliente.id, tx));
  });
}

module.exports = {
  listarCobrosDelDia,
  listarResumen,
  obtenerCuentaCorriente,
  registrarAjuste,
  registrarCobroCliente,
  registrarCobro,
};
