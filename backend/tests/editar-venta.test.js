const assert = require("node:assert/strict");
const { beforeEach, test } = require("node:test");

// Los repositorios reales trabajan sobre este doble en memoria. Nunca se abre
// la base configurada en .env; cada transaccion restaura su estado ante un error.
let estado;
let consultas;
let fallarAlGuardar;
let rechazarStock;

function detalleCompleto(detalle) {
  return { ...structuredClone(detalle), variante: structuredClone(estado.variantes[detalle.varianteId]) };
}

function ventaCompleta(id) {
  if (estado.venta?.id !== id) return null;
  return structuredClone({
    ...estado.venta,
    cliente: estado.venta.clienteId ? estado.cliente : null,
    detalles: estado.detalles.map(detalleCompleto),
    cobros: estado.cobros,
  });
}

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
    consultas.push({ tipo: "lock", sql: strings.join("?"), values });
    return estado.venta ? [{ id: estado.venta.id }] : [];
  },
  venta: {
    async findUnique({ where }) {
      consultas.push({ tipo: "leerVenta", id: where.id });
      return ventaCompleta(where.id);
    },
    async update({ where, data }) {
      assert.equal(where.id, estado.venta.id);
      if (fallarAlGuardar) throw new Error("Fallo simulado de persistencia");
      Object.assign(estado.venta, data);
      return ventaCompleta(where.id);
    },
  },
  variante: {
    async findUnique({ where }) {
      return structuredClone(estado.variantes[where.id] || null);
    },
    async updateMany({ where, data }) {
      consultas.push({ tipo: "stock", where: structuredClone(where), data: structuredClone(data) });
      const variante = estado.variantes[where.id];
      if (!variante || rechazarStock === where.id) return { count: 0 };
      if (where.stock?.gte != null && variante.stock < where.stock.gte) return { count: 0 };
      if (where.activo && !variante.activo) return { count: 0 };
      if (where.producto?.activo && !variante.producto.activo) return { count: 0 };
      variante.stock += data.stock.increment ?? -data.stock.decrement;
      return { count: 1 };
    },
  },
  ventaDetalle: {
    async create({ data }) {
      const detalle = { id: estado.siguienteDetalle++, descuentoItem: null, ...data };
      estado.detalles.push(detalle);
      return structuredClone(detalle);
    },
    async update({ where, data }) {
      const detalle = estado.detalles.find((item) => item.id === where.id);
      assert.ok(detalle, "Se modifica un detalle existente de la venta");
      Object.assign(detalle, data);
      return structuredClone(detalle);
    },
    async deleteMany({ where }) {
      const antes = estado.detalles.length;
      estado.detalles = estado.detalles.filter((item) => {
        if (item.ventaId !== where.ventaId) return true;
        if (where.id?.notIn) return where.id.notIn.includes(item.id);
        if (where.id?.in) return !where.id.in.includes(item.id);
        return false;
      });
      return { count: antes - estado.detalles.length };
    },
  },
  cobro: {
    async create() { assert.fail("Editar productos no debe generar cobros"); },
    async deleteMany() { assert.fail("Editar productos no debe borrar cobros"); },
  },
  cliente: {
    async findUnique({ where }) {
      if (where.id !== estado.cliente.id) return null;
      return { ...structuredClone(estado.cliente), ventas: [ventaCompleta(estado.venta.id)] };
    },
    async findMany() {
      return [{ ...structuredClone(estado.cliente), ventas: [ventaCompleta(estado.venta.id)] }];
    },
  },
};

const prismaPath = require.resolve("../src/lib/prisma");
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: prismaDoble };
const service = require("../src/modules/ventas/services/ventas.service");
const cobranzasService = require("../src/modules/cobranzas/services/cobranzas.service");
const ActualizarVentaDto = require("../src/modules/ventas/models/dtos/actualizar-venta.dto");
const router = require("../src/modules/ventas/controllers/ventas.controller");

