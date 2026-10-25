import { useEffect, useState } from "react";
import jsPDF from "jspdf";

import LoadingContent from "../../components/LoadingContent";
import { API_URL as API } from "../../config/api";

const HISTORIAL_PAGE_SIZE = 10;

const FORMAS_PAGO = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "TARJETA", label: "Tarjeta" },
  { value: "CUENTA_CORRIENTE", label: "Cuenta corriente" },
  { value: "OTRO", label: "Otro" },
];

const DATOS_TRANSFERENCIA = {
  alias: "BautiBeni",
};

function getFechaHoy() {
  const hoy = new Date();
  return hoy.toISOString().split("T")[0];
}

function getFechaHace7Dias() {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - 7);
  return fecha.toISOString().split("T")[0];
}

function formatearFecha(fechaIso) {
  const fecha = new Date(fechaIso);
  return fecha.toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatearFormaPago(formaPago) {
  const labels = {
    EFECTIVO: "Efectivo",
    TRANSFERENCIA: "Transferencia",
    TARJETA: "Tarjeta",
    CUENTA_CORRIENTE: "Cuenta corriente",
    OTRO: "Otro",
  };

  return labels[formaPago] || "Efectivo";
}

function formatearEstadoPago(estadoPago) {
  const labels = {
    PAGADA: "Pagada",
    PARCIAL: "Parcial",
    PENDIENTE: "Pendiente",
  };

  return labels[estadoPago] || "Pagada";
}

function normalizarRespuestaHistorial(data, page, limit) {
  if (Array.isArray(data)) {
    return {
      items: data,
      page: 1,
      limit: data.length || limit,
      total: data.length,
      totalPages: 1,
    };
  }

  return {
    items: Array.isArray(data.items) ? data.items : [],
    page: Number(data.page || page),
    limit: Number(data.limit || limit),
    total: Number(data.total || 0),
    totalPages: Math.max(1, Number(data.totalPages || 1)),
  };
}

async function obtenerHistorialVentas({
  desde,
  hasta,
  cliente,
  page = 1,
  limit = HISTORIAL_PAGE_SIZE,
}) {
  const params = new URLSearchParams();

  params.set("page", String(Math.max(1, Number(page) || 1)));
  params.set("limit", String(limit));

  if (desde) params.append("desde", desde);
  if (hasta) params.append("hasta", hasta);
  if (cliente.trim()) params.append("cliente", cliente.trim());

  const res = await fetch(`${API}/ventas/historial?${params.toString()}`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Error cargando historial");
  }

  return data;
}

export default function HistorialVentas() {
  const [cliente, setCliente] = useState("");
  const [desde, setDesde] = useState(getFechaHace7Dias());
  const [hasta, setHasta] = useState(getFechaHoy());

  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [eliminandoVenta, setEliminandoVenta] = useState(false);
  const [detalleVentaCargandoId, setDetalleVentaCargandoId] = useState(null);
  const [paginaVentas, setPaginaVentas] = useState(1);
  const [totalVentas, setTotalVentas] = useState(0);
  const [totalPaginasVentas, setTotalPaginasVentas] = useState(1);

  const [ventaDetalle, setVentaDetalle] = useState(null);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [pagoEditOpen, setPagoEditOpen] = useState(false);
  const [pagoForma, setPagoForma] = useState("EFECTIVO");
  const [pagoMonto, setPagoMonto] = useState("");
  const [pagoObservaciones, setPagoObservaciones] = useState("");
  const [guardandoPago, setGuardandoPago] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function cargarVentasIniciales() {
      try {
        setLoading(true);
        const data = await obtenerHistorialVentas({
          desde: getFechaHace7Dias(),
          hasta: getFechaHoy(),
          cliente: "",
          page: 1,
        });
        const respuesta = normalizarRespuestaHistorial(
          data,
          1,
          HISTORIAL_PAGE_SIZE,
        );

        if (!cancelado) {
          setVentas(respuesta.items);
          setPaginaVentas(respuesta.page);
          setTotalVentas(respuesta.total);
          setTotalPaginasVentas(respuesta.totalPages);
        }
      } catch (error) {
        console.error(error);
        alert(error.message);
      } finally {
        if (!cancelado) {
          setLoading(false);
        }
      }
    }

    cargarVentasIniciales();

    return () => {
      cancelado = true;
    };
  }, []);

  function aplicarRespuestaHistorial(respuesta) {
    setVentas(respuesta.items);
    setPaginaVentas(respuesta.page);
    setTotalVentas(respuesta.total);
    setTotalPaginasVentas(respuesta.totalPages);
  }

  async function cargarVentas({ page = paginaVentas } = {}) {
    try {
      setLoading(true);
      const data = await obtenerHistorialVentas({
        desde,
        hasta,
        cliente,
        page,
      });
      aplicarRespuestaHistorial(
        normalizarRespuestaHistorial(data, page, HISTORIAL_PAGE_SIZE),
      );
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  function buscarVentas() {
    return cargarVentas({ page: 1 });
  }

  function cambiarPaginaVentas(nuevaPagina) {
    const page = Math.min(Math.max(1, nuevaPagina), totalPaginasVentas);
    return cargarVentas({ page });
  }

  async function verDetalle(id) {
    if (detalleVentaCargandoId || eliminandoVenta) return;

    try {
      setDetalleVentaCargandoId(id);
      const res = await fetch(`${API}/ventas/${id}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error obteniendo detalle");
      }

      setVentaDetalle(data);
      setPagoEditOpen(false);
      setPagoForma(data.formaPago || "EFECTIVO");
      setPagoMonto(String(data.montoPagado || 0));
      setPagoObservaciones(data.observacionesPago || "");
      setDetalleOpen(true);
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setDetalleVentaCargandoId(null);
    }
  }

  function descargarPDF(venta) {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const height = doc.internal.pageSize.getHeight();
    const width = doc.internal.pageSize.getWidth();
    const margin = 8, gap = 6;
    const leftWidth = (width - margin * 2 - gap) * 0.65;
    const rightWidth = width - margin * 2 - gap - leftWidth;
    const footerY = height - 58;
    const cliente = venta.cliente || {};
    const detalles = Array.isArray(venta.detalles) ? venta.detalles : [];
    const money = (v) => `$ ${Number(v ?? 0).toLocaleString("es-AR", {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    })}`;
    const copies = [
      { x: margin, w: leftWidth, title: "COPIA CLIENTE", size: 8, columns: [14, leftWidth - 66, 26, 26] },
      { x: margin + leftWidth + gap, w: rightWidth, title: "TALÓN DISTRIBUIDORA", size: 7, columns: [11, rightWidth - 55, 22, 22] },
    ];
    function font(size = 8, bold = false) {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      doc.setTextColor(25);
    }
    function fit(text, x, y, maxWidth, size = 8, align = "left", bold = false) {
      font(size, bold);
      const value = String(text);
      const measured = doc.getTextWidth(value);
      if (measured > maxWidth) doc.setFontSize(size * maxWidth / measured);
      doc.text(value, x, y, { align });
    }
    const info = [
      `Cliente: ${cliente.nombre || "Consumidor Final"}`,
      `CUIT/CUIL: ${cliente.cuit || "-"} | Tel.: ${cliente.telefono || "-"}`,
      `Dirección: ${[cliente.direccion, cliente.localidad].filter(Boolean).join(" - ") || "-"}`,
    ];
    copies.slice(0, 1).forEach((c) => {
      font(c.size);
      c.lines = info.flatMap((line) => doc.splitTextToSize(line, c.w - 8));
    });
    const tableY = 41 + copies[0].lines.length * 3.5;
    const bodyY = tableY + 7;
    if (bodyY > footerY - 15) {
      alert("Los datos del cliente son demasiado largos para este formato. Revisá el nombre y la dirección.");
      return;
    }
    // Paginar el detalle del cliente. El talón de recepción se imprime
    // una sola vez, en la última hoja, con el importe total de la venta.
    const rows = detalles.map((item) => {
      const description = [item.variante?.producto?.nombre || "Producto", item.variante?.nombre].filter(Boolean).join(" / ");
      const lines = copies.slice(0, 1).map((c) => {
        font(c.size);
        return doc.splitTextToSize(description, c.columns[1] - 4);
      });
      return { item, lines, count: Math.max(...lines.map((list) => list.length)) };
    });
    const pages = [[]];
    const capacity = footerY - bodyY;
    let used = 0;
    for (const row of rows) {
      let offset = 0;
      while (offset < row.count) {
        let available = Math.floor((capacity - used - 4) / 3.5);
        if (available < 1) {
          pages.push([]);
          used = 0;
          available = Math.floor((capacity - 4) / 3.5);
        }
        const take = Math.min(row.count - offset, available);
        const rowHeight = take * 3.5 + 4;
        pages[pages.length - 1].push({ ...row, offset, take, height: rowHeight });
        offset += take;
        used += rowHeight;
      }
    }
    const subtotal = venta.subtotal ?? detalles.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
    pages.forEach((pageRows, pageIndex) => {
      if (pageIndex) doc.addPage();
      doc.setDrawColor(110);
      doc.setLineWidth(0.2);
      doc.setLineDashPattern([1.5, 1.5], 0);
      const cutX = margin + leftWidth + gap / 2;
      doc.line(cutX, 6, cutX, height - 6);
      doc.setLineDashPattern([], 0);
      copies.forEach((c, copyIndex) => {
        const { x, w, columns } = c;
        if (copyIndex === 1) {
          // Un único talón por venta evita duplicar comprobantes de recepción.
          if (pageIndex !== pages.length - 1) return;
          doc.setDrawColor(80);
          doc.rect(x, 8, w, height - 18);
          font(12, true);
          doc.text("B&B Distribuidora", x + 5, 18);
          font(9, true);
          doc.text("COMPROBANTE DE RECEPCIÓN", x + 5, 27);
          doc.line(x, 32, x + w, 32);
          font(8, true);
          doc.text("CLIENTE", x + 5, 41);
          // Conservar el nombre completo, ajustando el tamaño si es muy largo.
          let nameSize = 12;
          let nameLines;
          do {
            font(nameSize, true);
            nameLines = doc.splitTextToSize(String(cliente.nombre || "Consumidor Final"), w - 10);
            if (nameLines.length * nameSize * 0.45 <= 50) break;
            nameSize -= 0.5;
          } while (nameSize > 1);
          const lineHeight = nameSize * 0.45;
          nameLines.forEach((line, index) => doc.text(line, x + 5, 49 + index * lineHeight));
          const infoY = 49 + nameLines.length * lineHeight + 8;
          fit(`Venta #${venta.id}`, x + 5, infoY, w - 10, 10, "left", true);
          fit(`Fecha: ${formatearFecha(venta.fecha)}`, x + 5, infoY + 8, w - 10, 9);
          doc.line(x + 5, infoY + 14, x + w - 5, infoY + 14);
          font(9, true);
          doc.text("IMPORTE TOTAL", x + 5, infoY + 23);
          fit(money(venta.total), x + 5, infoY + 34, w - 10, 18, "left", true);
          font(9);
          doc.text("Recibí la mercadería", x + 5, height - 51);
          doc.line(x + 5, height - 32, x + w - 5, height - 32);
          font(8);
          doc.text("Firma", x + 5, height - 27);
          return;
        }

        doc.setDrawColor(80);
        doc.rect(x, 8, w, height - 18);
        font(copyIndex === 0 ? 17 : 12, true);
        doc.text("B&B Distribuidora", x + 4, 16);
        font(8);
        doc.text("Contacto: 3464528526", x + 4, 21);
        font(8, true);
        doc.text(c.title, x + 4, 27);
        doc.line(x, 30, x + w, 30);
        fit(`Venta #${venta.id} | ${formatearFecha(venta.fecha)}`, x + 4, 35, w - 8);
        font(c.size);
        c.lines.forEach((line, i) => doc.text(line, x + 4, 41 + i * 3.5));
        doc.setFillColor(238);
        doc.rect(x, tableY, w, 7, "FD");
        let cellX = x;
        ["Cant.", "Producto / variante", "P. unitario", "Importe"].forEach((label, i) => {
          fit(label, cellX + 2, tableY + 4.6, columns[i] - 4, c.size);
          cellX += columns[i];
        });
        let y = bodyY;
        for (const row of pageRows) {
          cellX = x;
          const cells = [
            row.offset === 0 ? String(row.item.cantidad ?? "-") : "",
            row.lines[copyIndex].slice(row.offset, row.offset + row.take),
            row.offset === 0 ? money(row.item.precioUnitario) : "",
            row.offset === 0 ? money(row.item.subtotal) : "",
          ];
          cells.forEach((cell, i) => {
            if (i === 1) {
              font(c.size);
              cell.forEach((line, j) => doc.text(line, cellX + 2, y + 4 + j * 3.5));
            } else fit(cell, cellX + columns[i] - 2, y + 4, columns[i] - 4, c.size, "right");
            cellX += columns[i];
          });
          y += row.height;
          doc.setDrawColor(210);
          doc.line(x, y, x + w, y);
        }
        if (!detalles.length) {
          font(8);
          doc.text("Sin productos registrados", x + 4, bodyY + 6);
        }
        doc.setDrawColor(120);
        let dividerX = x;
        columns.slice(0, -1).forEach((column) => {
          dividerX += column;
          doc.line(dividerX, tableY, dividerX, footerY);
        });
        doc.line(x, footerY, x + w, footerY);
        if (pageIndex === pages.length - 1) {
          [
            ["Subtotal", money(subtotal)], ["Descuento", money(venta.descuento)],
            ["TOTAL", money(venta.total)], ["Pagado", money(venta.montoPagado)],
            ["Saldo pendiente", money(venta.saldoPendiente)],
          ].forEach(([label, value], i) => {
            const yy = footerY + 5 + i * 5;
            font(i === 2 ? 10 : 8, i === 2);
            doc.text(label, x + 4, yy);
            fit(value, x + w - 4, yy, w * 0.5, i === 2 ? 10 : 8, "right", i === 2);
          });
          fit(`Pago: ${formatearFormaPago(venta.formaPago)} / ${formatearEstadoPago(venta.estadoPago)}`, x + 4, footerY + 32, w - 8);
          fit(`Transferencia - Alias: ${DATOS_TRANSFERENCIA.alias || "-"}`, x + 4, footerY + 38, w - 8);
          font(7);
          doc.text("Gracias por tu compra", x + 4, footerY + 45);
        } else {
          font(8, true);
          doc.text("Continúa en la siguiente hoja", x + 4, footerY + 8);
          font(7);
          doc.text("Totales y pago al final del comprobante.", x + 4, footerY + 14);
        }
        font(7);
        doc.text(`Venta #${venta.id} - Hoja ${pageIndex + 1} de ${pages.length}`, x + w / 2, height - 5, { align: "center" });
      });
    });
    doc.save(`venta-${venta.id}.pdf`);
  }

  function cerrarDetalle() {
    setDetalleOpen(false);
    setVentaDetalle(null);
    setPagoEditOpen(false);
    setPagoMonto("");
    setPagoForma("EFECTIVO");
    setPagoObservaciones("");
  }

  function abrirEditorPago() {
    if (!ventaDetalle) return;

    setPagoForma(ventaDetalle.formaPago || "EFECTIVO");
    setPagoMonto(String(ventaDetalle.montoPagado || 0));
    setPagoObservaciones(ventaDetalle.observacionesPago || "");
    setPagoEditOpen(true);
  }

  function dejarVentaPendiente() {
    setPagoForma("CUENTA_CORRIENTE");
    setPagoMonto("0");
  }

  async function guardarPagoVenta() {
    if (!ventaDetalle || guardandoPago) return;

    const monto = Number(pagoMonto || 0);

    if (!Number.isFinite(monto) || monto < 0) {
      alert("El monto pagado no puede ser negativo");
      return;
    }

    if (monto > ventaDetalle.total) {
      alert("El monto pagado no puede superar el total");
      return;
    }

    if (pagoForma === "CUENTA_CORRIENTE" && monto > 0) {
      alert("Cuenta corriente debe quedar con monto pagado 0");
      return;
    }

    if (ventaDetalle.total - monto > 0 && !ventaDetalle.cliente) {
      alert("Para dejar saldo pendiente la venta tiene que tener cliente");
      return;
    }

    const confirmar = window.confirm(
      "Esto reemplaza los cobros registrados para esta venta y recalcula el saldo. Continuar?",
    );

    if (!confirmar) return;

    try {
      setGuardandoPago(true);

      const res = await fetch(`${API}/ventas/${ventaDetalle.id}/pago`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formaPago: pagoForma,
          montoPagado: monto,
          observacionesPago: pagoObservaciones.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error actualizando pago");
      }

      setVentaDetalle(data);
      setPagoForma(data.formaPago || "EFECTIVO");
      setPagoMonto(String(data.montoPagado || 0));
      setPagoObservaciones(data.observacionesPago || "");
      setPagoEditOpen(false);
      await cargarVentas();
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setGuardandoPago(false);
    }
  }

  async function eliminarVenta() {
    if (!ventaDetalle) {
      return;
    }

    const confirmar = window.confirm(
      `¿Seguro que querés borrar la venta #${ventaDetalle.id}? Esta acción restaura el stock y no se puede deshacer.`,
    );

    if (!confirmar) {
      return;
    }

    try {
      setEliminandoVenta(true);

      const res = await fetch(`${API}/ventas/${ventaDetalle.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error eliminando venta");
      }

      cerrarDetalle();
      await cargarVentas();
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setEliminandoVenta(false);
    }
  }

  function limpiarFiltros() {
    setCliente("");
    setDesde(getFechaHace7Dias());
    setHasta(getFechaHoy());
    setPaginaVentas(1);
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Historial de ventas</h2>

      <div style={styles.bloque}>
        <div style={styles.filtrosGrid}>
          <div>
            <label style={styles.label}>Cliente</label>
            <input
              style={styles.input}
              placeholder="Buscar cliente..."
              value={cliente}
              onChange={(e) => {
                setCliente(e.target.value);
                setPaginaVentas(1);
              }}
            />
          </div>

          <div>
            <label style={styles.label}>Desde</label>
            <input
              type="date"
              style={{ ...styles.input, ...styles.dateInput }}
              value={desde}
              onChange={(e) => {
                setDesde(e.target.value);
                setPaginaVentas(1);
              }}
            />
          </div>

          <div>
            <label style={styles.label}>Hasta</label>
            <input
              type="date"
              style={{ ...styles.input, ...styles.dateInput }}
              value={hasta}
              onChange={(e) => {
                setHasta(e.target.value);
                setPaginaVentas(1);
              }}
            />
          </div>
        </div>

        <div style={styles.filtrosActions}>
          <button style={styles.btnSecundario} onClick={limpiarFiltros}>
            Limpiar
          </button>

          <button
            style={styles.btnPrincipal}
            onClick={buscarVentas}
            disabled={loading}
          >
            <LoadingContent loading={loading} loadingText="Buscando...">
              Buscar
            </LoadingContent>
          </button>
        </div>
      </div>

      <div style={styles.lista}>
        {loading && (
          <div style={styles.empty}>
            <LoadingContent loading={true} loadingText="Cargando ventas..." />
          </div>
        )}

        {!loading && ventas.length === 0 && (
          <div style={styles.empty}>
            No se encontraron ventas para los filtros seleccionados.
          </div>
        )}

        {!loading &&
          ventas.map((venta) => (
            <div
              key={venta.id}
              style={{
                ...styles.ventaFila,
                ...(detalleVentaCargandoId === venta.id
                  ? styles.ventaFilaCargando
                  : {}),
              }}
              onClick={() => verDetalle(venta.id)}
            >
              <div style={styles.ventaLinea1}>
                <strong>
                  <LoadingContent
                    loading={detalleVentaCargandoId === venta.id}
                    loadingText="Cargando detalle..."
                  >
                    Venta #{venta.id}
                  </LoadingContent>
                </strong>
                <span>{formatearFecha(venta.fecha)}</span>
              </div>

              <div style={styles.ventaLinea2}>
                <span>{venta.cliente}</span>
                <span>${venta.total}</span>
              </div>

              <div style={styles.ventaLinea3}>
                <span>{venta.cantidadItems} ítem(s)</span>
                <span>{venta.unidadesTotales} unidad(es)</span>
              </div>

              <div style={styles.ventaPago}>
                <span>{formatearEstadoPago(venta.estadoPago)}</span>
                <span>Saldo ${venta.saldoPendiente || 0}</span>
              </div>
            </div>
          ))}

        {!loading && totalPaginasVentas > 1 && (
          <div style={styles.pagination}>
            <button
              style={styles.btnSecundario}
              onClick={() => cambiarPaginaVentas(paginaVentas - 1)}
              disabled={paginaVentas <= 1}
              type="button"
            >
              Anterior
            </button>
            <span style={styles.paginationText}>
              Pagina {paginaVentas} de {totalPaginasVentas}
              {totalVentas > 0 ? ` (${totalVentas} ventas)` : ""}
            </span>
            <button
              style={styles.btnSecundario}
              onClick={() => cambiarPaginaVentas(paginaVentas + 1)}
              disabled={paginaVentas >= totalPaginasVentas}
              type="button"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      {detalleOpen && ventaDetalle && (
        <>
          <div
            style={styles.overlay}
            onClick={eliminandoVenta || guardandoPago ? undefined : cerrarDetalle}
          ></div>

          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>
              Detalle de venta #{ventaDetalle.id}
            </h3>

            <div style={styles.detalleInfo}>
              <div>
                <strong>Fecha:</strong> {formatearFecha(ventaDetalle.fecha)}
              </div>
              <div>
                <strong>Cliente:</strong>{" "}
                {ventaDetalle.cliente?.nombre || "Consumidor Final"}
              </div>
              <div>
                <strong>Pago:</strong>{" "}
                {formatearFormaPago(ventaDetalle.formaPago)} -{" "}
                {formatearEstadoPago(ventaDetalle.estadoPago)}
              </div>
            </div>

            <div style={styles.pagoEditorBox}>
              <div style={styles.pagoEditorHeader}>
                <strong>Estado de pago</strong>
                {!pagoEditOpen && (
                  <button
                    style={styles.btnSecundario}
                    onClick={abrirEditorPago}
                    disabled={eliminandoVenta || guardandoPago}
                    type="button"
                  >
                    Corregir pago
                  </button>
                )}
              </div>

              {pagoEditOpen && (
                <div style={styles.pagoEditorForm}>
                  <div style={styles.pagoGrid}>
                    <div>
                      <label style={styles.label}>Forma de pago</label>
                      <select
                        style={styles.input}
                        value={pagoForma}
                        disabled={guardandoPago}
                        onChange={(e) => {
                          setPagoForma(e.target.value);
                          if (e.target.value === "CUENTA_CORRIENTE") {
                            setPagoMonto("0");
                          }
                        }}
                      >
                        {FORMAS_PAGO.map((forma) => (
                          <option key={forma.value} value={forma.value}>
                            {forma.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={styles.label}>Monto pagado</label>
                      <input
                        type="number"
                        min="0"
                        max={ventaDetalle.total}
                        style={styles.input}
                        value={pagoMonto}
                        disabled={
                          guardandoPago || pagoForma === "CUENTA_CORRIENTE"
                        }
                        onChange={(e) => setPagoMonto(e.target.value)}
                      />
                    </div>
                  </div>

                  <textarea
                    style={styles.textarea}
                    placeholder="Observaciones de pago"
                    value={pagoObservaciones}
                    disabled={guardandoPago}
                    onChange={(e) => setPagoObservaciones(e.target.value)}
                  />

                  <div style={styles.pagoEditorActions}>
                    <button
                      style={styles.btnSecundario}
                      onClick={dejarVentaPendiente}
                      disabled={guardandoPago}
                      type="button"
                    >
                      Dejar pendiente
                    </button>
                    <button
                      style={styles.btnSecundario}
                      onClick={() => setPagoEditOpen(false)}
                      disabled={guardandoPago}
                      type="button"
                    >
                      Cancelar
                    </button>
                    <button
                      style={styles.btnPrincipal}
                      onClick={guardarPagoVenta}
                      disabled={guardandoPago}
                      type="button"
                    >
                      <LoadingContent
                        loading={guardandoPago}
                        loadingText="Guardando..."
                      >
                        Guardar pago
                      </LoadingContent>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={styles.detalleLista}>
              {ventaDetalle.detalles.map((item) => (
                <div key={item.id} style={styles.detalleItem}>
                  <div style={styles.detalleProducto}>
                    {item.variante?.producto?.nombre} - {item.variante?.nombre}
                  </div>

                  <div style={styles.detalleNumeros}>
                    <span>x{item.cantidad}</span>
                    <span>${item.precioUnitario}</span>
                    <strong>${item.subtotal}</strong>
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.resumenDetalle}>
              <div style={styles.resumenRow}>
                <span>Subtotal</span>
                <strong>${ventaDetalle.subtotal}</strong>
              </div>

              <div style={styles.resumenRow}>
                <span>Descuento</span>
                <strong>${ventaDetalle.descuento}</strong>
              </div>

              <div style={styles.resumenRow}>
                <span>Pagado</span>
                <strong>${ventaDetalle.montoPagado || 0}</strong>
              </div>

              <div style={styles.resumenRow}>
                <span>Saldo pendiente</span>
                <strong>${ventaDetalle.saldoPendiente || 0}</strong>
              </div>

              <div style={styles.totalRow}>
                <span>Total</span>
                <strong>${ventaDetalle.total}</strong>
              </div>
            </div>

            <div style={styles.modalActions}>
              <button
                style={styles.btnSecundario}
                onClick={cerrarDetalle}
                disabled={eliminandoVenta || guardandoPago}
              >
                Cerrar
              </button>

              <button
                style={styles.btnDanger}
                onClick={eliminarVenta}
                disabled={eliminandoVenta || guardandoPago}
              >
                <LoadingContent
                  loading={eliminandoVenta}
                  loadingText="Borrando..."
                >
                  Borrar venta
                </LoadingContent>
              </button>

              <button
                style={styles.btnPrincipal}
                onClick={() => descargarPDF(ventaDetalle)}
                disabled={eliminandoVenta || guardandoPago}
              >
                Descargar PDF
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  title: {
    margin: 0,
  },
  bloque: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: 14,
  },
  filtrosGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 10,
  },
  label: {
    display: "block",
    fontSize: 14,
    marginBottom: 6,
    color: "var(--text-soft)",
  },
  input: {
    width: "100%",
    padding: 10,
    borderRadius: 10,
    border: "1px solid var(--border-strong)",
    fontSize: 15,
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    minHeight: 72,
    padding: 10,
    borderRadius: 10,
    border: "1px solid var(--border-strong)",
    fontSize: 14,
    boxSizing: "border-box",
    resize: "vertical",
  },
  dateInput: {
    minHeight: 42,
    paddingRight: 12,
    appearance: "none",
    WebkitAppearance: "none",
    backgroundColor: "var(--surface)",
  },
  filtrosActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 12,
  },
  btnPrincipal: {
    border: "none",
    borderRadius: 10,
    background: "var(--primary)",
    color: "var(--text-inverse)",
    padding: "10px 14px",
    fontWeight: 600,
  },
  btnSecundario: {
    border: "1px solid var(--border-strong)",
    borderRadius: 10,
    background: "var(--surface)",
    color: "var(--text)",
    padding: "10px 14px",
    fontWeight: 600,
  },
  btnDanger: {
    border: "1px solid var(--border-danger)",
    borderRadius: 10,
    background: "var(--surface-danger)",
    color: "var(--danger)",
    padding: "10px 14px",
    fontWeight: 600,
  },
  lista: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  empty: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: 14,
    color: "var(--text-muted)",
  },
  ventaFila: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    cursor: "pointer",
  },
  ventaFilaCargando: {
    opacity: 0.72,
    cursor: "wait",
  },
  ventaLinea1: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    fontSize: 14,
  },
  ventaLinea2: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    fontSize: 15,
  },
  ventaLinea3: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    fontSize: 12,
    color: "var(--text-muted)",
  },
  ventaPago: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    fontSize: 12,
    color: "var(--text-soft)",
  },
  pagination: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    padding: "4px 0",
  },
  paginationText: {
    color: "var(--text-soft)",
    fontSize: 13,
    fontWeight: 600,
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.46)",
    zIndex: 999,
  },
  modal: {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "92%",
    maxWidth: 500,
    maxHeight: "85vh",
    overflowY: "auto",
    background: "var(--surface)",
    borderRadius: 14,
    padding: 18,
    zIndex: 1000,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  modalTitle: {
    margin: 0,
  },
  detalleInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 14,
  },
  pagoEditorBox: {
    border: "1px solid var(--border-subtle)",
    borderRadius: 10,
    padding: 10,
  },
  pagoEditorHeader: {
    alignItems: "center",
    display: "flex",
    gap: 10,
    justifyContent: "space-between",
  },
  pagoEditorForm: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginTop: 10,
  },
  pagoGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  },
  pagoEditorActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
  },
  detalleLista: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    borderTop: "1px solid var(--border-subtle)",
    borderBottom: "1px solid var(--border-subtle)",
    padding: "10px 0",
  },
  detalleItem: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  detalleProducto: {
    fontWeight: 600,
    fontSize: 14,
  },
  detalleNumeros: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 13,
    color: "var(--text-soft)",
  },
  resumenDetalle: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  resumenRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 14,
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 18,
    fontWeight: 700,
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    flexWrap: "wrap",
  },
};

