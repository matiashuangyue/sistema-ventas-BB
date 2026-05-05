const prisma = require("../../../lib/prisma");

const ventaConCobrosInclude = {
  cobros: {
    orderBy: {
      fecha: "asc",
    },
  },
};

function transaction(callback) {
  return prisma.$transaction(callback);
}

function createCobro(client, data) {
  return client.cobro.create({ data });
}

function findClienteConCuenta(clienteId) {
  return prisma.cliente.findUnique({
    where: { id: clienteId },
    include: {
      ventas: {
        orderBy: [{ fecha: "asc" }, { id: "asc" }],
        include: ventaConCobrosInclude,
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
  createCobro,
  findClienteConCuenta,
  findClientesConCuenta,
  findVentaParaCobro,
  transaction,
  updateVentaPago,
};
