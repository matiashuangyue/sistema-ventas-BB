const bcrypt = require("bcryptjs");

const prisma = require("../src/lib/prisma");
const comprasService = require("../src/modules/compras/services/compras.service");
const ventasService = require("../src/modules/ventas/services/ventas.service");
const CrearCompraDto = require("../src/modules/compras/models/dtos/crear-compra.dto");
const CrearVentaDto = require("../src/modules/ventas/models/dtos/crear-venta.dto");
const logger = require("../src/shared/logger/logger");

const TEST_PASSWORD = "Test1234!";
const COMPRA_TEST_OBSERVACIONES = "SEED_TEST_COMPRA_001";

async function upsertUsuario({ nombre, username, email, rol }) {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

  return prisma.usuario.upsert({
    where: { username },
    update: {
      nombre,
      email,
      rol,
      activo: true,
    },
    create: {
      nombre,
      username,
      email,
      password: passwordHash,
      rol,
      activo: true,
    },
  });
}

function upsertCliente(data) {
  return prisma.cliente.upsert({
    where: { email: data.email },
    update: data,
    create: data,
  });
}

async function findOrCreateProducto(nombre, categoria) {
  const existente = await prisma.producto.findFirst({
    where: { nombre },
  });

  if (existente) {
    return prisma.producto.update({
      where: { id: existente.id },
      data: {
        categoria,
        activo: true,
      },
    });
  }

  return prisma.producto.create({
    data: {
      nombre,
      categoria,
      activo: true,
    },
  });
}

async function findOrCreateVariante(productoId, data) {
  const existente = await prisma.variante.findFirst({
    where: {
      productoId,
      nombre: data.nombre,
    },
  });

  if (existente) {
    return prisma.variante.update({
      where: { id: existente.id },
      data: {
        stockMinimo: data.stockMinimo,
      },
    });
  }

  return prisma.variante.create({
    data: {
      ...data,
      productoId,
      stock: 0,
    },
  });
}

async function findOrCreateListaPrecio(nombre) {
  const existente = await prisma.listaPrecio.findFirst({
    where: { nombre },
  });

  if (existente) {
    return existente;
  }

  return prisma.listaPrecio.create({
    data: {
      nombre,
      activa: true,
    },
  });
}

async function upsertPrecioVariante({
  varianteId,
  listaPrecioId,
  cantidadMinima,
  precio,
}) {
  const existente = await prisma.precioVariante.findFirst({
    where: {
      varianteId,
      listaPrecioId,
      cantidadMinima,
    },
  });

  if (existente) {
    return prisma.precioVariante.update({
      where: { id: existente.id },
      data: { precio },
    });
  }

  return prisma.precioVariante.create({
    data: {
      varianteId,
      listaPrecioId,
      cantidadMinima,
      precio,
    },
  });
}

async function asegurarStock(varianteId, stockMinimoNecesario) {
  const variante = await prisma.variante.findUnique({
    where: { id: varianteId },
  });

  if (!variante || variante.stock >= stockMinimoNecesario) {
    return;
  }

  await prisma.variante.update({
    where: { id: varianteId },
    data: {
      stock: stockMinimoNecesario,
    },
  });
}

async function seedUsuarios() {
  const usuarios = await Promise.all([
    upsertUsuario({
      nombre: "Admin Test",
      username: "admin_test",
      email: "admin.test@bb.local",
      rol: "admin",
    }),
    upsertUsuario({
      nombre: "Vendedor Test",
      username: "vendedor_test",
      email: "vendedor.test@bb.local",
      rol: "vendedor",
    }),
  ]);

  logger.info(`Usuarios de prueba listos: ${usuarios.length}`);
}

async function seedClientes() {
  const clientes = await Promise.all([
    upsertCliente({
      nombre: "Cliente Minorista Test",
      email: "cliente.minorista.test@bb.local",
      telefono: "11-5555-0101",
      direccion: "Av. Siempre Viva 123",
      localidad: "Buenos Aires",
      cuit: "20-11111111-1",
      observaciones: "Cliente de prueba minorista",
    }),
    upsertCliente({
      nombre: "Cliente Mayorista Test",
      email: "cliente.mayorista.test@bb.local",
      telefono: "11-5555-0202",
      direccion: "Calle Mayorista 456",
      localidad: "Moron",
      cuit: "30-22222222-2",
      observaciones: "Cliente de prueba mayorista",
    }),
    upsertCliente({
      nombre: "Distribuidora Test SRL",
      email: "distribuidora.test@bb.local",
      telefono: "11-5555-0303",
      direccion: "Ruta Test 789",
      localidad: "La Plata",
      cuit: "30-33333333-3",
      observaciones: "Distribuidora de prueba",
    }),
  ]);

  logger.info(`Clientes de prueba listos: ${clientes.length}`);

  return {
    clienteMinorista: clientes[0],
    clienteMayorista: clientes[1],
    distribuidora: clientes[2],
  };
}

