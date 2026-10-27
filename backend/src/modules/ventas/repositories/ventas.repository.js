const prisma = require("../../../lib/prisma");
const { Prisma } = require("@prisma/client");

const ventaIncludeDetalle = {
  cliente: true,
  cobros: {
    orderBy: {
      fecha: "desc",
    },
  },
  detalles: {
    include: {
      variante: {
        include: {
          producto: true,
        },
      },
    },
  },
};

function transaction(callback, options) {
  return prisma.$transaction(callback, options);
}

function lockVenta(client, id) {
  return client.$queryRaw`SELECT "id" FROM "Venta" WHERE "id" = ${id} FOR UPDATE`;
}

function findVarianteForEdit(client, id) {
  return client.variante.findUnique({ where: { id }, include: { producto: true } });
}

function adjustStockForEdit(client, id, delta) {
  return client.variante.updateMany({
    where: { id, ...(delta < 0 ? { stock: { gte: -delta } } : {}) },
    data: { stock: { increment: delta } },
  });
}

function updateVentaDetalle(client, id, data) {
  return client.ventaDetalle.update({ where: { id }, data });
}

function deleteVentaDetallesExcept(client, ventaId, ids) {
  return client.ventaDetalle.deleteMany({
    where: { ventaId, id: { notIn: ids } },
  });
}

function createVenta(client, data) {
  return client.venta.create({ data });
}

function createVentaDetalle(client, data) {
  return client.ventaDetalle.create({ data });
}

function createCobro(client, data) {
  return client.cobro.create({ data });
}

function deleteVenta(client, id) {
  return client.venta.delete({
    where: { id },
  });
}

function deleteCobrosByVentaId(client, ventaId) {
  return client.cobro.deleteMany({
    where: { ventaId },
  });
}

function deleteVentaDetalles(client, ventaId) {
  return client.ventaDetalle.deleteMany({
    where: { ventaId },
  });
}

function findPreciosDisponibles(client, varianteId, cantidad) {
  return client.precioVariante.findMany({
    where: {
      varianteId,
      cantidadMinima: {
        lte: cantidad,
      },
    },
    include: {
      listaPrecio: true,
    },
    orderBy: {
      cantidadMinima: "desc",
    },
  });
}

function findVariante(client, id) {
  return client.variante.findUnique({
    where: { id },
  });
}

function findVentaById(id) {
  return prisma.venta.findUnique({
    where: { id },
    include: ventaIncludeDetalle,
  });
}

function findVentaByIdInTransaction(client, id) {
  return client.venta.findUnique({
    where: { id },
    include: ventaIncludeDetalle,
  });
}

function findVentaWithDetalles(client, id) {
  return client.venta.findUnique({
    where: { id },
    include: {
      cobros: true,
      detalles: true,
    },
  });
}

function findVentas() {
  return prisma.venta.findMany({
    orderBy: {
      id: "desc",
    },
    include: ventaIncludeDetalle,
  });
}

function findVentasHistorial(where) {
  return prisma.venta.findMany({
    where,
    orderBy: {
      fecha: "desc",
    },
    include: ventaIncludeDetalle,
  });
}

function findVentasHistorialPage({ where, skip, take }) {
  return prisma.$transaction([
    prisma.venta.count({ where }),
    prisma.venta.findMany({
      where,
      orderBy: {
        fecha: "desc",
      },
      include: ventaIncludeDetalle,
      skip,
      take,
    }),
  ]);
}

function updateStockVariante(client, id, data) {
  return client.variante.update({
    where: { id },
    data,
  });
}

function updateStockVariantesByDeltas(client, deltas) {
  if (deltas.length === 0) {
    return Promise.resolve(0);
  }

  const values = Prisma.join(
    deltas.map((delta) =>
      Prisma.sql`(${delta.varianteId}::int, ${delta.cantidad}::int)`,
    ),
  );

  return client.$executeRaw`
    UPDATE "Variante" AS v
    SET "stock" = v."stock" + delta."cantidad"
    FROM (VALUES ${values}) AS delta("id", "cantidad")
    WHERE v."id" = delta."id"
  `;
}

function updateVenta(client, id, data) {
  return client.venta.update({
    where: { id },
    data,
    include: ventaIncludeDetalle,
  });
}

module.exports = {
  adjustStockForEdit,
  createCobro,
  createVenta,
  createVentaDetalle,
  deleteCobrosByVentaId,
  deleteVenta,
  deleteVentaDetalles,
  deleteVentaDetallesExcept,
  findPreciosDisponibles,
  findVariante,
  findVarianteForEdit,
  findVentaById,
  findVentaByIdInTransaction,
  findVentaWithDetalles,
  findVentas,
  findVentasHistorial,
  findVentasHistorialPage,
  transaction,
  lockVenta,
  updateStockVariantesByDeltas,
  updateStockVariante,
  updateVenta,
  updateVentaDetalle,
};