beforeEach(() => {
  consultas = [];
  fallarAlGuardar = false;
  rechazarStock = null;
  estado = {
    cliente: { id: 4, nombre: "Cliente de prueba", telefono: "123", localidad: "Rosario" },
    venta: {
      id: 20, clienteId: 4, fecha: new Date("2026-10-20T14:00:00Z"),
      createdAt: new Date("2026-10-20T14:00:00Z"), subtotal: 350,
      descuento: 10, total: 340, montoPagado: 100, saldoPendiente: 240,
      estadoPago: "PARCIAL", formaPago: "CUENTA_CORRIENTE", observacionesPago: "Entrega inicial",
    },
    detalles: [
      { id: 101, ventaId: 20, varianteId: 1, cantidad: 2, precioUnitario: 100, subtotal: 200, descuentoItem: null },
      { id: 102, ventaId: 20, varianteId: 2, cantidad: 3, precioUnitario: 50, subtotal: 150, descuentoItem: null },
    ],
    variantes: Object.fromEntries([[1, 0], [2, 5], [3, 4]].map(([id, stock]) => [id, {
      id, stock, nombre: `Variante ${id}`, activo: true,
      producto: { id, nombre: `Producto ${id}`, activo: true },
    }])),
    cobros: [
      { id: 7, ventaId: 20, clienteId: 4, monto: 40, fecha: new Date("2026-10-21T15:00:00Z"), formaPago: "EFECTIVO", observaciones: "Primera entrega" },
      { id: 8, ventaId: 20, clienteId: 4, monto: 60, fecha: new Date("2026-10-22T16:00:00Z"), formaPago: "TRANSFERENCIA", observaciones: "Segunda entrega" },
    ],
    siguienteDetalle: 103,
  };
});

async function borrador(cambios = {}) {
  const venta = await service.obtenerVentaPorId(20);
  return ActualizarVentaDto.from({
    version: venta.versionEdicion,
    descuento: venta.descuento,
    items: venta.detalles.map(({ id: detalleId, varianteId, cantidad, precioUnitario }) => ({
      detalleId, varianteId, cantidad, precioUnitario,
    })),
    ...cambios,
  });
}

test("agregar, quitar y cambiar cantidades actualiza stock y cuenta sin alterar cobros ni identidad", async () => {
  const original = structuredClone(estado);
  const dto = await borrador({ items: [
    { detalleId: 101, varianteId: 1, cantidad: 1, precioUnitario: 100 },
    { varianteId: 3, cantidad: 2, precioUnitario: 75 },
  ] });
  consultas = [];
  const venta = await service.actualizarVenta("20", dto);
  assert.equal(venta.total, 240);
  assert.equal(venta.subtotal, 250);
  assert.equal(venta.descuento, 10);
  assert.equal(venta.montoPagado, 100);
  assert.equal(venta.saldoPendiente, 140);
  assert.equal(venta.estadoPago, "PARCIAL");
  assert.equal(venta.id, 20);
  assert.equal(venta.clienteId, 4);
  assert.deepEqual(venta.fecha, original.venta.fecha);
  assert.equal(venta.formaPago, original.venta.formaPago);
  assert.equal(venta.observacionesPago, original.venta.observacionesPago);
  assert.deepEqual(venta.cobros, original.cobros);
  assert.equal(venta.detalles.find((item) => item.varianteId === 1).id, 101);
  assert.ok(!venta.detalles.some((item) => item.id === 102));
  assert.deepEqual(Object.values(estado.variantes).map(({ stock }) => stock), [1, 8, 2]);
  assert.equal(consultas[0].tipo, "lock", "Se bloquea la venta antes de leer pagos y detalles");
  assert.notEqual(venta.versionEdicion, dto.version);

  const cuenta = await cobranzasService.obtenerCuentaCorriente(4);
  assert.equal(cuenta.resumen.totalVendido, 240);
  assert.equal(cuenta.resumen.totalCobrado, 100);
  assert.equal(cuenta.resumen.saldoPendiente, 140);
  assert.equal(cuenta.movimientos.at(-1).saldo, 140);
  assert.equal(cuenta.ventasPendientes[0].detalles.length, 2);
});

