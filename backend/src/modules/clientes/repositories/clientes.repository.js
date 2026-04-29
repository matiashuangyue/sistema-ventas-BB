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

function searchClientes(q) {
  return prisma.cliente.findMany({
    where: {
      OR: [
        { nombre: { contains: q } },
        { email: { contains: q } },
        { telefono: { contains: q } },
        { localidad: { contains: q } },
        { cuit: { contains: q } },
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
  searchClientes,
  updateCliente,
};
