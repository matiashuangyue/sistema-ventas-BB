const express = require("express");
const cors = require("cors");

const authController = require("./modules/auth/controllers/auth.controller");
const clientesController = require("./modules/clientes/controllers/clientes.controller");
const comprasController = require("./modules/compras/controllers/compras.controller");
const listasPrecioController = require("./modules/listas-precio/controllers/listas-precio.controller");
const preciosVariantesController = require("./modules/precios-variantes/controllers/precios-variantes.controller");
const productosController = require("./modules/productos/controllers/productos.controller");
const reportesController = require("./modules/reportes/controllers/reportes.controller");
const variantesController = require("./modules/variantes/controllers/variantes.controller");
const ventasController = require("./modules/ventas/controllers/ventas.controller");

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/", (req, res) => {
    res.send("API funcionando");
  });

  app.use("/auth", authController);
  app.use("/clientes", clientesController);
  app.use("/compras", comprasController);
  app.use("/listas-precio", listasPrecioController);
  app.use("/precios-variantes", preciosVariantesController);
  app.use("/productos", productosController);
  app.use("/reportes", reportesController);
  app.use("/variantes", variantesController);
  app.use("/ventas", ventasController);

  return app;
}

module.exports = createApp;
