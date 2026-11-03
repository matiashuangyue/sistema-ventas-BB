const prisma = require("../../../lib/prisma");

const ventaConCuentaInclude = {
  cobros: {
    orderBy: {
      fecha: "asc",
    },
  },
  detalles: {
    orderBy: {
      id: "asc",
    },
    include: {
      variante: {
        include: {
          producto: true,
        },
      },
    },
  },
};

function transaction(callback) {
  return prisma.$transaction(callback, { timeout: 30000 });
}

function lockCliente(client, clienteId) {
  // Serializa movimientos de cuenta sin bloquear las referencias FK al cliente
  // que crean las ventas y sus correcciones mientras tienen su propia fila bloqueada.
  return client.$queryRaw`SELECT "id" FROM "Cliente" WHERE "id" = ${clienteId} FOR NO KEY UPDATE`;
}

function lockVentasCliente(client, clienteId) {
  return client.$queryRaw`SELECT "id" FROM "Venta" WHERE "clienteId" = ${clienteId} ORDER BY "id" FOR UPDATE`;
}

function createCobro(client, data) {
  return client.cobro.create({ data });
}

function createAjuste(client, data) {
  return client.ajusteCuentaCorriente.create({ data });
}

function findCobrosEntreFechas(desde, hasta) {
  return prisma.cobro.findMany({
    where: { fecha: { gte: desde, lt: hasta } },
    orderBy: [{ fecha: "asc" }, { id: "asc" }],
    select: {
      id: true,
      fecha: true,
      clienteId: true,
      cliente: { select: { id: true, nombre: true } },
      ventaId: true,
      monto: true,
      formaPago: true,
      observaciones: true,
    },
  });
}

function findClienteConCuenta(clienteId, client = prisma) {
  return client.cliente.findUnique({
    where: { id: clienteId },
    include: {
      ajustesCuenta: {
        orderBy: [{ fecha: "asc" }, { id: "asc" }],
        include: { usuario: { select: { id: true, nombre: true } } },
      },
      cobros: {
        where: { ventaId: null },
        orderBy: [{ fecha: "asc" }, { id: "asc" }],
      },
      ventas: {
        orderBy: [{ fecha: "asc" }, { id: "asc" }],
        include: ventaConCuentaInclude,
      },
    },
  });
}

function findClientesConCuenta(filtroCliente) {
  const texto = filtroCliente?.trim();

  return prisma.cliente.findMany({
    where: texto
      ? {
          OR: [
            { nombre: { contains: texto } },
            { email: { contains: texto } },
            { telefono: { contains: texto } },
            { localidad: { contains: texto } },
            { cuit: { contains: texto } },
          ],
        }
      : undefined,
    orderBy: {
      nombre: "asc",
    },
    include: {
      ajustesCuenta: { select: { monto: true } },
      cobros: { where: { ventaId: null }, select: { monto: true } },
      ventas: {
        orderBy: [{ fecha: "desc" }, { id: "desc" }],
      },
    },
  });
}

function findVentaParaCobro(client, ventaId) {
  return client.venta.findUnique({
    where: { id: ventaId },
    include: {
      cliente: true,
    },
  });
}

function updateVentaPago(client, ventaId, data) {
  return client.venta.update({
    where: { id: ventaId },
    data,
  });
}

module.exports = {
  lockCliente,
  lockVentasCliente,
  createCobro,
  createAjuste,
  findCobrosEntreFechas,
  findClienteConCuenta,
  findClientesConCuenta,
  findVentaParaCobro,
  transaction,
  updateVentaPago,
};