async function seedCatalogo() {
  const listasPrecio = await Promise.all([
    findOrCreateListaPrecio("Lista 1"),
    findOrCreateListaPrecio("Lista 2"),
    findOrCreateListaPrecio("Lista 3"),
  ]);

  const productos = await Promise.all([
    findOrCreateProducto("Remera Oversize Test", "Indumentaria"),
    findOrCreateProducto("Buzo Hoodie Test", "Indumentaria"),
    findOrCreateProducto("Gorra Bordada Test", "Accesorios"),
  ]);

  const variantes = [
    await findOrCreateVariante(productos[0].id, {
      nombre: "Negro M",
      stockMinimo: 5,
    }),
    await findOrCreateVariante(productos[0].id, {
      nombre: "Negro L",
      stockMinimo: 5,
    }),
    await findOrCreateVariante(productos[0].id, {
      nombre: "Blanco M",
      stockMinimo: 5,
    }),
    await findOrCreateVariante(productos[1].id, {
      nombre: "Gris M",
      stockMinimo: 3,
    }),
    await findOrCreateVariante(productos[1].id, {
      nombre: "Negro L",
      stockMinimo: 3,
    }),
    await findOrCreateVariante(productos[2].id, {
      nombre: "Unico Negro",
      stockMinimo: 4,
    }),
    await findOrCreateVariante(productos[2].id, {
      nombre: "Unico Blanco",
      stockMinimo: 4,
    }),
  ];

  for (const [index, variante] of variantes.entries()) {
    const precioBase = [12000, 12500, 11800, 28000, 29500, 9000, 9000][index];

    await upsertPrecioVariante({
      varianteId: variante.id,
      listaPrecioId: listasPrecio[0].id,
      cantidadMinima: 1,
      precio: precioBase,
    });

    await upsertPrecioVariante({
      varianteId: variante.id,
      listaPrecioId: listasPrecio[1].id,
      cantidadMinima: 6,
      precio: Math.round(precioBase * 0.9),
    });

    await upsertPrecioVariante({
      varianteId: variante.id,
      listaPrecioId: listasPrecio[2].id,
      cantidadMinima: 12,
      precio: Math.round(precioBase * 0.82),
    });
  }

  logger.info(
    `Catalogo de prueba listo: ${productos.length} productos, ${variantes.length} variantes`,
  );

  return {
    listasPrecio,
    productos,
    variantes,
  };
}

async function seedCompraInicial(variantes) {
  const compraExistente = await prisma.compra.findFirst({
    where: { observaciones: COMPRA_TEST_OBSERVACIONES },
  });

  if (compraExistente) {
    logger.info(`Compra de prueba ya existente con id ${compraExistente.id}`);
    return compraExistente;
  }

  const compra = await comprasService.crearCompra(
    CrearCompraDto.from({
      proveedor: "Proveedor Test",
      observaciones: COMPRA_TEST_OBSERVACIONES,
      items: [
        { varianteId: variantes[0].id, cantidad: 20, costoUnitario: 6500 },
        { varianteId: variantes[1].id, cantidad: 15, costoUnitario: 6700 },
        { varianteId: variantes[3].id, cantidad: 10, costoUnitario: 16000 },
        { varianteId: variantes[5].id, cantidad: 18, costoUnitario: 4200 },
      ],
    }),
  );

  logger.info(`Compra inicial de prueba creada con id ${compra.id}`);

  return compra;
}

async function seedVentaInicial(clienteMinorista, variantes) {
  const ventaExistente = await prisma.venta.findFirst({
    where: {
      clienteId: clienteMinorista.id,
      detalles: {
        some: {
          varianteId: variantes[0].id,
          cantidad: 2,
        },
      },
    },
  });

  if (ventaExistente) {
    logger.info(`Venta de prueba ya existente con id ${ventaExistente.id}`);
    return ventaExistente;
  }

  await asegurarStock(variantes[0].id, 2);
  await asegurarStock(variantes[5].id, 1);

  const venta = await ventasService.crearVenta(
    CrearVentaDto.from({
      clienteId: clienteMinorista.id,
      descuento: 1000,
      items: [
        { varianteId: variantes[0].id, cantidad: 2 },
        { varianteId: variantes[5].id, cantidad: 1 },
      ],
    }),
  );

  logger.info(`Venta inicial de prueba creada con id ${venta.id}`);

  return venta;
}

async function main() {
  logger.info("Se inicia la carga de datos de prueba");

  await seedUsuarios();
  const { clienteMinorista } = await seedClientes();
  const { variantes } = await seedCatalogo();

  await seedCompraInicial(variantes);
  await seedVentaInicial(clienteMinorista, variantes);

  logger.info("Carga de datos de prueba finalizada correctamente");
  logger.info("Usuarios de prueba disponibles", {
    admin: "admin_test",
    vendedor: "vendedor_test",
    password: TEST_PASSWORD,
  });
}

main()
  .catch((error) => {
    logger.error("Error cargando datos de prueba", {
      message: error.message,
      stack: error.stack,
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
