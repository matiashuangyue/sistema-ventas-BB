const assert = require("node:assert/strict");
const { once } = require("node:events");
const { beforeEach, test } = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "clave-local-pruebas-cobranzas";

// Se ejecutan los servicios y repositorios reales sobre un doble transaccional,
// sin abrir la base configurada en el entorno.
let estado;
let consultas;
let fallarCobro;
let fallarAjuste;
const fechaActual = new Date("2026-11-02T15:00:00Z");

function ventaCompleta(venta) {
  return structuredClone({
    ...venta,
    detalles: [],
    cobros: estado.cobros.filter((item) => item.ventaId === venta.id),
  });
}

function clienteCompleto(id) {
  const cliente = estado.clientes.find((item) => item.id === id);
  if (!cliente) return null;
  return structuredClone({
    ...cliente,
    ventas: estado.ventas.filter((item) => item.clienteId === id).map(ventaCompleta),
    ajustesCuenta: estado.ajustes.filter((item) => item.clienteId === id).map((item) => ({
      ...item,
      usuario: item.usuarioId ? { id: item.usuarioId, nombre: "Operador" } : null,
    })),
    cobros: estado.cobros.filter((item) => item.clienteId === id && item.ventaId === null),
  });
}

const prismaDoble = {
  async $transaction(callback) {
    const anterior = structuredClone(estado);
    try { return await callback(prismaDoble); }
    catch (error) { estado = anterior; throw error; }
  },
  async $queryRaw(strings, ...values) {
    consultas.push({ tipo: "lock", sql: strings.join("?"), values });
    return [];
  },
  cliente: {
    async findUnique(consulta) {
      consultas.push({ tipo: "cliente", consulta });
      assert.equal(consulta.include.cobros.where.ventaId, null, "Solo suma cobros generales por separado");
      return clienteCompleto(consulta.where.id);
    },
    async findMany(consulta) {
      assert.equal(consulta.include.cobros.where.ventaId, null);
      return estado.clientes.map((cliente) => clienteCompleto(cliente.id));
    },
  },
  venta: {
    async findUnique({ where }) {
      consultas.push({ tipo: "venta", id: where.id });
      const venta = estado.ventas.find((item) => item.id === where.id);
      return venta ? ventaCompleta(venta) : null;
    },
    async update({ where, data }) {
      const venta = estado.ventas.find((item) => item.id === where.id);
      Object.assign(venta, data);
      return ventaCompleta(venta);
    },
  },
  ajusteCuentaCorriente: {
    async create({ data }) {
      if (fallarAjuste) throw new Error("Fallo al guardar ajuste");
      const ajuste = { id: estado.ajustes.length + 1, fecha: fechaActual, createdAt: fechaActual, ...data };
      estado.ajustes.push(ajuste);
      return structuredClone(ajuste);
    },
  },
  cobro: {
    async create({ data }) {
      if (estado.cobros.length + 1 === fallarCobro) throw new Error("Fallo al guardar cobro");
      const cobro = { id: estado.cobros.length + 1, fecha: fechaActual, createdAt: fechaActual, ...data };
      estado.cobros.push(cobro);
      return structuredClone(cobro);
    },
    async findMany({ where }) {
      return structuredClone(estado.cobros.filter((item) => item.fecha >= where.fecha.gte && item.fecha < where.fecha.lt));
    },
  },
  variante: {
    async update() { assert.fail("Un movimiento de cuenta no modifica stock"); },
    async updateMany() { assert.fail("Un movimiento de cuenta no modifica stock"); },
  },
};

const prismaPath = require.resolve("../src/lib/prisma");
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: prismaDoble };
const service = require("../src/modules/cobranzas/services/cobranzas.service");
const router = require("../src/modules/cobranzas/controllers/cobranzas.controller");
const authRouter = require("../src/modules/auth/controllers/auth.controller");
const env = require("../src/config/env");
const CrearCobroDto = require("../src/modules/cobranzas/models/dtos/crear-cobro.dto");
const CrearAjusteCuentaDto = require("../src/modules/cobranzas/models/dtos/crear-ajuste-cuenta.dto");

function venta(id, total, fecha, pagado = 0) {
  return {
    id, clienteId: 4, fecha: new Date(fecha), subtotal: total, descuento: 0, total,
    montoPagado: pagado, saldoPendiente: total - pagado,
    formaPago: "CUENTA_CORRIENTE", estadoPago: pagado ? "PARCIAL" : "PENDIENTE",
  };
}

beforeEach(() => {
  consultas = [];
  fallarCobro = null;
  fallarAjuste = false;
  estado = {
    clientes: [{ id: 4, nombre: "Cliente prueba" }, { id: 5, nombre: "Sin movimientos" }],
    ventas: [venta(20, 100, "2026-10-20T15:00:00Z")],
    ajustes: [], cobros: [],
  };
});

