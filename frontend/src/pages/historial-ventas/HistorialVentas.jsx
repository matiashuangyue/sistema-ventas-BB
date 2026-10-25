import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const gap = 5;
    const leftWidth = 140;
    const rightWidth = pageWidth - leftWidth - margin * 2 - gap;
    const leftX = margin;
    const rightX = leftX + leftWidth + gap;
    const cliente = venta.cliente || null;
    const fecha = formatearFecha(venta.fecha);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(210, 210, 210);
    doc.roundedRect(leftX, 12, leftWidth, pageHeight - 24, 2.5, 2.5, "S");
    doc.roundedRect(rightX, 12, rightWidth, pageHeight - 24, 2.5, 2.5, "S");

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235);
    doc.text("B&B Distribuidora", margin, 8);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60);
    doc.text(`Fecha: ${fecha}`, pageWidth - margin, 8, { align: "right" });
    doc.text(`Venta #${venta.id}`, pageWidth - margin, 14, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setTextColor(35, 35, 35);
    doc.setFontSize(11);
    doc.text("COPIA CLIENTE", leftX + 5, 20);
    doc.text("MI COPIA", rightX + 5, 20);

    const infoCliente = [
      `Cliente: ${cliente?.nombre || "Consumidor Final"}`,
      `CUIT/CUIL: ${cliente?.cuit || "-"}`,
      `Teléfono: ${cliente?.telefono || "-"}`,
      `Dirección: ${cliente ? `${cliente.direccion || "-"} (${cliente.localidad || "-"})` : "-"}`,
    ];

    let y = 28;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    infoCliente.forEach((linea) => {
      const parsed = doc.splitTextToSize(linea, leftWidth - 12);
      doc.text(parsed, leftX + 6, y);
      y += parsed.length * 5;
    });

    y += 3;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Productos", leftX + 5, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);

    venta.detalles.forEach((item, index) => {
      const nombre = `${index + 1}. ${item.variante?.producto?.nombre || "Producto"}`;
      const variante = item.variante?.nombre ? ` / ${item.variante.nombre}` : "";
      const linea = `${nombre}${variante} x${item.cantidad}`;
      const wrapped = doc.splitTextToSize(linea, leftWidth - 18);
      doc.text(wrapped, leftX + 5, y);
      y += wrapped.length * 4.3;

      const subtotalText = `$${item.subtotal}`;
      doc.text(subtotalText, leftX + leftWidth - 20, y - (wrapped.length * 4.3) + 3, { align: "right" });
    });

    const totalY = pageHeight - 62;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("TOTAL", leftX + 5, totalY);
    doc.text(`$${venta.total}`, leftX + leftWidth - 5, totalY, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(`Forma de pago: ${formatearFormaPago(venta.formaPago)}`, leftX + 5, totalY + 8);
    doc.text(`Estado: ${formatearEstadoPago(venta.estadoPago)}`, leftX + 5, totalY + 14);
    doc.text(`Pagado: $${venta.montoPagado || 0}`, leftX + 5, totalY + 20);
    doc.text(`Saldo: $${venta.saldoPendiente || 0}`, leftX + 5, totalY + 26);

    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(leftX + 5, totalY + 34, leftWidth - 10, 18, 2, 2, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Transferencia", leftX + 10, totalY + 43);
    doc.setFont("helvetica", "normal");
    doc.text(`Alias: ${DATOS_TRANSFERENCIA.alias}`, leftX + 10, totalY + 50);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("NEGOCIO", rightX + 5, 24);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.text("B&B Distribuidora", rightX + 6, 32);
    doc.text("Contacto: 3464528526", rightX + 6, 38);

    const negocioY = 52;
    doc.setFont("helvetica", "bold");
    doc.text("Venta", rightX + 6, negocioY);
    doc.setFont("helvetica", "normal");
    doc.text(`#${venta.id}`, rightX + 6, negocioY + 5);
    doc.text(fecha, rightX + 6, negocioY + 10);

    doc.setFont("helvetica", "bold");
    doc.text("Cliente", rightX + 6, negocioY + 20);
    doc.setFont("helvetica", "normal");
    const clienteCorto = (cliente?.nombre || "Consumidor Final").slice(0, 18);
    doc.text(clienteCorto, rightX + 6, negocioY + 26);

    doc.setFont("helvetica", "bold");
    doc.text("Total", rightX + 6, negocioY + 42);
    doc.setFont("helvetica", "normal");
    doc.text(`$${venta.total}`, rightX + 6, negocioY + 48);

    doc.setFont("helvetica", "bold");
    doc.text("Pago", rightX + 6, negocioY + 58);
    doc.setFont("helvetica", "normal");
    doc.text(formatearFormaPago(venta.formaPago), rightX + 6, negocioY + 64);

    if (DATOS_TRANSFERENCIA.alias.trim()) {
      doc.setDrawColor(220, 220, 220);
      doc.roundedRect(rightX + 5, negocioY + 74, rightWidth - 10, 18, 1.5, 1.5, "S");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text("Alias", rightX + 8, negocioY + 82);
      doc.setFont("helvetica", "normal");
      doc.text(DATOS_TRANSFERENCIA.alias, rightX + 8, negocioY + 88);
    }

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
