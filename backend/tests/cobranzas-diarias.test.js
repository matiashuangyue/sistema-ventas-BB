const assert = require("node:assert/strict");
const { beforeEach, test } = require("node:test");

// Sustituir Prisma antes de cargar los modulos evita abrir la base real.
const prismaPath = require.resolve("../src/lib/prisma");
let registros = [];
let consultas = [];
require.cache[prismaPath] = {
  id: prismaPath,
  filename: prismaPath,
  loaded: true,
  exports: {
    cobro: {
      async findMany(consulta) {
        consultas.push(consulta);
        const { gte, lt } = consulta.where.fecha;
        return registros
          .filter((cobro) => cobro.fecha >= gte && cobro.fecha < lt)
          .sort((a, b) => a.fecha - b.fecha || a.id - b.id);
      },
    },
  },
};

const service = require("../src/modules/cobranzas/services/cobranzas.service");
const router = require("../src/modules/cobranzas/controllers/cobranzas.controller");

function cobro(id, fecha, monto = 100, formaPago = "EFECTIVO", adicionales = {}) {
  return {
    id,
    fecha: new Date(fecha),
    clienteId: 4,
    cliente: { id: 4, nombre: "Cliente de prueba" },
    ventaId: 20,
    monto,
    formaPago,
    observaciones: null,
    ...adicionales,
  };
}

beforeEach(() => {
  registros = [];
  consultas = [];
});

test("usa la fecha del cobro y los limites de la jornada argentina, sin paginar ni filtrar clientes", async () => {
  registros = [
    cobro(1, "2026-10-26T02:59:59.999Z"),
    cobro(3, "2026-10-26T03:00:00.000Z"),
    cobro(2, "2026-10-26T03:00:00.000Z", 50, "TRANSFERENCIA"),
    cobro(4, "2026-10-27T02:59:59.999Z", 25, "TARJETA", {
      clienteId: null,
      cliente: null,
      ventaId: null,
    }),
    cobro(5, "2026-10-27T03:00:00.000Z"),
  ];

  const resultado = await service.listarCobrosDelDia("2026-10-26");
  assert.equal(resultado.fecha, "2026-10-26");
  assert.equal(resultado.zonaHoraria, "America/Argentina/Buenos_Aires");
  assert.deepEqual(resultado.items.map(({ id }) => id), [2, 3, 4]);
  assert.equal(resultado.items[2].cliente, null);
  assert.equal(resultado.cantidadCobros, 3);
  assert.equal(resultado.totalCobrado, 175);
  assert.deepEqual(consultas[0], {
    where: {
      fecha: {
        gte: new Date("2026-10-26T03:00:00.000Z"),
        lt: new Date("2026-10-27T03:00:00.000Z"),
      },
    },
    orderBy: [{ fecha: "asc" }, { id: "asc" }],
    select: {
      id: true,
      fecha: true,
      clienteId: true,
      cliente: { select: { id: true, nombre: true } },
      ventaId: true,
      monto: true,
      formaPago: true,
      observaciones: true,
    },
  });
});

test("devuelve todos los cobros y suma importes y formas de pago en centavos", async () => {
  registros = Array.from({ length: 150 }, (_, i) =>
    cobro(i + 1, "2026-10-26T15:00:00Z", i % 2 ? 0.2 : 0.1,
      i % 2 ? "TRANSFERENCIA" : "EFECTIVO"),
  );
  const resultado = await service.listarCobrosDelDia("2026-10-26");
  assert.equal(resultado.items.length, 150);
  assert.equal(resultado.cantidadCobros, 150);
  assert.equal(resultado.totalCobrado, 22.5);
  assert.deepEqual(resultado.totalesPorFormaPago, [
    { formaPago: "EFECTIVO", cantidadCobros: 75, totalCobrado: 7.5 },
    { formaPago: "TRANSFERENCIA", cantidadCobros: 75, totalCobrado: 15 },
  ]);
});

test("un dia sin cobros devuelve ceros y listas vacias", async () => {
  assert.deepEqual(await service.listarCobrosDelDia("2026-10-26"), {
    fecha: "2026-10-26",
    zonaHoraria: "America/Argentina/Buenos_Aires",
    items: [],
    cantidadCobros: 0,
    totalCobrado: 0,
    totalesPorFormaPago: [],
  });
});

test("por defecto usa hoy en Argentina aun cuando UTC ya cambio de dia", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-10-27T02:30:00Z") });
  const resultado = await service.listarCobrosDelDia();
  assert.equal(resultado.fecha, "2026-10-26");
  assert.equal(consultas[0].where.fecha.gte.toISOString(), "2026-10-26T03:00:00.000Z");
});

test("acepta el dia bisiesto y cruza mes y anio sin depender de la zona del servidor", async () => {
  for (const [fecha, hasta] of [
    ["2024-02-29", "2024-03-01T03:00:00.000Z"],
    ["2026-12-31", "2027-01-01T03:00:00.000Z"],
  ]) {
    await service.listarCobrosDelDia(fecha);
    assert.equal(consultas.at(-1).where.fecha.lt.toISOString(), hasta);
  }
});

test("rechaza fechas imposibles o formatos ambiguos antes de consultar", async () => {
  for (const fecha of [
    "2026-02-29", "2024-02-30", "2026-04-31", "2026-13-01",
    "2026-00-01", "2026-10-00", "0000-01-01", "26/10/2026",
    "2026-1-1", "2026-10-26T00:00:00Z", "", " ", null, 123,
    ["2026-10-26"], { fecha: "2026-10-26" },
  ]) {
    await assert.rejects(service.listarCobrosDelDia(fecha), { statusCode: 400 });
  }
  assert.equal(consultas.length, 0);
});

test("GET /cobros entrega el listado y devuelve 400 para fechas invalidas", async () => {
  const ruta = router.stack.find((capa) => capa.route?.path === "/cobros" && capa.route.methods.get);
  assert.ok(ruta, "Existe GET /cobros junto a POST /cobros");
  assert.ok(router.stack.some((capa) => capa.route?.path === "/cobros" && capa.route.methods.post));
  const handler = ruta.route.stack[0].handle;
  const respuesta = {
    statusCode: 200,
    headers: {},
    set(nombre, valor) { this.headers[nombre] = valor; return this; },
    status(codigo) { this.statusCode = codigo; return this; },
    json(body) { this.body = body; return this; },
  };
  await handler({ query: { fecha: "2026-10-26" } }, respuesta);
  assert.equal(respuesta.statusCode, 200);
  assert.equal(respuesta.headers["Cache-Control"], "no-store");
  assert.equal(respuesta.body.fecha, "2026-10-26");
  await handler({ query: { fecha: "2026-02-30" } }, respuesta);
  assert.equal(respuesta.statusCode, 400);
  assert.match(respuesta.body.error, /fecha valida/);
});
