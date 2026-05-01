const prisma = require("../../../lib/prisma");

function aggregateVentas(where) {
  return prisma.venta.aggregate({
    where,
    _sum: { total: true },
    _count: { id: true },
  });
}

function findCliente(id) {
  return prisma.cliente.findUnique({
    where: { id },
  });
}

function findTopClientes(where) {
  return prisma.venta.groupBy({
    by: ["clienteId"],
    where,
    _sum: { total: true },
    orderBy: { _sum: { total: "desc" } },
    take: 5,
  });
}

function findTopProductos(where) {
  return prisma.ventaDetalle.groupBy({
    by: ["varianteId"],
    where: { venta: where },
    _sum: { cantidad: true, subtotal: true },
    orderBy: { _sum: { cantidad: "desc" } },
    take: 5,
  });
}

function findVarianteConProducto(id) {
  return prisma.variante.findUnique({
    where: { id },
    include: { producto: true },
  });
}

module.exports = {
  aggregateVentas,
  findCliente,
  findTopClientes,
  findTopProductos,
  findVarianteConProducto,
};
