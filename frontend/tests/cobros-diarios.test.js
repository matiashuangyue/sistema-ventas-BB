import assert from "node:assert/strict";
import { test } from "node:test";
import { crearHtmlCobrosDiarios, obtenerFechaActualCobros } from "../src/pages/cobranzas/imprimirCobrosDiarios.js";

test("la fecha predeterminada sigue el día de Argentina aunque UTC ya cambió", () => {
  assert.equal(obtenerFechaActualCobros(new Date("2026-10-27T02:59:59.999Z")), "2026-10-26");
  assert.equal(obtenerFechaActualCobros(new Date("2026-10-27T03:00:00.000Z")), "2026-10-27");
  assert.equal(obtenerFechaActualCobros(new Date("2027-01-01T01:00:00.000Z")), "2026-12-31");
});

function reporteCon(items) {
  return {
    fecha: "2026-10-26",
    cantidadCobros: items.length,
    totalCobrado: 1234.5,
    totalesPorFormaPago: [{ formaPago: "EFECTIVO", cantidadCobros: items.length, totalCobrado: 1234.5 }],
    items,
  };
}

function cobroCon(cambios = {}) {
  return {
    id: 1,
    fecha: "2026-10-26T03:00:00.000Z",
    cliente: { nombre: "Cliente de prueba" },
    ventaId: 5,
    formaPago: "EFECTIVO",
    monto: 1234.5,
    observaciones: null,
    ...cambios,
  };
}

test("imprime todos los cobros aunque superen la paginación de clientes", () => {
  const items = Array.from({ length: 125 }, (_, indice) => cobroCon({
    id: indice + 1,
    cliente: { nombre: `Cliente único ${indice + 1}` },
  }));
  const html = crearHtmlCobrosDiarios(reporteCon(items));
  for (const item of items) {
    assert.ok(html.includes(`<td>${item.cliente.nombre}</td>`));
  }
  assert.ok(html.includes("125 cobro(s)"));
});

test("muestra la fecha del reporte y las horas de Argentina en ambos límites del día", () => {
  const html = crearHtmlCobrosDiarios(reporteCon([
    cobroCon(),
    cobroCon({ id: 2, fecha: "2026-10-27T02:59:59.999Z" }),
  ]));
  assert.ok(html.includes("Fecha: 26/10/2026"));
  assert.ok(html.includes("<td>00:00</td>"));
  assert.ok(html.includes("<td>23:59</td>"));
  assert.ok(html.includes("$ 1.234,50"));
  assert.ok(html.includes("Total cobrado"));
});

test("nombres, observaciones y formas de pago se imprimen como texto, sin ejecutar HTML", () => {
  const texto = '<script>alert("cobro")</script> & \'prueba\'';
  const html = crearHtmlCobrosDiarios(reporteCon([
    cobroCon({ cliente: { nombre: texto }, observaciones: texto, formaPago: texto }),
  ]));
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;alert(&quot;cobro&quot;)&lt;/script&gt; &amp; &#39;prueba&#39;"));
});

test("mantiene cobros sin cliente o venta vinculados", () => {
  const html = crearHtmlCobrosDiarios(reporteCon([
    cobroCon({ cliente: null, ventaId: null, observaciones: "Pago recibido" }),
  ]));
  assert.ok(html.includes("<td>Sin cliente</td>"));
  assert.ok(html.includes("<td>—</td>"));
  assert.ok(html.includes("Pago recibido"));
});
