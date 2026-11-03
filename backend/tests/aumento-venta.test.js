const assert = require("node:assert/strict");
const { beforeEach, test } = require("node:test");

// Servicio y repositorio reales con una base transaccional en memoria.
let estado;
let transacciones;
const prismaDoble = {
  async $transaction(callback) {
    transacciones += 1;
    const anterior = structuredClone(estado);
    try { return await callback(prismaDoble); }
    catch (error) { estado = anterior; throw error; }
  },
  async $queryRaw() { return []; },
  venta: {
    async create({ data }) {
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
    async findUnique({ where }) {
      const variante = estado.variantes.find(({ id }) => id === where.id);
      return variante ? structuredClone(variante) : null;
    },
    async updateMany({ where, data }) {
      const variante = estado.variantes.find(({ id }) => id === where.id);
      if (!variante || variante.stock < where.stock.gte) return { count: 0 };
      variante.stock += data.stock.increment;
      return { count: 1 };
    },
  },
  precioVariante: {
    async findMany({ where }) {
      return structuredClone(estado.precios
        .filter((p) => p.varianteId === where.varianteId && p.cantidadMinima <= where.cantidadMinima.lte)
        .sort((a, b) => b.cantidadMinima - a.cantidadMinima));
    },
    async update() { assert.fail("El aumento no modifica la lista de precios"); },
    async updateMany() { assert.fail("El aumento no modifica la lista de precios"); },
  },
  ventaDetalle: {
    async create({ data }) {
      const detalle = { id: estado.detalles.length + 1, ...data };
      estado.detalles.push(detalle);
      return structuredClone(detalle);
    },
  },
  cobro: {
    async create({ data }) {
      estado.cobros.push(data);
      return structuredClone(data);
    },
  },
};

const prismaPath = require.resolve("../src/lib/prisma");
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: prismaDoble };
const service = require("../src/modules/ventas/services/ventas.service");
const CrearVentaDto = require("../src/modules/ventas/models/dtos/crear-venta.dto");

beforeEach(() => {
  transacciones = 0;
  estado = {
    venta: null, detalles: [], cobros: [],
    variantes: [
      { id: 1, nombre: "Producto A", stock: 20 },
      { id: 2, nombre: "Producto B", stock: 20 },
    ],
    precios: [
      { varianteId: 1, cantidadMinima: 1, precio: 100.05 },
      { varianteId: 1, cantidadMinima: 6, precio: 80.15 },
      { varianteId: 2, cantidadMinima: 1, precio: 1.15 },
    ],
  };
});

function ventaCon(cambios = {}) {
  return CrearVentaDto.from({
    clienteId: 4, descuento: 0,
    items: [{ varianteId: 1, cantidad: 2 }],
    ...cambios,
  });
}

test("el aumento fraccionario queda en cada precio e importe respetando escalas, descuento y pago parcial", async () => {
  const precios = structuredClone(estado.precios);
  const venta = await service.crearVenta(ventaCon({
    aumentoPorcentaje: "12.5", descuento: 10,
    formaPago: "TRANSFERENCIA", montoPagado: 100,
    items: [{ varianteId: 1, cantidad: 6 }, { varianteId: 2, cantidad: 3 }],
  }));
  assert.deepEqual(venta.detalles.map(({ precioUnitario, subtotal }) => [precioUnitario, subtotal]),
    [[90.17, 541.02], [1.29, 3.87]]);
  assert.equal(venta.subtotal, 544.89);
  assert.equal(venta.total, 534.89);
  assert.equal(venta.montoPagado, 100);
  assert.equal(venta.saldoPendiente, 434.89);
  assert.equal(venta.estadoPago, "PARCIAL");
  assert.equal(venta.cobros[0].monto, 100);
  assert.deepEqual(estado.variantes.map(({ stock }) => stock), [14, 17]);
  assert.deepEqual(estado.precios, precios);
});

test("redondea el precio unitario antes de multiplicar por cantidad y deja deuda por el total de las lineas", async () => {
  const venta = await service.crearVenta(ventaCon({
    aumentoPorcentaje: 10, items: [{ varianteId: 2, cantidad: 3 }],
  }));
  assert.equal(venta.detalles[0].precioUnitario, 1.27);
  assert.equal(venta.detalles[0].subtotal, 3.81);
  assert.equal(venta.subtotal, 3.81);
  assert.equal(venta.total, 3.81);
  assert.equal(venta.saldoPendiente, 3.81);
  assert.equal(venta.formaPago, "CUENTA_CORRIENTE");
  assert.deepEqual(venta.cobros, []);
});

