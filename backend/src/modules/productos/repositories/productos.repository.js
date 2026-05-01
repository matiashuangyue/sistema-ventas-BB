const prisma = require("../../../lib/prisma");

function findActiveByName(nombre) {
  return prisma.producto.findFirst({
    where: {
      nombre,
      activo: true,
    },
  });
}

function createProducto(data) {
  return prisma.producto.create({ data });
}

function findActiveWithVariantes() {
  return prisma.producto.findMany({
    where: { activo: true },
    include: {
      variantes: true,
    },
    orderBy: {
      id: "desc",
    },
  });
}

module.exports = {
  createProducto,
  findActiveByName,
  findActiveWithVariantes,
};
