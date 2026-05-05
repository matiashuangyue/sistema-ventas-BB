import { useEffect, useState } from "react";
import { API_URL as API } from "../../config/api";
import LoadingContent from "../../components/LoadingContent";

const COBRANZAS_PAGE_SIZE = 10;

const TOTALES_INICIALES = {
  saldoPendiente: 0,
  clientesConSaldo: 0,
  ventasPendientes: 0,
};

const FORMAS_COBRO = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "TARJETA", label: "Tarjeta" },
  { value: "OTRO", label: "Otro" },
];

function formatearFecha(fechaIso) {
  if (!fechaIso) return "-";

  return new Date(fechaIso).toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatearMoneda(valor) {
  return `$${Number(valor || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
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

function calcularTotales(clientes) {
  return clientes.reduce(
    (acc, cliente) => ({
      saldoPendiente: acc.saldoPendiente + cliente.saldoPendiente,
      clientesConSaldo:
        acc.clientesConSaldo + (cliente.saldoPendiente > 0 ? 1 : 0),
      ventasPendientes:
        acc.ventasPendientes + cliente.cantidadVentasPendientes,
    }),
    TOTALES_INICIALES,
  );
}

function normalizarRespuestaResumen(data, page, limit) {
  if (Array.isArray(data)) {
    return {
      items: data,
      page: 1,
      limit: data.length || limit,
      total: data.length,
      totalPages: 1,
      totales: calcularTotales(data),
    };
  }

  const items = Array.isArray(data.items) ? data.items : [];

  return {
    items,
    page: Number(data.page || page),
    limit: Number(data.limit || limit),
    total: Number(data.total || 0),
    totalPages: Math.max(1, Number(data.totalPages || 1)),
    totales: data.totales || calcularTotales(items),
  };
}

async function obtenerResumenCobranzas(
  cliente = "",
  page = 1,
  limit = COBRANZAS_PAGE_SIZE,
) {
  const params = new URLSearchParams();

  params.set("page", String(Math.max(1, Number(page) || 1)));
  params.set("limit", String(limit));

  if (cliente.trim()) {
    params.append("cliente", cliente.trim());
  }

  const query = params.toString();
  const res = await fetch(`${API}/cobranzas/resumen${query ? `?${query}` : ""}`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Error cargando cobranzas");
  }

  return data;
}

export default function Cobranzas() {
  const [busqueda, setBusqueda] = useState("");
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cuenta, setCuenta] = useState(null);
  const [loadingCuenta, setLoadingCuenta] = useState(false);
  const [paginaClientes, setPaginaClientes] = useState(1);
  const [totalClientes, setTotalClientes] = useState(0);
  const [totalPaginasClientes, setTotalPaginasClientes] = useState(1);
  const [totales, setTotales] = useState(TOTALES_INICIALES);

  const [ventaCobro, setVentaCobro] = useState(null);
  const [montoCobro, setMontoCobro] = useState("");
  const [formaCobro, setFormaCobro] = useState("EFECTIVO");
  const [observacionesCobro, setObservacionesCobro] = useState("");
  const [registrandoCobro, setRegistrandoCobro] = useState(false);

  useEffect(() => {
    let cancelado = false;

    const timeout = setTimeout(async () => {
      try {
        setLoading(true);
        const data = await obtenerResumenCobranzas(busqueda, paginaClientes);
        const respuesta = normalizarRespuestaResumen(
          data,
          paginaClientes,
          COBRANZAS_PAGE_SIZE,
        );

        if (!cancelado) {
          setClientes(respuesta.items);
          setPaginaClientes(respuesta.page);
          setTotalClientes(respuesta.total);
          setTotalPaginasClientes(respuesta.totalPages);
          setTotales(respuesta.totales);
        }
      } catch (error) {
        console.error(error);
        alert(error.message);
      } finally {
        if (!cancelado) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelado = true;
      clearTimeout(timeout);
    };
  }, [busqueda, paginaClientes]);

  async function verCuenta(clienteId) {
    try {
      setLoadingCuenta(true);

      const res = await fetch(
        `${API}/cobranzas/clientes/${clienteId}/cuenta-corriente`,
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error cargando cuenta corriente");
      }

      setCuenta(data);
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setLoadingCuenta(false);
    }
  }

  function abrirCobro(venta) {
    setVentaCobro(venta);
    setMontoCobro(String(venta.saldoPendiente));
    setFormaCobro("EFECTIVO");
    setObservacionesCobro("");
  }

  function cerrarCobro() {
    setVentaCobro(null);
    setMontoCobro("");
    setFormaCobro("EFECTIVO");
    setObservacionesCobro("");
  }

  function aplicarResumen(respuesta) {
    setClientes(respuesta.items);
    setPaginaClientes(respuesta.page);
    setTotalClientes(respuesta.total);
    setTotalPaginasClientes(respuesta.totalPages);
    setTotales(respuesta.totales);
  }

  function cambiarPaginaClientes(nuevaPagina) {
    const pagina = Math.min(
      Math.max(1, nuevaPagina),
      totalPaginasClientes,
    );

    setPaginaClientes(pagina);
  }

  async function registrarCobro() {
    if (!ventaCobro) return;

    const monto = Number(montoCobro);

    if (!Number.isFinite(monto) || monto <= 0) {
      alert("El monto debe ser mayor a 0");
      return;
    }

    if (monto > ventaCobro.saldoPendiente) {
      alert("El monto no puede superar el saldo pendiente");
      return;
    }

    try {
      setRegistrandoCobro(true);

      const res = await fetch(`${API}/cobranzas/cobros`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ventaId: ventaCobro.id,
          monto,
          formaPago: formaCobro,
          observaciones: observacionesCobro.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error registrando cobro");
      }

      setCuenta(data);
      const resumen = await obtenerResumenCobranzas(busqueda, paginaClientes);
      aplicarResumen(
        normalizarRespuestaResumen(
          resumen,
          paginaClientes,
          COBRANZAS_PAGE_SIZE,
        ),
      );
      cerrarCobro();
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setRegistrandoCobro(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Cobranzas</h2>
      </div>

      <div style={styles.bloque}>
        <label style={styles.label}>Buscar cliente</label>
        <input
          style={styles.input}
          placeholder="Nombre, telefono, CUIT..."
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setPaginaClientes(1);
          }}
        />
      </div>

      <div style={styles.metricasGrid}>
        <div style={styles.metrica}>
          <span style={styles.metricaLabel}>Saldo pendiente</span>
          <strong style={styles.metricaValor}>
            {formatearMoneda(totales.saldoPendiente)}
          </strong>
        </div>
        <div style={styles.metrica}>
          <span style={styles.metricaLabel}>Clientes con deuda</span>
          <strong style={styles.metricaValor}>{totales.clientesConSaldo}</strong>
        </div>
        <div style={styles.metrica}>
          <span style={styles.metricaLabel}>Ventas pendientes</span>
          <strong style={styles.metricaValor}>{totales.ventasPendientes}</strong>
        </div>
      </div>

      <div style={styles.contenido}>
        <section style={styles.panel}>
          <h3 style={styles.panelTitle}>Clientes</h3>

          {loading && (
            <div style={styles.empty}>
              <LoadingContent loading={true} loadingText="Cargando cobranzas..." />
            </div>
          )}

          {!loading && clientes.length === 0 && (
            <div style={styles.empty}>No hay clientes para mostrar.</div>
          )}

          {!loading &&
            clientes.map((cliente) => (
              <button
                key={cliente.id}
                style={{
                  ...styles.clienteCard,
                  ...(cuenta?.cliente?.id === cliente.id
                    ? styles.clienteCardActivo
                    : {}),
                }}
                onClick={() => verCuenta(cliente.id)}
                type="button"
              >
                <div style={styles.clienteLinea1}>
                  <strong>{cliente.nombre}</strong>
                  <span
                    style={
                      cliente.saldoPendiente > 0
                        ? styles.saldoPendiente
                        : styles.saldoCero
                    }
                  >
                    {formatearMoneda(cliente.saldoPendiente)}
                  </span>
                </div>
                <div style={styles.clienteLinea2}>
                  <span>{cliente.telefono || cliente.localidad || "-"}</span>
                  <span>{cliente.cantidadVentasPendientes} pendiente(s)</span>
                </div>
              </button>
            ))}

          {!loading && totalPaginasClientes > 1 && (
            <div style={styles.pagination}>
              <button
                style={styles.btnSecundario}
                onClick={() => cambiarPaginaClientes(paginaClientes - 1)}
                disabled={loading || paginaClientes <= 1}
                type="button"
              >
                Anterior
              </button>
              <span style={styles.paginationText}>
                Pagina {paginaClientes} de {totalPaginasClientes}
                {totalClientes > 0 ? ` (${totalClientes} clientes)` : ""}
              </span>
              <button
                style={styles.btnSecundario}
                onClick={() => cambiarPaginaClientes(paginaClientes + 1)}
                disabled={loading || paginaClientes >= totalPaginasClientes}
                type="button"
              >
                Siguiente
              </button>
            </div>
          )}
        </section>

        <section style={styles.panel}>
          <h3 style={styles.panelTitle}>Cuenta corriente</h3>

          {loadingCuenta && (
            <div style={styles.empty}>
              <LoadingContent loading={true} loadingText="Cargando detalle..." />
            </div>
          )}

          {!loadingCuenta && !cuenta && (
            <div style={styles.empty}>
              Selecciona un cliente para ver su cuenta corriente.
            </div>
          )}

          {!loadingCuenta && cuenta && (
            <div style={styles.detalle}>
              <div style={styles.detalleHeader}>
                <div>
                  <strong>{cuenta.cliente.nombre}</strong>
                  <div style={styles.detalleMuted}>
                    {cuenta.cliente.telefono || cuenta.cliente.localidad || "-"}
                  </div>
                </div>
                <div style={styles.detalleSaldo}>
                  {formatearMoneda(cuenta.resumen.saldoPendiente)}
                </div>
              </div>

              <div style={styles.resumenGrid}>
                <div style={styles.resumenBox}>
                  <span>Vendido</span>
                  <strong>{formatearMoneda(cuenta.resumen.totalVendido)}</strong>
                </div>
                <div style={styles.resumenBox}>
                  <span>Cobrado</span>
                  <strong>{formatearMoneda(cuenta.resumen.totalCobrado)}</strong>
                </div>
                <div style={styles.resumenBox}>
                  <span>Pendientes</span>
                  <strong>{cuenta.resumen.ventasPendientes}</strong>
                </div>
              </div>

              <div style={styles.seccionDetalle}>
                <h4 style={styles.subTitle}>Ventas pendientes</h4>

                {cuenta.ventasPendientes.length === 0 && (
                  <div style={styles.emptyInterno}>No hay ventas pendientes.</div>
                )}

                {cuenta.ventasPendientes.map((venta) => (
                  <div key={venta.id} style={styles.ventaPendiente}>
                    <div>
                      <strong>Venta #{venta.id}</strong>
                      <div style={styles.detalleMuted}>
                        {formatearFecha(venta.fecha)}
                      </div>
                    </div>
                    <div style={styles.ventaNumeros}>
                      <span>Total {formatearMoneda(venta.total)}</span>
                      <strong>Saldo {formatearMoneda(venta.saldoPendiente)}</strong>
                    </div>
                    <button
                      style={styles.btnPrincipal}
                      onClick={() => abrirCobro(venta)}
                      type="button"
                    >
                      Cobrar
                    </button>
                  </div>
                ))}
              </div>

              <div style={styles.seccionDetalle}>
                <h4 style={styles.subTitle}>Movimientos</h4>

                {cuenta.movimientos.length === 0 && (
                  <div style={styles.emptyInterno}>Sin movimientos.</div>
                )}

                {cuenta.movimientos.map((movimiento) => (
                  <div key={movimiento.id} style={styles.movimiento}>
                    <div>
                      <strong>{movimiento.concepto}</strong>
                      <div style={styles.detalleMuted}>
                        {formatearFecha(movimiento.fecha)} -{" "}
                        {formatearFormaPago(movimiento.formaPago)}
                      </div>
                    </div>
                    <div style={styles.movimientoNumeros}>
                      <span
                        style={
                          movimiento.tipo === "DEBITO"
                            ? styles.debito
                            : styles.credito
                        }
                      >
                        {movimiento.tipo === "DEBITO" ? "+" : "-"}
                        {formatearMoneda(movimiento.monto)}
                      </span>
                      <strong>{formatearMoneda(movimiento.saldo)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {ventaCobro && (
        <>
          <div style={styles.overlay} onClick={cerrarCobro}></div>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Registrar cobro</h3>
            <div style={styles.detalleMuted}>
              Venta #{ventaCobro.id} - saldo{" "}
              {formatearMoneda(ventaCobro.saldoPendiente)}
            </div>

            <label style={styles.label}>Monto</label>
            <input
              type="number"
              min="0"
              max={ventaCobro.saldoPendiente}
              style={styles.input}
              value={montoCobro}
              disabled={registrandoCobro}
              onChange={(e) => setMontoCobro(e.target.value)}
            />

            <label style={styles.label}>Forma de pago</label>
            <select
              style={styles.input}
              value={formaCobro}
              disabled={registrandoCobro}
              onChange={(e) => setFormaCobro(e.target.value)}
            >
              {FORMAS_COBRO.map((forma) => (
                <option key={forma.value} value={forma.value}>
                  {forma.label}
                </option>
              ))}
            </select>

            <textarea
              style={styles.textarea}
              placeholder="Observaciones (opcional)"
              value={observacionesCobro}
              disabled={registrandoCobro}
              onChange={(e) => setObservacionesCobro(e.target.value)}
            />

            <div style={styles.modalActions}>
              <button
                style={styles.btnSecundario}
                onClick={cerrarCobro}
                disabled={registrandoCobro}
                type="button"
              >
                Cancelar
              </button>
              <button
                style={styles.btnPrincipal}
                onClick={registrarCobro}
                disabled={registrandoCobro}
                type="button"
              >
                <LoadingContent
                  loading={registrandoCobro}
                  loadingText="Guardando..."
                >
                  Guardar cobro
                </LoadingContent>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  container: { display: "flex", flexDirection: "column", gap: 16 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  title: { margin: 0, fontSize: 20 },
  bloque: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: 14,
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
    minHeight: 78,
    padding: 10,
    borderRadius: 10,
    border: "1px solid var(--border-strong)",
    fontSize: 14,
    boxSizing: "border-box",
    resize: "vertical",
  },
  metricasGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: 10,
  },
  metrica: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  metricaLabel: { fontSize: 12, color: "var(--text-muted)" },
  metricaValor: { fontSize: 18 },
  contenido: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 12,
    alignItems: "start",
  },
  panel: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: 14,
  },
  panelTitle: { margin: "0 0 12px 0", fontSize: 16 },
  empty: {
    background: "var(--surface-soft)",
    border: "1px solid var(--border-subtle)",
    borderRadius: 10,
    padding: 12,
    color: "var(--text-muted)",
  },
  emptyInterno: {
    border: "1px solid var(--border-subtle)",
    borderRadius: 10,
    padding: 10,
    color: "var(--text-muted)",
    fontSize: 13,
  },
  clienteCard: {
    width: "100%",
    border: "1px solid var(--border)",
    borderRadius: 10,
    background: "var(--surface)",
    color: "var(--text)",
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    textAlign: "left",
    marginBottom: 8,
  },
  clienteCardActivo: {
    borderColor: "var(--primary)",
    background: "var(--surface-selected)",
  },
  clienteLinea1: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    fontSize: 14,
  },
  clienteLinea2: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    fontSize: 12,
    color: "var(--text-muted)",
  },
  saldoPendiente: { color: "var(--danger)", fontWeight: 700 },
  saldoCero: { color: "var(--success)", fontWeight: 700 },
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
  detalle: { display: "flex", flexDirection: "column", gap: 14 },
  detalleHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
  },
  detalleMuted: { color: "var(--text-muted)", fontSize: 12, marginTop: 2 },
  detalleSaldo: { fontSize: 20, fontWeight: 800, color: "var(--danger)" },
  resumenGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(105px, 1fr))",
    gap: 8,
  },
  resumenBox: {
    border: "1px solid var(--border-subtle)",
    borderRadius: 10,
    padding: 10,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    fontSize: 12,
    color: "var(--text-muted)",
  },
  seccionDetalle: { display: "flex", flexDirection: "column", gap: 8 },
  subTitle: { margin: 0, fontSize: 15 },
  ventaPendiente: {
    border: "1px solid var(--border-subtle)",
    borderRadius: 10,
    padding: 10,
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 8,
  },
  ventaNumeros: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    fontSize: 13,
  },
  movimiento: {
    borderBottom: "1px solid var(--border-subtle)",
    padding: "8px 0",
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
  },
  movimientoNumeros: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 3,
    fontSize: 13,
  },
  debito: { color: "var(--danger)", fontWeight: 700 },
  credito: { color: "var(--success)", fontWeight: 700 },
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
    maxWidth: 430,
    maxHeight: "88vh",
    overflowY: "auto",
    background: "var(--surface)",
    borderRadius: 14,
    padding: 18,
    zIndex: 1000,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  modalTitle: { margin: 0 },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    flexWrap: "wrap",
  },
};
