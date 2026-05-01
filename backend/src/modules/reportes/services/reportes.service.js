const logger = require("../../../shared/logger/logger");
const reportesRepository = require("../repositories/reportes.repository");

function crearFiltroFecha(dto) {
  const filtroFecha = {};

  if (dto.desde || dto.hasta) {
    filtroFecha.fecha = {};
    if (dto.desde) {
      filtroFecha.fecha.gte = new Date(`${dto.desde}T00:00:00.000Z`);
    }
    if (dto.hasta) {
      filtroFecha.fecha.lte = new Date(`${dto.hasta}T23:59:59.999Z`);
    }
  }

  return filtroFecha;
}

async function obtenerDashboard(dto) {
  logger.info("Se inicia la consulta del dashboard de reportes", {
    desde: dto.desde || null,
    hasta: dto.hasta || null,
  });

  const filtroFecha = crearFiltroFecha(dto);

  const stats = await reportesRepository.aggregateVentas(filtroFecha);
  const clientesTopRaw = await reportesRepository.findTopClientes(filtroFecha);

  const rankingClientes = await Promise.all(
    clientesTopRaw.map(async (cliente) => {
      const registro = cliente.clienteId
        ? await reportesRepository.findCliente(cliente.clienteId)
        : null;

      return {
        nombre: registro?.nombre || "Consumidor Final",
        total: cliente._sum.total,
      };
    }),
  );

  const topProductosRaw = await reportesRepository.findTopProductos(
    filtroFecha,
  );

  const topProductos = await Promise.all(
    topProductosRaw.map(async (item) => {
      const variante = await reportesRepository.findVarianteConProducto(
        item.varianteId,
      );

      return {
        nombre: `${variante?.producto?.nombre} ${variante?.nombre}`,
        cantidad: item._sum.cantidad,
        total: item._sum.subtotal,
      };
    }),
  );

  const total = stats._sum.total || 0;
  const cantidad = stats._count.id || 0;

  const dashboard = {
    resumen: {
      total,
      cantidad,
      promedio: cantidad > 0 ? total / cantidad : 0,
    },
    rankingClientes,
    topProductos,
  };

  logger.info("Dashboard de reportes generado correctamente", {
    ventas: cantidad,
    total,
    clientesEnRanking: rankingClientes.length,
    productosEnRanking: topProductos.length,
  });

  return dashboard;
}

module.exports = {
  obtenerDashboard,
};
