import assert from "node:assert/strict";
import { test } from "node:test";
import { crearPdfCobrosDiarios } from "../src/pages/cobranzas/pdfCobrosDiarios.js";

function crearReporte(cantidad = 1) {
  const items = Array.from({ length: cantidad }, (_, indice) => ({
    id: indice + 1,
    fecha: indice === 0 ? "2026-10-26T03:00:00.000Z" : "2026-10-27T02:59:59.999Z",
    cliente: { nombre: `CLIENTE-${String(indice + 1).padStart(4, "0")}` },
    ventaId: indice + 1000,
    monto: 1234.5,
    formaPago: "EFECTIVO",
    observaciones: indice === 0 ? "Seña recibida" : null,
  }));
  return {
    fecha: "2026-10-26",
    items,
    cantidadCobros: cantidad,
    totalCobrado: cantidad * 1234.5,
    totalesPorFormaPago: [{ formaPago: "EFECTIVO", cantidadCobros: cantidad, totalCobrado: cantidad * 1234.5 }],
  };
}

test("el PDF conserva la fecha seleccionada, las horas argentinas y los centavos", () => {
  const doc = crearPdfCobrosDiarios(crearReporte(2));
  const contenido = doc.output();
  assert.ok(contenido.startsWith("%PDF-"));
  assert.ok(contenido.includes("Fecha: 26/10/2026"));
  assert.ok(contenido.includes("(00:00)"));
  assert.ok(contenido.includes("(23:59)"));
  assert.ok(contenido.includes("($ 1.234,50)"));
  assert.ok(contenido.includes("($ 2.469,00)"));
  assert.ok(contenido.includes("Total cobrado"));
  assert.ok(contenido.includes("Seña recibida"));
});

test("un PDF de varias páginas conserva todos los cobros y numera cada página", () => {
  const reporte = crearReporte(125);
  const doc = crearPdfCobrosDiarios(reporte);
  const contenido = doc.output();
  const paginas = doc.getNumberOfPages();
  assert.ok(paginas > 1);
  for (const cobro of reporte.items) {
    assert.ok(contenido.includes(cobro.cliente.nombre), `Falta ${cobro.cliente.nombre}`);
  }
  for (let pagina = 1; pagina <= paginas; pagina += 1) {
    assert.ok(contenido.includes(`Página ${pagina} de ${paginas}`));
    const contenidoPagina = doc.internal.pages[pagina].join("\n");
    if (/CLIENTE-\d{4}/.test(contenidoPagina)) {
      assert.ok(contenidoPagina.includes("(Cliente)"), `Falta el encabezado en la página ${pagina}`);
    } else {
      // El resumen se mantiene completo cuando necesita una página propia.
      assert.ok(contenidoPagina.includes("Totales por forma de pago"));
      assert.ok(contenidoPagina.includes("Total cobrado"));
    }
  }
  assert.ok(contenido.includes("($ 154.312,50)"));
});

test("el PDF admite cobros sin cliente ni venta y envuelve observaciones largas", () => {
  const reporte = crearReporte();
  reporte.items[0].cliente = null;
  reporte.items[0].ventaId = null;
  reporte.items[0].observaciones = `${"Observación extensa para comprobar los saltos de línea. ".repeat(20)}FIN-OBSERVACION`;
  const doc = crearPdfCobrosDiarios(reporte);
  const contenido = doc.output();
  assert.ok(contenido.includes("Sin cliente"));
  assert.ok(contenido.includes("FIN-OBSERVACION"));
  assert.ok(doc.lastAutoTable.finalY < doc.internal.pageSize.getHeight() - 18);
});
