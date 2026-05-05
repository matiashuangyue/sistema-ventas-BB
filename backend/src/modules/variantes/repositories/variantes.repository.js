const prisma = require("../../../lib/prisma");

function createVariante(data) {
  return prisma.variante.create({ data });
}

function findById(id, client = prisma) {
  return client.variante.findFirst({
    where: {
      id,
      activo: true,
      producto: {
        activo: true,
      },
    },
  });
}

function findActiveProductoById(productoId, client = prisma) {
  return client.producto.findFirst({
    where: {
      id: productoId,
      activo: true,
    },
  });
}

function findByNombreAndProducto(nombre, productoId, client = prisma) {
  return client.variante.findFirst({
    where: {
      nombre,
      productoId,
      activo: true,
    },
  });
}

function findByNombreAndProductoExceptId(nombre, productoId, id, client = prisma) {
  return client.variante.findFirst({
    where: {
      nombre,
      productoId,
      activo: true,
      NOT: {
        id,
      },
    },
  });
}

function findPageWithRelations({ where, skip, take }) {
  return prisma.$transaction([
    prisma.variante.count({ where }),
    prisma.variante.findMany({
      where,
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
      skip,
      take,
    }),
  ]);
}

function softDeleteVariante(id, client = prisma) {
  return client.variante.update({
    where: { id },
    data: {
      activo: false,
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
  findActiveProductoById,
  findById,
  findByNombreAndProducto,
  findByNombreAndProductoExceptId,
  findPageWithRelations,
  softDeleteVariante,
  updateVariante,
};
