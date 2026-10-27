const ZONA_HORARIA = "America/Argentina/Buenos_Aires";

const FORMAS_PAGO = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  TARJETA: "Tarjeta",
  CUENTA_CORRIENTE: "Cuenta corriente",
  OTRO: "Otro",
};

function escaparHtml(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (caracter) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[caracter]);
}

export function formatearMonedaCobro(valor) {
  return `$ ${Number(valor).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatearFormaPagoCobro(valor) {
  return FORMAS_PAGO[valor] || valor || "Sin especificar";
}

export function formatearDiaCobros(fecha) {
  return fecha.split("-").reverse().join("/");
}

export function obtenerFechaActualCobros(ahora = new Date()) {
  const partes = new Intl.DateTimeFormat("en", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(ahora);
  const valores = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
  return `${valores.year}-${valores.month}-${valores.day}`;
}

export function formatearGeneracionCobros(ahora = new Date()) {
  return ahora.toLocaleString("es-AR", {
    timeZone: ZONA_HORARIA,
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function formatearHoraCobro(fecha) {
  return new Date(fecha).toLocaleTimeString("es-AR", {
    timeZone: ZONA_HORARIA,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

export function crearHtmlCobrosDiarios(reporte) {
  const fecha = escaparHtml(formatearDiaCobros(reporte.fecha));
  const generado = escaparHtml(formatearGeneracionCobros());
  const filas = reporte.items.map((cobro) => {
    const hora = formatearHoraCobro(cobro.fecha);

    return `<tr>
      <td>#${escaparHtml(cobro.id)}</td>
      <td>${escaparHtml(hora)}</td>
      <td>${escaparHtml(cobro.cliente?.nombre || "Sin cliente")}</td>
      <td>${cobro.ventaId == null ? "—" : `#${escaparHtml(cobro.ventaId)}`}</td>
      <td>${escaparHtml(formatearFormaPagoCobro(cobro.formaPago))}</td>
      <td class="observaciones">${escaparHtml(cobro.observaciones || "—")}</td>
      <td class="importe">${escaparHtml(formatearMonedaCobro(cobro.monto))}</td>
    </tr>`;
  }).join("");

  const resumen = reporte.totalesPorFormaPago.map((grupo) => `<tr>
    <td>${escaparHtml(formatearFormaPagoCobro(grupo.formaPago))}</td>
    <td class="cantidad">${escaparHtml(grupo.cantidadCobros)}</td>
    <td class="importe">${escaparHtml(formatearMonedaCobro(grupo.totalCobrado))}</td>
  </tr>`).join("");

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Cobranzas del ${fecha}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 24px; color: #111827; background: #fff; font-family: Arial, sans-serif; font-size: 10pt; }
    h1 { margin: 0 0 8px; font-size: 20pt; }
    h2 { margin: 0 0 10px; font-size: 13pt; }
    p { margin: 6px 0; }
    .acciones { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 24px; }
    .acciones p { color: #4b5563; }
    button { padding: 10px 18px; border: 1px solid #1d4ed8; border-radius: 6px; background: #2563eb; color: white; font: inherit; cursor: pointer; }
    .encabezado { margin-bottom: 20px; }
    .aclaracion { color: #4b5563; font-size: 9pt; }
    .tabla { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 9pt; }
    .detalle { table-layout: fixed; min-width: 680px; }
    th, td { padding: 8px 6px; border: 1px solid #cbd5e1; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
    th { background: #f1f5f9; font-weight: 700; }
    .importe { text-align: right; white-space: nowrap; }
    .cantidad { text-align: right; }
    .observaciones { white-space: pre-wrap; }
    .resumen { margin-top: 22px; max-width: 430px; margin-left: auto; break-inside: avoid; }
    .total { display: flex; justify-content: space-between; gap: 16px; margin-top: 12px; padding-top: 12px; border-top: 2px solid #111827; font-size: 14pt; font-weight: 700; }
    @page { size: A4 portrait; margin: 12mm; }
    @media print {
      body { margin: 0; }
      .acciones { display: none; }
      .tabla { overflow: visible; }
      .detalle { min-width: 0; }
      thead { display: table-header-group; }
      tr { break-inside: avoid; page-break-inside: avoid; }
      th, td { padding: 6px 4px; }
    }
  </style>
</head>
<body>
  <div class="acciones">
    <button id="imprimir" type="button">Imprimir listado</button>
    <p>Podés volver a imprimir este listado desde aquí.</p>
  </div>
  <header class="encabezado">
    <h1>Cobranzas del día</h1>
    <p><strong>Fecha: ${fecha}</strong> · ${escaparHtml(reporte.cantidadCobros)} cobro(s)</p>
    <p class="aclaracion">Horario de Argentina. Cobros registrados hasta la generación de este listado.</p>
    <p class="aclaracion">Generado: ${generado}</p>
  </header>
  <div class="tabla">
    <table class="detalle" aria-label="Detalle de cobranzas">
      <colgroup><col style="width:7%"><col style="width:7%"><col style="width:22%"><col style="width:8%"><col style="width:15%"><col style="width:23%"><col style="width:18%"></colgroup>
      <thead><tr><th>Cobro</th><th>Hora</th><th>Cliente</th><th>Venta</th><th>Forma de pago</th><th>Observaciones</th><th class="importe">Importe</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>
  </div>
  <section class="resumen">
    <h2>Totales por forma de pago</h2>
    <table aria-label="Totales por forma de pago">
      <thead><tr><th>Forma de pago</th><th class="cantidad">Cobros</th><th class="importe">Total</th></tr></thead>
      <tbody>${resumen}</tbody>
    </table>
    <div class="total"><span>Total cobrado</span><span>${escaparHtml(formatearMonedaCobro(reporte.totalCobrado))}</span></div>
  </section>
</body>
</html>`;
}

export function abrirVentanaCobros(fecha) {
  // Se abre durante el clic, antes de consultar la API, para evitar bloqueos.
  const ventana = window.open("", "_blank");
  if (!ventana) {
    throw new Error("El navegador bloqueó el listado. Permití las ventanas emergentes para este sitio y volvé a intentar.");
  }
  ventana.opener = null;
  const dia = formatearDiaCobros(fecha);
  ventana.document.title = `Preparando cobranzas del ${dia}`;
  ventana.document.body.textContent = `Preparando el listado de cobranzas del ${dia}…`;
  return ventana;
}

export function imprimirCobrosDiarios(ventana, reporte) {
  if (ventana.closed) {
    throw new Error("Se cerró el listado antes de terminar. Volvé a presionar Imprimir cobranzas.");
  }

  const documento = new DOMParser().parseFromString(crearHtmlCobrosDiarios(reporte), "text/html");
  ventana.document.documentElement.replaceWith(
    ventana.document.importNode(documento.documentElement, true),
  );

  const imprimir = () => {
    if (!ventana.closed) {
      ventana.focus();
      ventana.print();
    }
  };
  ventana.document.getElementById("imprimir").addEventListener("click", imprimir);
  ventana.focus();
  ventana.requestAnimationFrame(() => ventana.requestAnimationFrame(imprimir));
}