test("ajustes de debito y credito conservan ventas, stock y caja, con motivo y autor", async () => {
  const original = structuredClone(estado.ventas);
  await service.registrarAjuste("4", { tipo: "DEBITO", monto: "50.25", motivo: "  Saldo inicial  " }, 9);
  const cuenta = await service.registrarAjuste(4, { tipo: "CREDITO", monto: 20, motivo: "Bonificacion" }, 9);
  assert.deepEqual(estado.ventas, original);
  assert.deepEqual(estado.cobros, []);
  assert.equal(cuenta.resumen.totalVendido, 100);
  assert.equal(cuenta.resumen.totalCobrado, 0);
  assert.equal(cuenta.resumen.totalAjustes, 30.25);
  assert.equal(cuenta.resumen.saldoPendiente, 130.25);
  assert.equal(cuenta.movimientos.at(-1).saldo, 130.25);
  const movimiento = cuenta.movimientos.find((item) => item.ajusteId === 1);
  assert.equal(movimiento.observaciones, "Saldo inicial");
  assert.deepEqual(movimiento.usuario, { id: 9, nombre: "Operador" });
  assert.equal(movimiento.formaPago, null);
  assert.equal(movimiento.tipo, "DEBITO");
  assert.equal((await service.listarCobrosDelDia("2026-11-02")).totalCobrado, 0);
  const resumen = await service.listarResumen();
  assert.equal(resumen.items[0].saldoPendiente, 130.25);
  assert.equal(resumen.items[0].totalAjustes, 30.25);
});

test("incluye cuentas con saldo a favor o ajustes netos cero sin ventas y filtra deuda", async () => {
  estado.ventas = [];
  await service.registrarAjuste(4, { tipo: "CREDITO", monto: 20, motivo: "Credito anterior" });
  const cuenta = await service.obtenerCuentaCorriente(4);
  assert.equal(cuenta.resumen.saldoPendiente, -20);
  assert.equal(cuenta.movimientos.at(-1).saldo, -20);
  assert.equal((await service.listarResumen()).items[0].id, 4);
  assert.equal((await service.listarResumen({ soloConDeuda: "true" })).items.length, 0);
  await service.registrarAjuste(4, { tipo: "DEBITO", monto: 20, motivo: "Reversion" });
  const resumen = await service.listarResumen();
  assert.equal(resumen.items.length, 1);
  assert.equal(resumen.items[0].saldoPendiente, 0);
});

test("cobra una deuda de ajustes sin crear ventas y la incluye una sola vez en cuenta y caja", async () => {
  estado.ventas = [];
  await service.registrarAjuste(4, { tipo: "DEBITO", monto: 80.2, motivo: "Deuda anterior" });
  const cuenta = await service.registrarCobroCliente(4, { monto: 80.2, formaPago: "TRANSFERENCIA", observaciones: "Transferencia recibida" });
  assert.equal(cuenta.resumen.saldoPendiente, 0);
  assert.equal(cuenta.resumen.totalCobrado, 80.2);
  assert.equal(cuenta.resumen.totalVendido, 0);
  assert.equal(cuenta.resumen.totalAjustes, 80.2);
  assert.equal(cuenta.movimientos.at(-1).saldo, 0);
  assert.equal(estado.ventas.length, 0);
  assert.equal(estado.cobros.length, 1);
  assert.equal(estado.cobros[0].ventaId, null);
  assert.equal((await service.listarResumen()).items[0].totalCobrado, 80.2);
  assert.equal((await service.listarCobrosDelDia("2026-11-02")).totalCobrado, 80.2);
});

test("el cobro general asigna primero a ventas antiguas y el excedente a deuda de ajustes", async () => {
  estado.ventas = [venta(20, 100.1, "2026-10-22T15:00:00Z"), venta(30, 50.2, "2026-10-20T15:00:00Z")];
  await service.registrarAjuste(4, { tipo: "DEBITO", monto: 20, motivo: "Saldo previo" });
  consultas = [];
  const cuenta = await service.registrarCobroCliente(4, { monto: 160.3, formaPago: "EFECTIVO" });
  assert.deepEqual(estado.cobros.map(({ ventaId, monto }) => [ventaId, monto]), [[30, 50.2], [20, 100.1], [null, 10]]);
  assert.equal(cuenta.resumen.saldoPendiente, 10);
  assert.equal(cuenta.resumen.totalCobrado, 160.3);
  assert.equal(cuenta.movimientos.at(-1).saldo, 10);
  assert.equal(cuenta.ventasPendientes.length, 0);
  assert.ok(estado.ventas.every((item) => item.estadoPago === "PAGADA"));
  assert.match(consultas[0].sql, /Cliente.*FOR NO KEY UPDATE/);
  assert.match(consultas[1].sql, /Venta.*ORDER BY "id" FOR UPDATE/);
  assert.equal(consultas[2].tipo, "cliente", "Se relee la cuenta despues de bloquear las ventas");
});

