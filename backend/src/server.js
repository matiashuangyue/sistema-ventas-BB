const express = require("express");
const cors = require("cors");
const prisma = require("./lib/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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
      orderBy: {
        id: "desc",
      },
    });

    res.json(productos);
  } catch (error) {
    console.error(error);
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
          orderBy: {
            cantidadMinima: "asc",
          },
        },
      },
      orderBy: {
        id: "desc",
      },
    });

    res.json(variantes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error obteniendo variantes" });
  }
});
// 👉 actualizar stock de variante
app.put("/variantes/:id/stock", async (req, res) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;

    if (stock == null || stock < 0) {
      return res.status(400).json({ error: "Stock inválido" });
    }

    const variante = await prisma.variante.update({
      where: { id: Number(id) },
      data: { stock: Number(stock) },
    });

    res.json(variante);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error actualizando stock" });
  }
});
// 👉 crear producto
app.post("/productos", async (req, res) => {
  try {
    const { nombre, categoria } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }

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

// 👉 publicar variantes
app.post("/variantes", async (req, res) => {
  try {
    const { nombre, stock = 0, stockMinimo = 0, productoId } = req.body;

    if (!nombre || !productoId) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    const variante = await prisma.variante.create({
      data: {
        nombre,
        stock: Number(stock),
        stockMinimo: Number(stockMinimo),
        productoId: Number(productoId),
      },
    });

    res.json(variante);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creando variante" });
  }
});

app.post("/precios-variantes", async (req, res) => {
  try {
    const { varianteId, listaPrecioId, precio, cantidadMinima } = req.body;

    if (
      !varianteId ||
      !listaPrecioId ||
      precio == null ||
      cantidadMinima == null
    ) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    const existente = await prisma.precioVariante.findFirst({
      where: {
        varianteId: Number(varianteId),
        listaPrecioId: Number(listaPrecioId),
        cantidadMinima: Number(cantidadMinima),
      },
    });

    let precioVariante;

    if (existente) {
      precioVariante = await prisma.precioVariante.update({
        where: { id: existente.id },
        data: {
          precio: Number(precio),
        },
      });
    } else {
      precioVariante = await prisma.precioVariante.create({
        data: {
          varianteId: Number(varianteId),
          listaPrecioId: Number(listaPrecioId),
          precio: Number(precio),
          cantidadMinima: Number(cantidadMinima),
        },
      });
    }

    res.json(precioVariante);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creando/actualizando precio" });
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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

// 👉 crear precio por tramo/cantidad mínima
app.post("/precios-variantes", async (req, res) => {
  try {
    const { varianteId, listaPrecioId, precio, cantidadMinima } = req.body;

    if (!varianteId || !listaPrecioId || precio == null || cantidadMinima == null) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    const precioVariante = await prisma.precioVariante.create({
      data: {
        varianteId,
        listaPrecioId,
        precio,
        cantidadMinima,
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
      return res.status(400).json({ error: "La venta debe incluir items" });
    }

    const venta = await prisma.$transaction(async (tx) => {
      let subtotal = 0;

      const nuevaVenta = await tx.venta.create({
        data: {
          clienteId,
          subtotal: 0,
          descuento,
          total: 0,
        },
      });

      for (const item of items) {
        if (!item.varianteId || !item.cantidad) {
          throw new Error("Hay items incompletos");
        }

        if (item.cantidad <= 0) {
          throw new Error("La cantidad debe ser mayor a 0");
        }

        const variante = await tx.variante.findUnique({
          where: { id: item.varianteId },
        });

        if (!variante) {
          throw new Error("Variante no encontrada");
        }

        if (variante.stock < item.cantidad) {
          throw new Error(`Stock insuficiente para ${variante.nombre}`);
        }

        // Buscar todos los precios de esa variante cuyo mínimo sea <= cantidad
        const preciosDisponibles = await tx.precioVariante.findMany({
          where: {
            varianteId: item.varianteId,
            cantidadMinima: {
              lte: item.cantidad,
            },
          },
          include: {
            listaPrecio: true,
          },
          orderBy: {
            cantidadMinima: "desc",
          },
        });

        if (preciosDisponibles.length === 0) {
          throw new Error(`No hay precio configurado para ${variante.nombre}`);
        }

        const precioAplicado = preciosDisponibles[0];
        const precioUnitario = precioAplicado.precio;
        const subtotalItem = precioUnitario * item.cantidad;

        subtotal += subtotalItem;

        await tx.ventaDetalle.create({
          data: {
            ventaId: nuevaVenta.id,
            varianteId: item.varianteId,
            cantidad: item.cantidad,
            precioUnitario,
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

      if (descuento > subtotal) {
        throw new Error("El descuento no puede ser mayor al subtotal");
      }

      const total = subtotal - descuento;

      const ventaFinal = await tx.venta.update({
        where: { id: nuevaVenta.id },
        data: {
          subtotal,
          total,
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

      return ventaFinal;
    });

    res.json(venta);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message || "Error creando venta" });
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

// 👉 registrar usuario
app.post("/auth/register", async (req, res) => {
  try {
    const { nombre, username, password, rol } = req.body;

    if (!nombre || !username || !password) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    const existe = await prisma.usuario.findUnique({
      where: { username },
    });

    if (existe) {
      return res.status(400).json({ error: "El usuario ya existe" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const usuario = await prisma.usuario.create({
      data: {
        nombre,
        username,
        password: passwordHash,
        rol: rol || "admin",
      },
    });

    res.json({
      id: usuario.id,
      nombre: usuario.nombre,
      username: usuario.username,
      rol: usuario.rol,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error registrando usuario" });
  }
});

// 👉 login
app.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const usuario = await prisma.usuario.findUnique({
      where: { username },
    });

    if (!usuario) {
      return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    }

    if (!usuario.activo) {
      return res.status(403).json({ error: "Usuario inactivo" });
    }

    const passwordOk = await bcrypt.compare(password, usuario.password);

    if (!passwordOk) {
      return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        username: usuario.username,
        rol: usuario.rol,
      },
      "secreto_super_seguro",
      { expiresIn: "8h" }
    );

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        username: usuario.username,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en login" });
  }
});

function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "Token no proporcionado" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Token inválido" });
    }

    const decoded = jwt.verify(token, "secreto_super_seguro");

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "No autorizado" });
  }
}

app.get("/auth/me", authMiddleware, async (req, res) => {
  res.json({
    mensaje: "Usuario autenticado",
    user: req.user,
  });
});

// 👉 crear compra / ingreso de stock
app.post("/compras", authMiddleware, async (req, res) => {
  try {
    const { proveedor = null, observaciones = null, items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "La compra debe incluir al menos un item" });
    }

    const compra = await prisma.$transaction(async (tx) => {
      let total = 0;

      for (const item of items) {
        if (!item.varianteId || !item.cantidad || item.costoUnitario == null) {
          throw new Error("Hay items incompletos en la compra");
        }

        if (item.cantidad <= 0) {
          throw new Error("La cantidad debe ser mayor a 0");
        }

        if (item.costoUnitario < 0) {
          throw new Error("El costo unitario no puede ser negativo");
        }

        const variante = await tx.variante.findUnique({
          where: { id: item.varianteId },
        });

        if (!variante) {
          throw new Error(`La variante con ID ${item.varianteId} no existe`);
        }

        total += item.cantidad * item.costoUnitario;
      }

      const nuevaCompra = await tx.compra.create({
        data: {
          proveedor,
          total,
          observaciones,
        },
      });

      for (const item of items) {
        const subtotal = item.cantidad * item.costoUnitario;

        await tx.compraDetalle.create({
          data: {
            compraId: nuevaCompra.id,
            varianteId: item.varianteId,
            cantidad: item.cantidad,
            costoUnitario: item.costoUnitario,
            subtotal,
          },
        });

        await tx.variante.update({
          where: { id: item.varianteId },
          data: {
            stock: {
              increment: item.cantidad,
            },
          },
        });
      }

      return await tx.compra.findUnique({
        where: { id: nuevaCompra.id },
        include: {
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

    res.json(compra);
  } catch (error) {
    console.error(error);
    res.status(400).json({
      error: error.message || "Error creando compra",
    });
  }
});

// 👉 listar compras
app.get("/compras", authMiddleware, async (req, res) => {
  try {
    const compras = await prisma.compra.findMany({
      orderBy: {
        id: "desc",
      },
      include: {
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

    res.json(compras);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error obteniendo compras" });
  }
});



// 👉 actualizar precio de variante
app.put("/precios-variantes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { precio, cantidadMinima, listaPrecioId, varianteId } = req.body;

    const actualizado = await prisma.precioVariante.update({
      where: { id: Number(id) },
      data: {
        precio,
        cantidadMinima,
        listaPrecioId,
        varianteId,
      },
    });

    res.json(actualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error actualizando precio" });
  }
});

// 👉 crear cliente
app.post("/clientes", async (req, res) => {
  try {
    const { nombre, telefono, direccion, localidad, cuit, observaciones } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    const cliente = await prisma.cliente.create({
      data: {
        nombre,
        telefono,
        direccion,
        localidad,
        cuit,
        observaciones,
      },
    });

    res.json(cliente);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creando cliente" });
  }
});

// 👉 listar clientes
app.get("/clientes", async (req, res) => {
  try {
    const clientes = await prisma.cliente.findMany({
      orderBy: {
        nombre: "asc",
      },
    });

    res.json(clientes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error obteniendo clientes" });
  }
});

// 👉 buscar clientes
app.get("/clientes/buscar", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();

    if (!q) {
      return res.json([]);
    }

    const clientes = await prisma.cliente.findMany({
      where: {
        OR: [
          { nombre: { contains: q } },
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

    res.json(clientes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error buscando clientes" });
  }
});


app.delete("/precios-variantes/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.precioVariante.delete({
      where: { id: Number(id) },
    });

    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error eliminando precio" });
  }
});

app.put("/precios-variantes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidadMinima, precio } = req.body;

    if (cantidadMinima == null || precio == null) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    const precioActual = await prisma.precioVariante.findUnique({
      where: { id: Number(id) },
    });

    if (!precioActual) {
      return res.status(404).json({ error: "Escala no encontrada" });
    }

    const existente = await prisma.precioVariante.findFirst({
      where: {
        varianteId: precioActual.varianteId,
        listaPrecioId: precioActual.listaPrecioId,
        cantidadMinima: Number(cantidadMinima),
        NOT: {
          id: Number(id),
        },
      },
    });

    if (existente) {
      return res.status(400).json({
        error: "Ya existe una escala con esa lista y cantidad mínima",
      });
    }

    const actualizado = await prisma.precioVariante.update({
      where: { id: Number(id) },
      data: {
        cantidadMinima: Number(cantidadMinima),
        precio: Number(precio),
      },
    });

    res.json(actualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error actualizando precio" });
  }
});

app.put("/variantes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, stockMinimo, productoId } = req.body;

    const actualizada = await prisma.variante.update({
      where: { id: Number(id) },
      data: {
        nombre,
        stockMinimo: stockMinimo != null ? Number(stockMinimo) : undefined,
        productoId: productoId ? Number(productoId) : undefined,
      },
    });

    res.json(actualizada);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error actualizando variante" });
  }
});

app.get("/ventas/historial", async (req, res) => {
  try {
    const { desde, hasta, cliente } = req.query;

    const where = {};

    // filtro por fechas
    if (desde || hasta) {
      where.fecha = {};

      if (desde) {
        where.fecha.gte = new Date(`${desde}T00:00:00.000Z`);
      }

      if (hasta) {
        where.fecha.lte = new Date(`${hasta}T23:59:59.999Z`);
      }
    }

    // filtro por cliente
    if (cliente && cliente.trim() !== "") {
      where.cliente = {
        nombre: {
          contains: cliente.trim(),
        },
      };
    }

    const ventas = await prisma.venta.findMany({
      where,
      orderBy: {
        fecha: "desc",
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

    const resultado = ventas.map((venta) => ({
      id: venta.id,
      fecha: venta.fecha,
      cliente: venta.cliente ? venta.cliente.nombre : "Consumidor Final",
      subtotal: venta.subtotal,
      descuento: venta.descuento,
      total: venta.total,
      cantidadItems: venta.detalles.length,
      unidadesTotales: venta.detalles.reduce(
        (acc, item) => acc + item.cantidad,
        0
      ),
    }));

    res.json(resultado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error obteniendo historial de ventas" });
  }
});

app.get("/ventas/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const venta = await prisma.venta.findUnique({
      where: {
        id: Number(id),
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

    if (!venta) {
      return res.status(404).json({ error: "Venta no encontrada" });
    }

    res.json(venta);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error obteniendo detalle de venta" });
  }
});

//////////////////////////////////////////////////////////////

const PORT = 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API lista en http://localhost:${PORT}`);
});