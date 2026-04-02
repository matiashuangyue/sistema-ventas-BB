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











//////////////////////////////////////////////////////////////

const PORT = 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API lista en http://localhost:${PORT}`);
});