test("un cobro parcial actualiza estado y no duplica cobros historicos", async () => {
  estado.ventas[0].montoPagado = 20;
  estado.ventas[0].saldoPendiente = 80;
  estado.cobros.push({ id: 1, clienteId: 4, ventaId: 20, monto: 20, formaPago: "EFECTIVO", fecha: new Date("2026-10-21T15:00:00Z") });
  const cuenta = await service.registrarCobroCliente(4, { monto: 30, formaPago: "TARJETA" });
  assert.equal(cuenta.resumen.totalCobrado, 50);
  assert.equal(cuenta.resumen.saldoPendiente, 50);
  assert.equal(cuenta.movimientos.at(-1).saldo, 50);
  assert.equal(cuenta.ventasPendientes[0].estadoPago, "PARCIAL");
  assert.equal(cuenta.movimientos.filter((item) => item.cobroId).length, 2);
});

test("limita cobros por venta y generales al saldo neto despues de un credito", async () => {
  await service.registrarAjuste(4, { tipo: "CREDITO", monto: 80, motivo: "Descuento" });
  const anterior = structuredClone(estado);
  await assert.rejects(service.registrarCobroCliente(4, { monto: 21 }), /supera el saldo de la cuenta/);
  await assert.rejects(service.registrarCobro({ ventaId: 20, monto: 21 }), /supera el saldo de la cuenta/);
  assert.deepEqual(estado, anterior);
  const cuenta = await service.registrarCobro({ ventaId: 20, monto: 20 });
  assert.equal(cuenta.resumen.saldoPendiente, 0);
  assert.equal(cuenta.ventasPendientes[0].saldoPendiente, 80, "El ajuste permanece independiente de las ventas");
  assert.equal(cuenta.movimientos.at(-1).saldo, 0);
  await assert.rejects(service.registrarCobroCliente(4, { monto: 1 }), /no tiene saldo pendiente/);
  await assert.rejects(service.registrarCobro({ ventaId: 20, monto: 1 }), /no tiene saldo pendiente/);
});

test("rollback de varios cobros revierte tambien pagos aplicados a ventas", async () => {
  estado.ventas.push(venta(30, 50, "2026-10-21T15:00:00Z"));
  const anterior = structuredClone(estado);
  fallarCobro = 2;
  await assert.rejects(service.registrarCobroCliente(4, { monto: 120 }), /Fallo al guardar cobro/);
  assert.deepEqual(estado, anterior);
  fallarAjuste = true;
  await assert.rejects(service.registrarAjuste(4, { tipo: "DEBITO", monto: 10, motivo: "Correccion" }), /Fallo al guardar ajuste/);
  assert.deepEqual(estado, anterior);
});

test("rechaza importes y tipos ambiguos, IDs invalidos y textos invalidos antes de persistir", async () => {
  const anterior = structuredClone(estado);
  const base = { tipo: "DEBITO", monto: 10, motivo: "Correccion" };
  for (const monto of [null, undefined, "", "  ", true, false, [], [10], {}, -1, 0, 0.001, NaN, Infinity, "Infinity", Number.MAX_VALUE]) {
    await assert.rejects(service.registrarAjuste(4, CrearAjusteCuentaDto.from({ ...base, monto })), { statusCode: 400 });
    await assert.rejects(service.registrarCobroCliente(4, CrearCobroDto.from({ monto })), { statusCode: 400 });
    await assert.rejects(service.registrarCobro(CrearCobroDto.from({ ventaId: 20, monto })), { statusCode: 400 });
  }
  for (const id of [null, undefined, "", true, [], {}, -1, 0, 1.1, Infinity, 2147483648]) {
    await assert.rejects(service.registrarAjuste(id, base), { statusCode: 400 });
    await assert.rejects(service.registrarCobroCliente(id, { monto: 1 }), { statusCode: 400 });
  }
  for (const motivo of [null, undefined, "", " ", [], true, 123, "x".repeat(501)]) {
    await assert.rejects(service.registrarAjuste(4, { ...base, motivo }), { statusCode: 400 });
  }
  for (const tipo of [null, "OTRO", "debito", ["DEBITO"], true]) {
    await assert.rejects(service.registrarAjuste(4, { ...base, tipo }), { statusCode: 400 });
  }
  for (const observaciones of [[], {}, true, "x".repeat(501)]) {
    await assert.rejects(service.registrarCobroCliente(4, { monto: 1, observaciones }), { statusCode: 400 });
  }
  for (const formaPago of ["CUENTA_CORRIENTE", true, ["EFECTIVO"], {}]) {
    await assert.rejects(service.registrarCobroCliente(4, { monto: 1, formaPago }), { statusCode: 400 });
  }
  assert.deepEqual(estado, anterior);
  assert.equal(consultas.length, 0);
});