test("conserva una linea sin stock disponible y su precio historico", async () => {
  const anterior = structuredClone(estado);
  const venta = await service.actualizarVenta(20, await borrador());
  assert.equal(venta.detalles.find((item) => item.id === 101).precioUnitario, 100);
  assert.equal(venta.total, anterior.venta.total);
  assert.deepEqual(estado.variantes, anterior.variantes);
});

test("una venta todavia no entregada ni cobrada ajusta toda la deuda al quitar y agregar productos", async () => {
  estado.venta.montoPagado = 0;
  estado.venta.saldoPendiente = 340;
  estado.venta.estadoPago = "PENDIENTE";
  estado.cobros = [];
  const venta = await service.actualizarVenta(20, await borrador({ items: [
    { detalleId: 101, varianteId: 1, cantidad: 1, precioUnitario: 100 },
    { varianteId: 3, cantidad: 2, precioUnitario: 75 },
  ] }));
  assert.equal(venta.total, 240);
  assert.equal(venta.montoPagado, 0);
  assert.equal(venta.saldoPendiente, 240);
  assert.equal(venta.estadoPago, "PENDIENTE");
  assert.deepEqual(venta.cobros, []);
  const cuenta = await cobranzasService.obtenerCuentaCorriente(4);
  assert.equal(cuenta.resumen.saldoPendiente, 240);
  assert.equal(cuenta.movimientos.at(-1).saldo, 240);
  assert.equal(cuenta.movimientos.length, 1);
});

test("suma variantes repetidas para validar el stock y revierte todo si no alcanza", async () => {
  const anterior = structuredClone(estado);
  const dto = await borrador({ items: [
    { detalleId: 101, varianteId: 1, cantidad: 2, precioUnitario: 100 },
    { varianteId: 1, cantidad: 1, precioUnitario: 100 },
  ] });
  await assert.rejects(service.actualizarVenta(20, dto), { statusCode: 400 });
  assert.deepEqual(estado, anterior);
});

test("permite lineas de una misma variante cuando la cantidad conjunta cabe en el stock", async () => {
  const venta = await service.actualizarVenta(20, await borrador({ descuento: 0, items: [
    { detalleId: 101, varianteId: 1, cantidad: 1, precioUnitario: 100 },
    { varianteId: 1, cantidad: 1, precioUnitario: 90 },
  ] }));
  assert.equal(venta.total, 190);
  assert.equal(estado.variantes[1].stock, 0);
  assert.equal(estado.variantes[2].stock, 8);
});

test("mantiene un producto desactivado o permite reducirlo, pero no agregar unidades", async () => {
  estado.variantes[1].activo = false;
  estado.variantes[1].stock = 4;
  await service.actualizarVenta(20, await borrador());
  const dto = await borrador();
  dto.items[0].cantidad = 1;
  await service.actualizarVenta(20, dto);
  const anterior = structuredClone(estado);
  const aumento = await borrador();
  aumento.items[0].cantidad = 2;
  await assert.rejects(service.actualizarVenta(20, aumento), { statusCode: 400 });
  assert.deepEqual(estado, anterior);
});

test("un fallo al persistir deshace tanto el detalle como los movimientos de stock", async () => {
  const anterior = structuredClone(estado);
  const dto = await borrador({ items: [{ varianteId: 3, cantidad: 2, precioUnitario: 100 }] });
  fallarAlGuardar = true;
  await assert.rejects(service.actualizarVenta(20, dto), /Fallo simulado/);
  assert.deepEqual(estado, anterior);
});

