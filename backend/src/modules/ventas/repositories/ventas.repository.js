const prisma = require("../../../lib/prisma");
const { Prisma } = require("@prisma/client");

const ventaIncludeDetalle = {
  cliente: true,
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

function createVenta(client, data) {
  return client.venta.create({ data });
}

function createVentaDetalle(client, data) {
  return client.ventaDetalle.create({ data });
}

function deleteVenta(client, id) {
  return client.venta.delete({
    where: { id },
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

function findVentaWithDetalles(client, id) {
  return client.venta.findUnique({
    where: { id },
    include: {
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
  createVenta,
  createVentaDetalle,
  deleteVenta,
  deleteVentaDetalles,
  findPreciosDisponibles,
  findVariante,
  findVentaById,
  findVentaWithDetalles,
  findVentas,
  findVentasHistorial,
  transaction,
  updateStockVariantesByDeltas,
  updateStockVariante,
  updateVenta,
};
