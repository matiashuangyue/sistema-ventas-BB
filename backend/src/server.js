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

    if (!nombre) {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    // Verificar si ya existe un producto ACTIVO con el mismo nombre
    const existente = await prisma.producto.findFirst({
      where: {
        nombre: nombre.trim(),
        activo: true,
      },
    });

    if (existente) {
      return res.status(400).json({ error: "Ya existe un producto activo con ese nombre. Si querés agregar una variante, usá el producto existente." });
    }

    const producto = await prisma.producto.create({
      data: {
        nombre: nombre.trim(),
        categoria,
        activo: true, // por defecto
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
      where: {activo: true},
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

    // Validar datos obligatorios
    if (!nombre || !productoId) {
      return res.status(400).json({ error: "Faltan datos: nombre y productoId son obligatorios" });
    }

    // Verificar si ya existe una variante con el mismo nombre para ese producto
    const varianteExistente = await prisma.variante.findFirst({
      where: {
        nombre: nombre.trim(),
        productoId: Number(productoId),
      },
    });

    if (varianteExistente) {
      return res.status(400).json({ error: "Ya existe una variante con ese nombre para este producto. Usá la existente o cambiá el nombre." });
    }

    // Crear la nueva variante
    const variante = await prisma.variante.create({
      data: {
        nombre: nombre.trim(),
        stock: stock ?? 0,
        stockMinimo: stockMinimo ?? 0,
        productoId: Number(productoId),
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
app.put("/variantes/:id/stock", async (req, res) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;

    if (stock == null) {
      return res.status(400).json({ error: "Stock inválido" });
    }

    const varianteActual = await prisma.variante.findUnique({
      where: { id: Number(id) },
    });

    if (!varianteActual) {
      return res.status(404).json({ error: "Variante no encontrada" });
    }

    const nuevoStock = Number(stock);
    if (nuevoStock < 0) {
      return res.status(400).json({ error: "El stock no puede quedar negativo" });
    }

    const variante = await prisma.variante.update({
      where: { id: Number(id) },
      data: { stock: nuevoStock },
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
    },
  {timeout: 600000}
);

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

// 👉 registrar usuario (CON CÓDIGO DE INVITACIÓN)
app.post("/auth/register", async (req, res) => {
  try {
    const { nombre, username, password, email, rol, codigoInvitacion } = req.body;
    const nombreNormalizado = typeof nombre === "string" ? nombre.trim() : "";
    const usernameNormalizado =
      typeof username === "string" ? username.trim().toLowerCase() : "";
    const emailNormalizado =
      typeof email === "string" ? email.trim().toLowerCase() : "";
    const codigoInvitacionNormalizado =
      typeof codigoInvitacion === "string" ? codigoInvitacion.trim() : "";

    // 1. CLAVE MAESTRA (Cambiá esto por lo que quieras)
    const CODIGO_CORRECTO = "BB2026_PRO"; 

    if (codigoInvitacionNormalizado !== CODIGO_CORRECTO) {
      return res.status(401).json({ error: "Código de invitación incorrecto. Acceso denegado." });
    }

    // 2. Validación de campos obligatorios (incluido email)
    if (!nombreNormalizado || !usernameNormalizado || !password || !emailNormalizado) {
      return res.status(400).json({ error: "Faltan datos obligatorios (nombre, usuario, email y clave)" });
    }

    // 3. Verificar si el usuario o el email ya existen
    const existeUsuario = await prisma.usuario.findFirst({
      where: { username: { equals: usernameNormalizado, mode: "insensitive" } },
    });
    const existeEmail = await prisma.usuario.findFirst({
      where: { email: { equals: emailNormalizado, mode: "insensitive" } },
    });

    if (existeUsuario) return res.status(400).json({ error: "El nombre de usuario ya está en uso" });
    if (existeEmail) return res.status(400).json({ error: "El correo electrónico ya está registrado" });

    // 4. Encriptar contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // 5. Crear usuario en la base de datos
    const usuario = await prisma.usuario.create({
      data: {
        nombre: nombreNormalizado,
        username: usernameNormalizado,
        email: emailNormalizado,
        password: passwordHash,
        rol: rol || "admin",
      },
    });

    // 6. Respuesta (sin mandar la contraseña por seguridad)
    res.json({
      id: usuario.id,
      nombre: usuario.nombre,
      username: usuario.username,
      email: usuario.email,
      rol: usuario.rol,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno al registrar usuario" });
  }
});

// 👉 login
app.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const usernameNormalizado =
      typeof username === "string" ? username.trim().toLowerCase() : "";

    const usuario = await prisma.usuario.findFirst({
      where: {
        username: { equals: usernameNormalizado, mode: "insensitive" },
      },
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

async function inicializarListasPrecio() {
  try {
    const listas = ["Lista 1", "Lista 2", "Lista 3"];

    for (const nombre of listas) {
      const existente = await prisma.listaPrecio.findFirst({
        where: { nombre },
      });

      if (!existente) {
        await prisma.listaPrecio.create({
          data: {
            nombre,
            activa: true,
          },
        });
      }
    }

    console.log("✅ Listas de precio inicializadas");
  } catch (error) {
    console.error("❌ Error inicializando listas:", error);
  }
}

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
    const { nombre, email, telefono, direccion, localidad, cuit, observaciones } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    const cliente = await prisma.cliente.create({
      data: {
        nombre,
        email, // 👈 Agregado
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
    res.status(500).json({ error: "Error creando cliente. Tal vez el email ya existe." });
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

    res.json(clientes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error buscando clientes" });
  }
});

app.put("/clientes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, telefono, direccion, localidad, cuit, observaciones } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    const cliente = await prisma.cliente.update({
      where: { id: Number(id) },
      data: {
        nombre,
        email, // 👈 Agregado
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
    res.status(500).json({ error: "Error actualizando cliente" });
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
app.get("/reportes/dashboard", async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const filtroFecha = {};

    if (desde || hasta) {
      filtroFecha.fecha = {};
      if (desde) filtroFecha.fecha.gte = new Date(`${desde}T00:00:00.000Z`);
      if (hasta) filtroFecha.fecha.lte = new Date(`${hasta}T23:59:59.999Z`);
    }

    // 1. Métricas del período
    const stats = await prisma.venta.aggregate({
      where: filtroFecha,
      _sum: { total: true },
      _count: { id: true }
    });

    // 2. Ranking de Clientes en el período
    const clientesTopRaw = await prisma.venta.groupBy({
      by: ['clienteId'],
      where: filtroFecha,
      _sum: { total: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 5
    });

    const rankingClientes = await Promise.all(
      clientesTopRaw.map(async (c) => {
        const nombre = c.clienteId 
          ? (await prisma.cliente.findUnique({ where: { id: c.clienteId } }))?.nombre 
          : "Consumidor Final";
        return { nombre: nombre || "Desconocido", total: c._sum.total };
      })
    );

    // 3. Top Productos en el período
    const topProdsRaw = await prisma.ventaDetalle.groupBy({
      by: ['varianteId'],
      where: { venta: filtroFecha },
      _sum: { cantidad: true, subtotal: true },
      orderBy: { _sum: { cantidad: 'desc' } },
      take: 5
    });

    const topProductos = await Promise.all(
      topProdsRaw.map(async (item) => {
        const v = await prisma.variante.findUnique({
          where: { id: item.varianteId },
          include: { producto: true }
        });
        return { 
          nombre: `${v?.producto?.nombre} ${v?.nombre}`, 
          cantidad: item._sum.cantidad,
          total: item._sum.subtotal
        };
      })
    );

    res.json({
      resumen: {
        total: stats._sum.total || 0,
        cantidad: stats._count.id || 0,
        promedio: stats._count.id > 0 ? (stats._sum.total / stats._count.id) : 0
      },
      rankingClientes,
      topProductos
    });
  } catch (error) {
    res.status(500).json({ error: "Error en reportes" });
  }
});





//////////////////////////////////////////////////////////////

const PORT = 8080;

app.listen(PORT, "0.0.0.0", async () => {
  console.log(`API lista en http://localhost:${PORT}`);
  await inicializarListasPrecio();
});
