const assert = require("node:assert/strict");
const { beforeEach, test } = require("node:test");

// Se ejercita el servicio y el repositorio reales sin abrir la base configurada.
let estado;
let operaciones;
let esperaBloqueo;
const prismaDoble = {
  async $transaction(callback) {
    const anterior = structuredClone(estado);
    try {
      return await callback(prismaDoble);
    } catch (error) {
      estado = anterior;
      throw error;
    }
  },
  async $queryRaw(strings, ...values) {
    operaciones.push({ tipo: "bloqueo", sql: strings.join("?"), values });
    if (esperaBloqueo) await esperaBloqueo;
    return [{ id: values[0] }];
  },
  venta: {
    async create({ data }) {
      operaciones.push({ tipo: "venta" });
      estado.venta = { id: 1, ...data };
      return structuredClone(estado.venta);
    },
    async update({ data }) {
      Object.assign(estado.venta, data);
      return structuredClone(estado.venta);
    },
    async findUnique() {
      return structuredClone({ ...estado.venta, detalles: estado.detalles, cobros: estado.cobros });
    },
  },
  variante: {
    async findUnique() {
      return { id: 1, nombre: "Producto de prueba", stock: estado.stock };
    },
    async updateMany({ where, data }) {
      operaciones.push({ tipo: "stock" });
      if (estado.stock < where.stock.gte) return { count: 0 };
      estado.stock += data.stock.increment;
      return { count: 1 };
    },
  },
  precioVariante: {
    async findMany() { return [{ precio: 125.55 }]; },
  },
  ventaDetalle: {
    async create({ data }) {
      estado.detalles.push(data);
      return data;
    },
  },
  cobro: {
    async create({ data }) {
      estado.cobros.push(data);
      return data;
    },
  },
};

const prismaPath = require.resolve("../src/lib/prisma");
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: prismaDoble };
const service = require("../src/modules/ventas/services/ventas.service");
const CrearVentaDto = require("../src/modules/ventas/models/dtos/crear-venta.dto");

beforeEach(() => {
  estado = { venta: null, detalles: [], cobros: [], stock: 10 };
  operaciones = [];
  esperaBloqueo = null;
});

function ventaCon(cambios = {}) {
  return CrearVentaDto.from({
    clienteId: 4,
    descuento: 10,
    items: [{ varianteId: 1, cantidad: 2 }],
    ...cambios,
  });
}

test("una venta sin forma de pago queda en cuenta corriente, sin generar cobro", async () => {
  const venta = await service.crearVenta(ventaCon());
  assert.equal(venta.formaPago, "CUENTA_CORRIENTE");
  assert.equal(venta.total, 241.1);
  assert.equal(venta.saldoPendiente, 241.1);
  assert.equal(venta.montoPagado, 0);
  assert.equal(venta.estadoPago, "PENDIENTE");
  assert.equal(venta.clienteId, 4);
  assert.deepEqual(venta.cobros, []);
  assert.equal(estado.stock, 8, "La venta sigue descontando el stock al confirmarse");
  assert.equal(operaciones[0].tipo, "bloqueo", "Se bloquea el cliente antes de crear venta o tocar stock");
  assert.equal(operaciones[0].sql, 'SELECT "id" FROM "Cliente" WHERE "id" = ? FOR NO KEY UPDATE');
  assert.deepEqual(operaciones[0].values, [4]);
});

test("elegir efectivo explícitamente sigue registrando el pago completo", async () => {
  const venta = await service.crearVenta(ventaCon({ formaPago: "EFECTIVO" }));
  assert.equal(venta.formaPago, "EFECTIVO");
  assert.equal(venta.montoPagado, 241.1);
  assert.equal(venta.saldoPendiente, 0);
  assert.equal(venta.estadoPago, "PAGADA");
  assert.equal(venta.cobros.length, 1);
  assert.equal(venta.cobros[0].monto, 241.1);
});

test("un medio explícito permite registrar una entrega parcial", async () => {
  const venta = await service.crearVenta(ventaCon({ formaPago: "TRANSFERENCIA", montoPagado: 100 }));
  assert.equal(venta.formaPago, "TRANSFERENCIA");
  assert.equal(venta.montoPagado, 100);
  assert.equal(venta.saldoPendiente, 141.1);
  assert.equal(venta.estadoPago, "PARCIAL");
  assert.equal(venta.cobros[0].monto, 100);
});

test("la cuenta corriente predeterminada exige cliente y revierte venta y stock al rechazar", async () => {
  const original = structuredClone(estado);
  await assert.rejects(service.crearVenta(ventaCon({ clienteId: null })), /seleccionar un cliente/);
  assert.deepEqual(estado, original);
});

test("la cuenta corriente predeterminada rechaza cobros iniciales inconsistentes", async () => {
  const original = structuredClone(estado);
  await assert.rejects(service.crearVenta(ventaCon({ montoPagado: 100 })), /cuenta corriente no puede registrar monto pagado/);
  assert.deepEqual(estado, original);
});

test("el monto vacío recibido desde un formulario se interpreta como pendiente", async () => {
  const venta = await service.crearVenta(ventaCon({ montoPagado: "" }));
  assert.equal(venta.montoPagado, 0);
  assert.equal(venta.saldoPendiente, 241.1);
  assert.deepEqual(venta.cobros, []);
});

test("una venta pagada sin cliente no intenta bloquear una cuenta", async () => {
  const venta = await service.crearVenta(ventaCon({ clienteId: null, formaPago: "EFECTIVO" }));
  assert.equal(venta.saldoPendiente, 0);
  assert.equal(venta.montoPagado, 241.1);
  assert.ok(operaciones.every((operacion) => operacion.tipo !== "bloqueo"));
  assert.equal(estado.stock, 8);
});

test("el alta espera al movimiento de cuenta en curso antes de crear venta o descontar stock", async () => {
  let liberarCuenta;
  esperaBloqueo = new Promise((resolve) => { liberarCuenta = resolve; });
  const original = structuredClone(estado);
  const pendiente = service.crearVenta(ventaCon());
  await Promise.resolve();
  assert.deepEqual(estado, original);
  assert.deepEqual(operaciones.map(({ tipo }) => tipo), ["bloqueo"]);
  liberarCuenta();
  const venta = await pendiente;
  assert.equal(venta.saldoPendiente, 241.1);
  assert.equal(estado.stock, 8);
});