test("un rechazo del decremento atomico por stock concurrente no deja cambios parciales", async () => {
  const anterior = structuredClone(estado);
  const dto = await borrador({ items: [{ varianteId: 3, cantidad: 2, precioUnitario: 100 }] });
  rechazarStock = 3;
  await assert.rejects(service.actualizarVenta(20, dto), { statusCode: 400 });
  assert.deepEqual(estado, anterior);
  const intento = consultas.find((consulta) => consulta.tipo === "stock" && consulta.where.id === 3);
  assert.equal(intento.where.stock.gte, 2, "La condicion de stock participa del UPDATE");
});

test("rechaza una edicion antigua despues de guardar otra", async () => {
  const viejo = await borrador();
  const actual = await borrador({ descuento: 20 });
  await service.actualizarVenta(20, actual);
  const anterior = structuredClone(estado);
  await assert.rejects(service.actualizarVenta(20, viejo), { statusCode: 409 });
  assert.deepEqual(estado, anterior);
});

test("un cobro registrado despues de abrir el editor invalida la version", async () => {
  const dto = await borrador();
  estado.cobros.push({ id: 9, ventaId: 20, clienteId: 4, monto: 20, fecha: new Date("2026-10-23T16:00:00Z"), formaPago: "EFECTIVO" });
  estado.venta.montoPagado += 20;
  estado.venta.saldoPendiente -= 20;
  const anterior = structuredClone(estado);
  await assert.rejects(service.actualizarVenta(20, dto), { statusCode: 409 });
  assert.deepEqual(estado, anterior);
});

test("valida items, cantidades, importes, descuento y pertenencia del detalle", async () => {
  const base = await borrador();
  const casos = [
    { items: [] }, { items: null },
    { items: [{ ...base.items[0], cantidad: 0 }] },
    { items: [{ ...base.items[0], cantidad: -1 }] },
    { items: [{ ...base.items[0], cantidad: 1.5 }] },
    { items: [{ ...base.items[0], cantidad: Infinity }] },
    { items: [{ ...base.items[0], cantidad: "2" }] },
    { items: [{ ...base.items[0], cantidad: true }] },
    { items: [{ ...base.items[0], varianteId: -1 }] },
    { items: [{ ...base.items[0], varianteId: 1.5 }] },
    { items: [{ ...base.items[0], varianteId: 999 }] },
    { items: [{ ...base.items[0], precioUnitario: -1 }] },
    { items: [{ ...base.items[0], precioUnitario: Infinity }] },
    { items: [{ ...base.items[0], precioUnitario: NaN }] },
    { items: [{ ...base.items[0], precioUnitario: null }] },
    { items: [{ ...base.items[0], precioUnitario: "" }] },
    { items: [{ ...base.items[0], detalleId: 999 }] },
    { items: [{ ...base.items[0], detalleId: 102 }] },
    { items: [base.items[0], base.items[0]] },
    { descuento: -1 }, { descuento: Infinity }, { descuento: 351 }, { descuento: "0" },
  ];
  for (const cambios of casos) {
    const anterior = structuredClone(estado);
    await assert.rejects(service.actualizarVenta(20, { ...base, ...cambios }), { statusCode: 400 });
    assert.deepEqual(estado, anterior);
  }
});

test("rechaza una venta inexistente, IDs invalidos y la falta de version", async () => {
  const dto = await borrador();
  for (const id of [0, -1, 1.5, "abc", Infinity]) {
    await assert.rejects(service.actualizarVenta(id, dto), { statusCode: 400 });
  }
  await assert.rejects(service.actualizarVenta(999, dto), { statusCode: 404 });
  await assert.rejects(service.actualizarVenta(20, { ...dto, version: undefined }), { statusCode: 409 });
});

test("el DTO no permite cambiar cliente, fecha ni pagos mediante la edicion de productos", async () => {
  const original = structuredClone(estado.venta);
  const dto = await borrador({ clienteId: 99, fecha: "2026-01-01", montoPagado: 0, formaPago: "EFECTIVO" });
  assert.equal(dto.clienteId, undefined);
  assert.equal(dto.montoPagado, undefined);
  assert.equal(dto.fecha, undefined);
  assert.equal(dto.formaPago, undefined);
  const venta = await service.actualizarVenta(20, dto);
  assert.equal(venta.clienteId, original.clienteId);
  assert.equal(venta.montoPagado, original.montoPagado);
  assert.deepEqual(venta.fecha, original.fecha);
  assert.equal(venta.formaPago, original.formaPago);
});

