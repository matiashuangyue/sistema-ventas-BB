const express = require("express");
const cors = require("cors");
const prisma = require("./lib/prisma");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API funcionando");
});


// 👉 crear producto
app.post("/productos", async (req, res) => {
  try {
    const { nombre, categoria } = req.body;

    const producto = await prisma.producto.create({
      data: {
        nombre,
        categoria,
      },
    });

    res.json(producto);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creando producto" });
  }
});


// 👉 listar productos
app.get("/productos", async (req, res) => {
  try {
    const productos = await prisma.producto.findMany({
      include: {
        variantes: true,
      },
    });

    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo productos" });
  }
});
// 👉 crear variante
app.post("/variantes", async (req, res) => {
  try {
    const { nombre, stock, stockMinimo, productoId } = req.body;

    const variante = await prisma.variante.create({
      data: {
        nombre,
        stock: stock ?? 0,
        stockMinimo,
        productoId,
      },
    });

    res.json(variante);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creando variante" });
  }
});

// 👉 listar variantes
app.get("/variantes", async (req, res) => {
  try {
    const variantes = await prisma.variante.findMany({
      include: {
        producto: true,
        precios: {
          include: {
            listaPrecio: true,
          },
        },
      },
    });

    res.json(variantes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error obteniendo variantes" });
  }
});

// 👉 crear lista de precio
app.post("/listas-precio", async (req, res) => {
  try {
    const { nombre } = req.body;

    const lista = await prisma.listaPrecio.create({
      data: {
        nombre,
      },
    });

    res.json(lista);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creando lista de precio" });
  }
});

// 👉 listar listas de precio
app.get("/listas-precio", async (req, res) => {
  try {
    const listas = await prisma.listaPrecio.findMany({
      include: {
        precios: true,
      },
    });

    res.json(listas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error obteniendo listas de precio" });
  }
});

// 👉 asignar precio a una variante según lista
app.post("/precios-variantes", async (req, res) => {
  try {
    const { varianteId, listaPrecioId, precio } = req.body;

    const precioVariante = await prisma.precioVariante.create({
      data: {
        varianteId,
        listaPrecioId,
        precio,
      },
    });

    res.json(precioVariante);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creando precio para variante" });
  }
});

// 👉 listar precios por variante
app.get("/precios-variantes", async (req, res) => {
  try {
    const precios = await prisma.precioVariante.findMany({
      include: {
        variante: {
          include: {
            producto: true,
          },
        },
        listaPrecio: true,
      },
    });

    res.json(precios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error obteniendo precios de variantes" });
  }
});

// 👉 crear venta
app.post("/ventas", async (req, res) => {
  try {
    const { clienteId = null, descuento = 0, items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "La venta debe incluir al menos un item" });
    }

    const venta = await prisma.$transaction(async (tx) => {
      let subtotal = 0;

      for (const item of items) {
        if (!item.varianteId || !item.cantidad || !item.precioUnitario) {
          throw new Error("Hay items incompletos en la venta");
        }

        if (item.cantidad <= 0) {
          throw new Error("La cantidad debe ser mayor a 0");
        }

        if (item.precioUnitario < 0) {
          throw new Error("El precio unitario no puede ser negativo");
        }

        const variante = await tx.variante.findUnique({
          where: { id: item.varianteId },
        });

        if (!variante) {
          throw new Error(`La variante con ID ${item.varianteId} no existe`);
        }

        if (variante.stock < item.cantidad) {
          throw new Error(
            `Stock insuficiente para ${variante.nombre}. Stock actual: ${variante.stock}`
          );
        }

        const descuentoItem = item.descuentoItem || 0;
        const subtotalItem = item.cantidad * item.precioUnitario - descuentoItem;

        if (subtotalItem < 0) {
          throw new Error(`El subtotal del item ${variante.nombre} no puede ser negativo`);
        }

        subtotal += subtotalItem;
      }

      if (descuento < 0) {
        throw new Error("El descuento general no puede ser negativo");
      }

      if (descuento > subtotal) {
        throw new Error("El descuento general no puede ser mayor al subtotal");
      }

      const total = subtotal - descuento;

      const nuevaVenta = await tx.venta.create({
        data: {
          clienteId,
          subtotal,
          descuento,
          total,
        },
      });

      for (const item of items) {
        const descuentoItem = item.descuentoItem || 0;
        const subtotalItem = item.cantidad * item.precioUnitario - descuentoItem;

        await tx.ventaDetalle.create({
          data: {
            ventaId: nuevaVenta.id,
            varianteId: item.varianteId,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            descuentoItem,
            subtotal: subtotalItem,
          },
        });

        await tx.variante.update({
          where: { id: item.varianteId },
          data: {
            stock: {
              decrement: item.cantidad,
            },
          },
        });
      }

      return await tx.venta.findUnique({
        where: { id: nuevaVenta.id },
        include: {
          cliente: true,
          detalles: {
            include: {
              variante: {
                include: {
                  producto: true,
                },
              },
            },
          },
        },
      });
    });

    res.json(venta);
  } catch (error) {
    console.error(error);

    return res.status(400).json({
      error: error.message || "Error creando venta",
    });
  }
});

// 👉 listar ventas
app.get("/ventas", async (req, res) => {
  try {
    const ventas = await prisma.venta.findMany({
      orderBy: {
        id: "desc",
      },
      include: {
        cliente: true,
        detalles: {
          include: {
            variante: {
              include: {
                producto: true,
              },
            },
          },
        },
      },
    });

    res.json(ventas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error obteniendo ventas" });
  }
});







//////////////////////////////////////////////////////////////

const PORT = 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API lista en http://localhost:${PORT}`);
});