test("rechaza clientes y ventas inexistentes sin generar movimientos", async () => {
  const anterior = structuredClone(estado);
  await assert.rejects(service.registrarAjuste(99, { tipo: "DEBITO", monto: 10, motivo: "Saldo" }), { statusCode: 404 });
  await assert.rejects(service.registrarCobroCliente(99, { monto: 10 }), { statusCode: 404 });
  await assert.rejects(service.registrarCobro({ ventaId: 99, monto: 10 }), { statusCode: 404 });
  assert.deepEqual(estado, anterior);
});

async function clienteHttp(t) {
  const app = express();
  app.use(express.json());
  app.use("/cobranzas", router);
  app.use("/auth", authRouter);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));
  const origen = `http://127.0.0.1:${server.address().port}`;
  return async (ruta, body, authorization) => {
    const res = await fetch(`${origen}${ruta}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authorization ? { Authorization: authorization } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: res.status, body: await res.json() };
  };
}

const tokenVencido = jwt.sign({ id: 9, rol: "admin" }, env.jwtSecret, { expiresIn: -60 });
const tokenOperador = jwt.sign({ id: 9, rol: "operador" }, env.jwtSecret, { expiresIn: "1h" });

for (const [caso, authorization, autorId] of [
  ["sin token", undefined, null],
  ["con token vencido", `Bearer ${tokenVencido}`, null],
  ["con token invalido", "Bearer token-invalido", null],
  ["con usuario no administrador", `Bearer ${tokenOperador}`, 9],
]) {
  test(`HTTP permite ajustes y cobros ${caso}, sin aceptar autor ni cliente del formulario`, async (t) => {
    const request = await clienteHttp(t);
    const ajuste = await request("/cobranzas/clientes/4/ajustes", {
      tipo: "DEBITO", monto: 10, motivo: "Saldo anterior",
      usuarioId: 999, clienteId: 5, fecha: "2000-01-01",
    }, authorization);
    assert.equal(ajuste.status, 200);
    assert.equal(ajuste.body.resumen.saldoPendiente, 110);
    assert.equal(estado.ajustes[0].usuarioId, autorId);
    assert.equal(estado.ajustes[0].clienteId, 4);
    assert.deepEqual(estado.ajustes[0].fecha, fechaActual);
    const movimiento = ajuste.body.movimientos.find((item) => item.ajusteId === 1);
    assert.deepEqual(movimiento.usuario, autorId ? { id: autorId, nombre: "Operador" } : null);

    const cobro = await request("/cobranzas/clientes/4/cobros", {
      monto: 20, formaPago: "EFECTIVO", clienteId: 5,
    }, authorization);
    assert.equal(cobro.status, 200);
    assert.equal(cobro.body.resumen.saldoPendiente, 90);
    assert.equal(cobro.body.resumen.totalCobrado, 20);
    assert.equal(estado.cobros.length, 1);
    assert.equal(estado.cobros[0].clienteId, 4);
    assert.equal(estado.cobros[0].ventaId, 20);
  });
}

test("HTTP conserva validaciones de monto, motivo y saldo sin exigir sesion", async (t) => {
  const request = await clienteHttp(t);
  const anterior = structuredClone(estado);
  for (const [ruta, body] of [
    ["ajustes", { tipo: "DEBITO", monto: 10, motivo: " " }],
    ["ajustes", { tipo: "DEBITO", monto: true, motivo: "Correccion" }],
    ["cobros", { monto: true }],
    ["cobros", { monto: 101 }],
  ]) {
    const respuesta = await request(`/cobranzas/clientes/4/${ruta}`, body, `Bearer ${tokenVencido}`);
    assert.equal(respuesta.status, 400);
    assert.equal(typeof respuesta.body.error, "string");
    assert.deepEqual(estado, anterior);
  }
});

test("HTTP mantiene autenticacion obligatoria en auth/me", async (t) => {
  const request = await clienteHttp(t);
  for (const authorization of [undefined, "Bearer token-invalido", `Bearer ${tokenVencido}`]) {
    const respuesta = await request("/auth/me", undefined, authorization);
    assert.equal(respuesta.status, 401);
  }
  const respuesta = await request("/auth/me", undefined, `Bearer ${tokenOperador}`);
  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.user.id, 9);
  assert.equal(respuesta.body.user.rol, "operador");
});