test("recalcula montos monetarios sin arrastrar errores de punto flotante", async () => {
  estado.venta.montoPagado = 0;
  estado.cobros = [];
  const venta = await service.actualizarVenta(20, await borrador({ descuento: 0.1, items: [
    { detalleId: 101, varianteId: 1, cantidad: 1, precioUnitario: 0.1 },
    { detalleId: 102, varianteId: 2, cantidad: 1, precioUnitario: 0.2 },
  ] }));
  assert.equal(venta.subtotal, 0.3);
  assert.equal(venta.total, 0.2);
  assert.equal(venta.saldoPendiente, 0.2);
  assert.equal(venta.estadoPago, "PENDIENTE");
});

test("queda pagada cuando el nuevo total coincide con los cobros preservados", async () => {
  const venta = await service.actualizarVenta(20, await borrador({ descuento: 0, items: [
    { detalleId: 101, varianteId: 1, cantidad: 1, precioUnitario: 100 },
  ] }));
  assert.equal(venta.total, 100);
  assert.equal(venta.montoPagado, 100);
  assert.equal(venta.saldoPendiente, 0);
  assert.equal(venta.estadoPago, "PAGADA");
});

test("rechaza bajar el total por debajo de lo ya cobrado sin alterar los pagos", async () => {
  const anterior = structuredClone(estado);
  const dto = await borrador({ descuento: 0, items: [
    { detalleId: 102, varianteId: 2, cantidad: 1, precioUnitario: 50 },
  ] });
  await assert.rejects(service.actualizarVenta(20, dto), { statusCode: 400 });
  assert.deepEqual(estado, anterior);
});

test("una venta de total cero queda pagada y no genera movimientos de cobro", async () => {
  estado.venta.montoPagado = 0;
  estado.cobros = [];
  const venta = await service.actualizarVenta(20, await borrador({ descuento: 350 }));
  assert.equal(venta.total, 0);
  assert.equal(venta.saldoPendiente, 0);
  assert.equal(venta.estadoPago, "PAGADA");
  assert.deepEqual(venta.cobros, []);
});

test("sin cliente no crea deuda ni saldo a favor al cambiar el total", async () => {
  estado.venta.clienteId = null;
  estado.venta.montoPagado = 340;
  estado.venta.saldoPendiente = 0;
  estado.venta.estadoPago = "PAGADA";
  estado.cobros = [];
  for (const descuento of [0, 20]) {
    const anterior = structuredClone(estado);
    await assert.rejects(service.actualizarVenta(20, await borrador({ descuento })), { statusCode: 400 });
    assert.deepEqual(estado, anterior);
  }
  assert.equal((await service.actualizarVenta(20, await borrador())).saldoPendiente, 0);
});

test("PATCH /ventas/:id entrega la venta completa y propaga conflictos como 409", async () => {
  const ruta = router.stack.find((capa) => capa.route?.path === "/:id" && capa.route.methods.patch);
  assert.ok(ruta, "Existe PATCH /ventas/:id");
  const handler = ruta.route.stack[0].handle;
  const body = await borrador({ descuento: 20 });
  const respuesta = () => ({
    statusCode: 200,
    status(codigo) { this.statusCode = codigo; return this; },
    json(valor) { this.body = valor; return this; },
    set() { return this; },
  });
  const ok = respuesta();
  await handler({ params: { id: "20" }, body }, ok);
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.body.total, 330);
  assert.equal(ok.body.detalles.length, 2);
  assert.ok(ok.body.versionEdicion);
  const conflicto = respuesta();
  await handler({ params: { id: "20" }, body }, conflicto);
  assert.equal(conflicto.statusCode, 409);
  assert.ok(conflicto.body.error);
});
