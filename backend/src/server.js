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
    const { clienteId = null, listaPrecioId, descuento = 0, items } = req.body;

    if (!listaPrecioId) {
      return res.status(400).json({ error: "Debe indicar una lista de precio" });
    }

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
        const variante = await tx.variante.findUnique({
          where: { id: item.varianteId },
        });

        if (!variante) {
          throw new Error("Variante no encontrada");
        }

        if (variante.stock < item.cantidad) {
          throw new Error(`Stock insuficiente para ${variante.nombre}`);
        }

        // 👉 buscar precio según lista
        const precioData = await tx.precioVariante.findFirst({
          where: {
            varianteId: item.varianteId,
            listaPrecioId,
          },
        });

        if (!precioData) {
          throw new Error(`No hay precio para ${variante.nombre} en esta lista`);
        }

        const precioUnitario = precioData.precio;
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
        throw new Error("Descuento mayor al subtotal");
      }

      const total = subtotal - descuento;

      const ventaFinal = await tx.venta.update({
        where: { id: nuevaVenta.id },
        data: {
          subtotal,
          total,
        },
        include: {
          detalles: {
            include: {
              variante: {
                include: { producto: true },
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
    res.status(400).json({ error: error.message });
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



















//////////////////////////////////////////////////////////////

const PORT = 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API lista en http://localhost:${PORT}`);
});