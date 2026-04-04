import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const API = "http://localhost:8080";

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

export default function HistorialVentas() {
  const [cliente, setCliente] = useState("");
  const [desde, setDesde] = useState(getFechaHace7Dias());
  const [hasta, setHasta] = useState(getFechaHoy());

  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(false);

  const [ventaDetalle, setVentaDetalle] = useState(null);
  const [detalleOpen, setDetalleOpen] = useState(false);

  useEffect(() => {
    cargarVentas();
  }, []);

  async function cargarVentas() {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      if (desde) params.append("desde", desde);
      if (hasta) params.append("hasta", hasta);
      if (cliente.trim()) params.append("cliente", cliente.trim());

      const res = await fetch(`${API}/ventas/historial?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error cargando historial");
      }

      setVentas(data);
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function verDetalle(id) {
    try {
      const res = await fetch(`${API}/ventas/${id}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error obteniendo detalle");
      }

      setVentaDetalle(data);
      setDetalleOpen(true);
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  function descargarPDF(venta) {
  const doc = new jsPDF();

  const cliente = venta.cliente;
  const fecha = formatearFecha(venta.fecha);

  // --- ENCABEZADO (Negocio a la izquierda, Venta a la derecha) ---
  doc.setFontSize(18);
  doc.setTextColor(37, 99, 235); // Azul institucional
  doc.setFont("helvetica", "bold");
  doc.text("B&B Distribuidora", 14, 15);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  doc.text("Contacto: 3464528526", 14, 22);

  doc.setTextColor(0);
  doc.text(`Fecha: ${fecha}`, 196, 15, { align: "right" });
  doc.text(`Venta: #${venta.id}`, 196, 22, { align: "right" });

  // --- SECCIÓN: DATOS DEL CLIENTE ---
  doc.setDrawColor(230); // Línea sutil
  doc.line(14, 28, 196, 28);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DEL CLIENTE", 14, 38);

  // Cuadro de datos del cliente
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  let currentY = 46;

  if (cliente) {
    // Usamos un formato de etiqueta: valor para mayor orden
    const datos = [
      { label: "Nombre:", value: cliente.nombre || "Sin nombre" },
      { label: "CUIT/CUIL:", value: cliente.cuit || "-" },
      { label: "Teléfono:", value: cliente.telefono || "-" },
      { label: "Dirección:", value: `${cliente.direccion || "-"} (${cliente.localidad || "-"})` }
    ];

    datos.forEach(dato => {
      doc.setFont("helvetica", "bold");
      doc.text(dato.label, 14, currentY);
      doc.setFont("helvetica", "normal");
      doc.text(dato.value, 40, currentY); // Desplazado a la derecha del label
      currentY += 6;
    });
  } else {
    doc.text("Consumidor Final", 14, currentY);
    currentY += 6;
  }

  // --- TABLA DE PRODUCTOS ---
  // El startY ahora es dinámico según cuántos datos de cliente se escribieron
  autoTable(doc, {
    startY: currentY + 5,
    head: [["Producto", "Cantidad", "P. Unitario", "Subtotal"]],
    body: venta.detalles.map((item) => [
      `${item.variante?.producto?.nombre || ""} - ${item.variante?.nombre || ""}`,
      item.cantidad,
      `$${item.precioUnitario}`,
      `$${item.subtotal}`,
    ]),
    headStyles: { fillColor: [37, 99, 235], halign: 'center' },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' },
    },
    styles: { fontSize: 9 }
  });

  // --- TOTALES ---
  const finalY = doc.lastAutoTable?.finalY || 100;
  const margenDerecho = 196;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  // Subtotal
  doc.text("Subtotal:", 140, finalY + 10);
  doc.text(`$${venta.subtotal}`, margenDerecho, finalY + 10, { align: "right" });

  // Descuento (Solo si existe)
  if (venta.descuento > 0) {
    doc.text("Descuento:", 140, finalY + 16);
    doc.setTextColor(200, 0, 0); // Rojo para el descuento
    doc.text(`- $${venta.descuento}`, margenDerecho, finalY + 16, { align: "right" });
    doc.setTextColor(0);
  }

  // Línea de Total
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.5);
  doc.line(140, finalY + 20, 196, finalY + 20);

  // Total Final
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", 140, finalY + 28);
  doc.text(`$${venta.total}`, margenDerecho, finalY + 28, { align: "right" });

  // Guardar el PDF
  doc.save(`venta-${venta.id}.pdf`);
}

  function cerrarDetalle() {
    setDetalleOpen(false);
    setVentaDetalle(null);
  }

  function limpiarFiltros() {
    setCliente("");
    setDesde(getFechaHace7Dias());
    setHasta(getFechaHoy());
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
              onChange={(e) => setCliente(e.target.value)}
            />
          </div>

          <div>
            <label style={styles.label}>Desde</label>
            <input
              type="date"
              style={styles.input}
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
            />
          </div>

          <div>
            <label style={styles.label}>Hasta</label>
            <input
              type="date"
              style={styles.input}
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
          </div>
        </div>

        <div style={styles.filtrosActions}>
          <button style={styles.btnSecundario} onClick={limpiarFiltros}>
            Limpiar
          </button>

          <button style={styles.btnPrincipal} onClick={cargarVentas}>
            Buscar
          </button>
        </div>
      </div>

      <div style={styles.lista}>
        {loading && <div style={styles.empty}>Cargando ventas...</div>}

        {!loading && ventas.length === 0 && (
          <div style={styles.empty}>
            No se encontraron ventas para los filtros seleccionados.
          </div>
        )}

        {!loading &&
          ventas.map((venta) => (
            <div
              key={venta.id}
              style={styles.ventaFila}
              onClick={() => verDetalle(venta.id)}
            >
              <div style={styles.ventaLinea1}>
                <strong>Venta #{venta.id}</strong>
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
            </div>
          ))}
      </div>

      {detalleOpen && ventaDetalle && (
        <>
          <div style={styles.overlay} onClick={cerrarDetalle}></div>

          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Detalle de venta #{ventaDetalle.id}</h3>

            <div style={styles.detalleInfo}>
              <div>
                <strong>Fecha:</strong> {formatearFecha(ventaDetalle.fecha)}
              </div>
              <div>
                <strong>Cliente:</strong>{" "}
                {ventaDetalle.cliente?.nombre || "Consumidor Final"}
              </div>
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

              <div style={styles.totalRow}>
                <span>Total</span>
                <strong>${ventaDetalle.total}</strong>
              </div>
            </div>

            <div style={styles.modalActions}>
              <button style={styles.btnSecundario} onClick={cerrarDetalle}>
                Cerrar
              </button>

              <button
                style={styles.btnPrincipal}
                onClick={() => descargarPDF(ventaDetalle)}
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
    background: "#fff",
    border: "1px solid #e5e7eb",
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
    color: "#374151",
  },
  input: {
    width: "100%",
    padding: 10,
    borderRadius: 10,
    border: "1px solid #d1d5db",
    fontSize: 15,
    boxSizing: "border-box",
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
    background: "#2563eb",
    color: "#fff",
    padding: "10px 14px",
    fontWeight: 600,
  },
  btnSecundario: {
    border: "1px solid #d1d5db",
    borderRadius: 10,
    background: "#fff",
    color: "#111827",
    padding: "10px 14px",
    fontWeight: 600,
  },
  lista: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  empty: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 14,
    color: "#6b7280",
  },
  ventaFila: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    cursor: "pointer",
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
    color: "#6b7280",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
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
    background: "#fff",
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
  detalleLista: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    borderTop: "1px solid #f3f4f6",
    borderBottom: "1px solid #f3f4f6",
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
    color: "#374151",
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
  },
};