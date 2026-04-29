const prisma = require("../../../lib/prisma");

function createListaPrecio(data) {
  return prisma.listaPrecio.create({ data });
}

function findByNombre(nombre) {
  return prisma.listaPrecio.findFirst({
    where: { nombre },
  });
}

function findManyWithPrecios() {
  return prisma.listaPrecio.findMany({
    include: {
      precios: true,
    },
  });
}

module.exports = {
  createListaPrecio,
  findByNombre,
  findManyWithPrecios,
};
