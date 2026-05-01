const prisma = require("../../../lib/prisma");

function transaction(callback) {
  return prisma.$transaction(callback);
}

function createPrecioVariante(data, client = prisma) {
  return client.precioVariante.create({ data });
}

function deletePrecioVariante(id) {
  return prisma.precioVariante.delete({
    where: { id },
  });
}

function findByEscala(varianteId, listaPrecioId, cantidadMinima, client = prisma) {
  return client.precioVariante.findFirst({
    where: {
      varianteId,
      listaPrecioId,
      cantidadMinima,
    },
  });
}

function findVariantesByProducto(productoId, client = prisma) {
  return client.variante.findMany({
    where: { productoId },
    select: {
      id: true,
      nombre: true,
    },
  });
}

function findManyWithRelations() {
  return prisma.precioVariante.findMany({
    include: {
      variante: {
        include: {
          producto: true,
        },
      },
      listaPrecio: true,
    },
  });
}

function updatePrecioVariante(id, data, client = prisma) {
  return client.precioVariante.update({
    where: { id },
    data,
  });
}

module.exports = {
  createPrecioVariante,
  deletePrecioVariante,
  findByEscala,
  findVariantesByProducto,
  findManyWithRelations,
  transaction,
  updatePrecioVariante,
};
