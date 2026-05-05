const prisma = require("../../../lib/prisma");

function transaction(callback) {
  return prisma.$transaction(callback);
}

function findActiveById(id, client = prisma) {
  return client.producto.findFirst({
    where: {
      id,
      activo: true,
    },
  });
}

function findActiveByName(nombre, client = prisma) {
  return client.producto.findFirst({
    where: {
      nombre,
      activo: true,
    },
  });
}

function findActiveByNameExceptId(nombre, id, client = prisma) {
  return client.producto.findFirst({
    where: {
      nombre,
      activo: true,
      NOT: {
        id,
      },
    },
  });
}

function createProducto(data, client = prisma) {
  return client.producto.create({ data });
}

function findActiveWithVariantCount() {
  return prisma.producto.findMany({
    where: { activo: true },
    select: {
      id: true,
      nombre: true,
      categoria: true,
      activo: true,
      createdAt: true,
      _count: {
        select: {
          variantes: {
            where: {
              activo: true,
            },
          },
        },
      },
    },
    orderBy: {
      id: "desc",
    },
  });
}

function softDeleteProducto(id, client = prisma) {
  return client.producto.update({
    where: { id },
    data: {
      activo: false,
    },
  });
}

function softDeleteVariantesByProducto(productoId, client = prisma) {
  return client.variante.updateMany({
    where: {
      productoId,
      activo: true,
    },
    data: {
      activo: false,
    },
  });
}

function updateProducto(id, data, client = prisma) {
  return client.producto.update({
    where: { id },
    data,
  });
}

module.exports = {
  createProducto,
  findActiveById,
  findActiveByName,
  findActiveByNameExceptId,
  findActiveWithVariantCount,
  softDeleteProducto,
  softDeleteVariantesByProducto,
  transaction,
  updateProducto,
};
