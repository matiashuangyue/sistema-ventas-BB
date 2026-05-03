const prisma = require("../../../lib/prisma");

function transaction(callback) {
  return prisma.$transaction(callback);
}

function createPrecioVariante(data, client = prisma) {
  return client.precioVariante.create({ data });
}

function createManyPreciosVariantes(data, client = prisma) {
  return client.precioVariante.createMany({ data });
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

function findByEscalaForVariantes(
  varianteIds,
  listaPrecioId,
  cantidadMinima,
  client = prisma,
) {
  return client.precioVariante.findMany({
    where: {
      varianteId: {
        in: varianteIds,
      },
      listaPrecioId,
      cantidadMinima,
    },
  });
}

function findVariantesByProducto(productoId, client = prisma) {
  return client.variante.findMany({
    where: {
      productoId,
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

function findManyWithRelations() {
  return prisma.precioVariante.findMany({
    where: {
      variante: {
        activo: true,
        producto: {
          activo: true,
        },
      },
    },
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

function updateManyPreciosVariantesByIds(ids, data, client = prisma) {
  return client.precioVariante.updateMany({
    where: {
      id: {
        in: ids,
      },
    },
    data,
  });
}

module.exports = {
  createManyPreciosVariantes,
  createPrecioVariante,
  deletePrecioVariante,
  findByEscala,
  findByEscalaForVariantes,
  findVariantesByProducto,
  findManyWithRelations,
  transaction,
  updateManyPreciosVariantesByIds,
  updatePrecioVariante,
};
