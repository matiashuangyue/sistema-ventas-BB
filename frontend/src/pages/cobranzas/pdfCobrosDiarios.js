import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import {
  formatearDiaCobros,
  formatearFormaPagoCobro,
  formatearGeneracionCobros,
  formatearHoraCobro,
  formatearMonedaCobro,
} from "./imprimirCobrosDiarios.js";

const MARGEN = 12;
const INICIO_TABLA = 35;

export function crearPdfCobrosDiarios(reporte) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const fecha = formatearDiaCobros(reporte.fecha);
  const generado = formatearGeneracionCobros();
  const margenTabla = { top: INICIO_TABLA, right: MARGEN, bottom: 18, left: MARGEN };

  doc.setProperties({
    title: `Cobranzas del ${fecha}`,
    subject: `Listado de ${reporte.cantidadCobros} cobros del ${fecha}`,
  });

  autoTable(doc, {
    startY: INICIO_TABLA,
    margin: margenTabla,
    theme: "grid",
    showHead: "everyPage",
    rowPageBreak: "avoid",
    head: [["Cobro", "Hora", "Cliente", "Venta", "Forma de pago", "Observaciones", "Importe"]],
    body: reporte.items.map((cobro) => [
      `#${cobro.id}`,
      formatearHoraCobro(cobro.fecha),
      cobro.cliente?.nombre || "Sin cliente",
      cobro.ventaId == null ? "-" : `#${cobro.ventaId}`,
      formatearFormaPagoCobro(cobro.formaPago),
      cobro.observaciones || "-",
      formatearMonedaCobro(cobro.monto),
    ]),
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 2.1,
      valign: "top",
      overflow: "linebreak",
      textColor: [17, 24, 39],
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
    },
    headStyles: { fillColor: [235, 240, 247], textColor: [30, 41, 59], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 17 },
      2: { cellWidth: 58 },
      3: { cellWidth: 18 },
      4: { cellWidth: 37 },
      5: { cellWidth: ancho - MARGEN * 2 - 184 },
      6: { cellWidth: 39, halign: "right" },
    },
    didParseCell: ({ section, column, cell }) => {
      if (section === "head" && column.index === 6) cell.styles.halign = "right";
    },
  });

  const anchoResumen = 128;
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 9,
    margin: { ...margenTabla, left: ancho - MARGEN - anchoResumen },
    tableWidth: anchoResumen,
    pageBreak: "avoid",
    rowPageBreak: "avoid",
    theme: "grid",
    showHead: "firstPage",
    showFoot: "lastPage",
    head: [
      [{ content: "Totales por forma de pago", colSpan: 3 }],
      ["Forma de pago", "Cobros", "Total"],
    ],
    body: reporte.totalesPorFormaPago.map((grupo) => [
      formatearFormaPagoCobro(grupo.formaPago),
      String(grupo.cantidadCobros),
      formatearMonedaCobro(grupo.totalCobrado),
    ]),
    foot: [[
      { content: "Total cobrado", colSpan: 2 },
      formatearMonedaCobro(reporte.totalCobrado),
    ]],
    styles: {
      font: "helvetica",
      fontSize: 10,
      cellPadding: 2.5,
      textColor: [17, 24, 39],
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
    },
    headStyles: { fillColor: [235, 240, 247], textColor: [30, 41, 59] },
    footStyles: { fillColor: [235, 240, 247], textColor: [17, 24, 39], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 61 },
      1: { cellWidth: 22, halign: "right" },
      2: { cellWidth: 45, halign: "right" },
    },
    didParseCell: ({ column, cell }) => {
      if (column.index > 0 && cell.colSpan === 1) cell.styles.halign = "right";
    },
  });

  const paginas = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= paginas; pagina += 1) {
    doc.setPage(pagina);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.setTextColor(17, 24, 39);
    doc.text("Cobranzas del día", MARGEN, 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Fecha: ${fecha} | ${reporte.cantidadCobros} cobro(s)`, MARGEN, 23);
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text(`Generado: ${generado}`, ancho - MARGEN, 15, { align: "right" });
    doc.text("Horario de Argentina. Cobros registrados hasta la generación de este listado.", MARGEN, 29);
    doc.setDrawColor(203, 213, 225);
    doc.line(MARGEN, alto - 13, ancho - MARGEN, alto - 13);
    doc.text(`Cobranzas del ${fecha}`, MARGEN, alto - 8);
    doc.text(`Página ${pagina} de ${paginas}`, ancho - MARGEN, alto - 8, { align: "right" });
  }

  return doc;
}

export async function descargarPdfCobrosDiarios(reporte) {
  const doc = crearPdfCobrosDiarios(reporte);
  await doc.save(`cobranzas-${reporte.fecha}.pdf`, { returnPromise: true });
}