test("aplica una sola vez sobre precios manuales y respeta el precio cero", async () => {
  const dto = ventaCon({
    aumentoPorcentaje: 25,
    items: [
      { varianteId: 1, cantidad: 2, precioEditado: "40" },
      { varianteId: 2, cantidad: 3, precioEditado: 0 },
    ],
  });
  const original = structuredClone(dto);
  const venta = await service.crearVenta(dto);
  assert.deepEqual(venta.detalles.map(({ precioUnitario, subtotal }) => [precioUnitario, subtotal]),
    [[50, 100], [0, 0]]);
  assert.equal(venta.total, 100);
  assert.deepEqual(structuredClone(dto), original, "El calculo no reemplaza los precios base recibidos");
});

for (const aumentoPorcentaje of [undefined, 0, "0"]) {
  test(`sin aumento (${String(aumentoPorcentaje)}) conserva los precios y calcula pago completo`, async () => {
    const venta = await service.crearVenta(ventaCon({ aumentoPorcentaje, formaPago: "EFECTIVO" }));
    assert.equal(venta.detalles[0].precioUnitario, 100.05);
    assert.equal(venta.total, 200.1);
    assert.equal(venta.montoPagado, 200.1);
    assert.equal(venta.saldoPendiente, 0);
    assert.equal(venta.cobros[0].monto, 200.1);
  });
}

test("admite porcentajes mayores a 100 sin tratarlos como descuentos", async () => {
  const venta = await service.crearVenta(ventaCon({ aumentoPorcentaje: 150 }));
  assert.equal(venta.detalles[0].precioUnitario, 250.13);
  assert.equal(venta.total, 500.26);
});

test("rechaza porcentajes invalidos antes de abrir una transaccion", async () => {
  const anterior = structuredClone(estado);
  for (const aumentoPorcentaje of [null, "", " ", true, false, [], [10], {}, -1, "-2", NaN, Infinity, "Infinity", "diez"]) {
    await assert.rejects(service.crearVenta(ventaCon({ aumentoPorcentaje })), /aumento.*porcentaje/);
    assert.deepEqual(estado, anterior);
  }
  assert.equal(transacciones, 0);
});

test("rechaza precios manuales invalidos en lugar de descartarlos silenciosamente", async () => {
  const anterior = structuredClone(estado);
  for (const precioEditado of ["", " ", true, false, [], [10], {}, -1, NaN, Infinity, "Infinity", Number.MAX_VALUE]) {
    await assert.rejects(service.crearVenta(ventaCon({
      aumentoPorcentaje: 10, items: [{ varianteId: 1, cantidad: 2, precioEditado }],
    })), /precio editado/);
    assert.deepEqual(estado, anterior);
  }
  assert.equal(transacciones, 0);
});

test("importes fuera del rango seguro revierten venta, detalles y stock", async () => {
  const anterior = structuredClone(estado);
  await assert.rejects(service.crearVenta(ventaCon({ aumentoPorcentaje: Number.MAX_VALUE })), /importe de producto invalido/);
  assert.deepEqual(estado, anterior);
  await assert.rejects(service.crearVenta(ventaCon({
    items: [{ varianteId: 1, cantidad: 2, precioEditado: 50000000000000 }],
  })), /importe de producto invalido/);
  assert.deepEqual(estado, anterior);
  await assert.rejects(service.crearVenta(ventaCon({
    items: [
      { varianteId: 1, cantidad: 1, precioEditado: 50000000000000 },
      { varianteId: 2, cantidad: 1, precioEditado: 50000000000000 },
    ],
  })), /Subtotal invalido/);
  assert.deepEqual(estado, anterior);
});

test("redondea el total como la vista previa cuando el descuento tiene fracciones de centavo", async () => {
  const venta = await service.crearVenta(ventaCon({
    aumentoPorcentaje: 0, descuento: 0.025,
    formaPago: "EFECTIVO", montoPagado: 0.01,
    items: [{ varianteId: 1, cantidad: 1, precioEditado: 0.03 }],
  }));
  assert.equal(venta.subtotal, 0.03);
  assert.equal(venta.total, 0.01);
  assert.equal(venta.montoPagado, 0.01);
  assert.equal(venta.saldoPendiente, 0);
  assert.equal(venta.estadoPago, "PAGADA");
  assert.equal(venta.cobros[0].monto, 0.01);
});

test("rechaza descuento o pago mayores al total aumentado sin dejar movimientos", async () => {
  const anterior = structuredClone(estado);
  await assert.rejects(service.crearVenta(ventaCon({ aumentoPorcentaje: 10, descuento: 221 })), /descuento no puede ser mayor/);
  assert.deepEqual(estado, anterior);
  await assert.rejects(service.crearVenta(ventaCon({ aumentoPorcentaje: 10, formaPago: "EFECTIVO", montoPagado: 221 })), /monto pagado no puede superar/);
  assert.deepEqual(estado, anterior);
});
