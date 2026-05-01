const createApp = require("./app");
const env = require("./config/env");
const listasPrecioService = require("./modules/listas-precio/services/listas-precio.service");

const app = createApp();

app.listen(env.port, "0.0.0.0", async () => {
  console.log(`API lista en http://localhost:${env.port}`);
  await listasPrecioService.inicializarListasPrecio();
});
