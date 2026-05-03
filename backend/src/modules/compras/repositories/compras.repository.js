const prisma = require("../../../lib/prisma");
const { Prisma } = require("@prisma/client");

function transaction(callback, options) {
  return prisma.$transaction(callback, options);
}

function createCompra(client, data) {
  return client.compra.create({ data });
}

function createCompraDetalle(client, data) {
  return client.compraDetalle.create({ data });
}

function createManyCompraDetalles(client, data) {
  return client.compraDetalle.createMany({ data });
}

function findCompraById(client, id) {
  return client.compra.findUnique({
    where: { id },
    include: {
      detalles: {
        include: {
          variante: {
            include: {
              producto: true,
            },
          },
        },
      },
    },
  });
}

function findCompras() {
  return prisma.compra.findMany({
    orderBy: {
      id: "desc",
    },
    include: {
      detalles: {
        include: {
          variante: {
            include: {
              producto: true,
            },
          },
        },
      },
    },
  });
}

function findVariante(client, id) {
  return client.variante.findUnique({
    where: { id },
  });
}

function findVariantesByIds(client, ids) {
  return client.variante.findMany({
    where: {
      id: {
        in: ids,
      },
      activo: true,
      producto: {
        activo: true,
      },
    },
    select: {
      id: true,
      nombre: true,
    },
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

module.exports = {
  createCompra,
  createCompraDetalle,
  createManyCompraDetalles,
  findCompraById,
  findCompras,
  findVariante,
  findVariantesByIds,
  transaction,
  updateStockVariantesByDeltas,
  updateStockVariante,
};
