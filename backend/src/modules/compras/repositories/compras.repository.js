const prisma = require("../../../lib/prisma");

function transaction(callback) {
  return prisma.$transaction(callback);
}

function createCompra(client, data) {
  return client.compra.create({ data });
}

function createCompraDetalle(client, data) {
  return client.compraDetalle.create({ data });
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

function updateStockVariante(client, id, data) {
  return client.variante.update({
    where: { id },
    data,
  });
}

module.exports = {
  createCompra,
  createCompraDetalle,
  findCompraById,
  findCompras,
  findVariante,
  transaction,
  updateStockVariante,
};
