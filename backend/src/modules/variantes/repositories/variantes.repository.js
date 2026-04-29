const prisma = require("../../../lib/prisma");

function createVariante(data) {
  return prisma.variante.create({ data });
}

function findById(id, client = prisma) {
  return client.variante.findUnique({
    where: { id },
  });
}

function findByNombreAndProducto(nombre, productoId) {
  return prisma.variante.findFirst({
    where: {
      nombre,
      productoId,
    },
  });
}

function findManyWithRelations() {
  return prisma.variante.findMany({
    include: {
      producto: true,
      precios: {
        include: {
          listaPrecio: true,
        },
        orderBy: {
          cantidadMinima: "asc",
        },
      },
    },
    orderBy: {
      id: "desc",
    },
  });
}

function updateVariante(id, data, client = prisma) {
  return client.variante.update({
    where: { id },
    data,
  });
}

module.exports = {
  createVariante,
  findById,
  findByNombreAndProducto,
  findManyWithRelations,
  updateVariante,
};
