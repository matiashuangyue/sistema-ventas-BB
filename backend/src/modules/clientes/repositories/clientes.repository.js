const prisma = require("../../../lib/prisma");

function createCliente(data) {
  return prisma.cliente.create({ data });
}

function findClientes() {
  return prisma.cliente.findMany({
    orderBy: {
      nombre: "asc",
    },
  });
}

function findClientesPage({ where, skip, take }) {
  return prisma.$transaction([
    prisma.cliente.count({ where }),
    prisma.cliente.findMany({
      where,
      orderBy: {
        nombre: "asc",
      },
      skip,
      take,
    }),
  ]);
}

function searchClientes(q) {
  return prisma.cliente.findMany({
    where: {
      OR: [
        { nombre: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { telefono: { contains: q, mode: "insensitive" } },
        { localidad: { contains: q, mode: "insensitive" } },
        { cuit: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: {
      nombre: "asc",
    },
    take: 10,
  });
}

function updateCliente(id, data) {
  return prisma.cliente.update({
    where: { id },
    data,
  });
}

module.exports = {
  createCliente,
  findClientes,
  findClientesPage,
  searchClientes,
  updateCliente,
};
