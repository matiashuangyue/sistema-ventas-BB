import { useEffect, useState } from "react";
import { API_URL as API } from "../../config/api";
import LoadingContent from "../../components/LoadingContent";
import MovimientoCuentaDialog from "./MovimientoCuentaDialog";
import {
  abrirVentanaCobros,
  formatearDiaCobros,
  imprimirCobrosDiarios,
  obtenerFechaActualCobros,
} from "./imprimirCobrosDiarios";

const COBRANZAS_PAGE_SIZE = 10;

const TOTALES_INICIALES = {
  saldoPendiente: 0,
  clientesConSaldo: 0,
  ventasPendientes: 0,
};

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

  return labels[formaPago] || formaPago || "";
}

function formatearSaldo(valor) {
  return valor < 0 ? `${formatearMoneda(Math.abs(valor))} a favor` : formatearMoneda(valor);
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

async function obtenerResumenCobranzas({
  cliente = "",
  page = 1,
  limit = COBRANZAS_PAGE_SIZE,
  soloConDeuda = false,
} = {}) {
  const params = new URLSearchParams();

  params.set("page", String(Math.max(1, Number(page) || 1)));
  params.set("limit", String(limit));

  if (cliente.trim()) {
    params.append("cliente", cliente.trim());
  }

  if (soloConDeuda) {
    params.set("soloConDeuda", "true");
  }

  const query = params.toString();
  const res = await fetch(`${API}/cobranzas/resumen${query ? `?${query}` : ""}`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Error cargando cobranzas");
  }

  return data;
}

export default function Cobranzas({ clienteInicialId = null, onVolverVenta }) {
  const [busqueda, setBusqueda] = useState("");
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cuenta, setCuenta] = useState(null);
  const [loadingCuenta, setLoadingCuenta] = useState(clienteInicialId != null);
  const [errorCuenta, setErrorCuenta] = useState("");
  const [solicitudCuenta, setSolicitudCuenta] = useState(() =>
    clienteInicialId != null ? { clienteId: clienteInicialId } : null,
  );
  const [paginaClientes, setPaginaClientes] = useState(1);
  const [totalClientes, setTotalClientes] = useState(0);
  const [totalPaginasClientes, setTotalPaginasClientes] = useState(1);
  const [totales, setTotales] = useState(TOTALES_INICIALES);
  const [soloConDeuda, setSoloConDeuda] = useState(false);
  const [ventasDetalleAbiertas, setVentasDetalleAbiertas] = useState({});

  const [operacionCuenta, setOperacionCuenta] = useState(null);
  const [revisionResumen, setRevisionResumen] = useState(0);
  const [avisoCuenta, setAvisoCuenta] = useState("");
  const operacionAbierta = operacionCuenta !== null;
  const [fechaListado, setFechaListado] = useState(() => obtenerFechaActualCobros());
  const [accionListado, setAccionListado] = useState(null);
  const [avisoListado, setAvisoListado] = useState(null);
  const preparandoListado = accionListado !== null;

  useEffect(() => {
    let cancelado = false;

    const timeout = setTimeout(async () => {
      try {
        setLoading(true);
        const data = await obtenerResumenCobranzas({
          cliente: busqueda,
          page: paginaClientes,
          soloConDeuda,
        });
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
  }, [busqueda, paginaClientes, soloConDeuda, revisionResumen]);

  useEffect(() => {
    if (!solicitudCuenta) return;

    const controller = new AbortController();

    async function cargarCuenta() {
      try {
        const res = await fetch(
          `${API}/cobranzas/clientes/${solicitudCuenta.clienteId}/cuenta-corriente`,
          { signal: controller.signal },
        );
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Error cargando cuenta corriente");
        }

        if (!controller.signal.aborted) {
          setCuenta(data);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(error);
          setErrorCuenta(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingCuenta(false);
        }
      }
    }

    cargarCuenta();

    return () => controller.abort();
  }, [solicitudCuenta]);

  function verCuenta(clienteId) {
    setLoadingCuenta(true);
    setErrorCuenta("");
    setCuenta(null);
    setVentasDetalleAbiertas({});
    setAvisoCuenta("");
    setSolicitudCuenta({ clienteId });
  }

  function abrirCobro(venta = null) {
    setOperacionCuenta({ tipo: "cobro", venta });
  }

  function movimientoGuardado(data, mensaje) {
    setCuenta(data);
    setOperacionCuenta(null);
    setAvisoCuenta(mensaje);
    setAvisoListado(null);
    // El movimiento ya quedó guardado. Una falla al recargar el listado no
    // debe dejar el formulario abierto y permitir registrar el mismo otra vez.
    setRevisionResumen((actual) => actual + 1);
  }

  function cambiarPaginaClientes(nuevaPagina) {
    const pagina = Math.min(
      Math.max(1, nuevaPagina),
      totalPaginasClientes,
    );

    setPaginaClientes(pagina);
  }

  function alternarFiltroDeuda() {
    setSoloConDeuda((actual) => !actual);
    setPaginaClientes(1);
  }

  function limpiarFiltroDeuda() {
    setSoloConDeuda(false);
    setPaginaClientes(1);
  }

  function alternarDetalleVenta(ventaId) {
    setVentasDetalleAbiertas((prev) => ({
      ...prev,
      [ventaId]: !prev[ventaId],
    }));
  }

  async function generarListadoCobranzas(accion = "imprimir") {
    if (preparandoListado || operacionAbierta) return;
    if (!fechaListado) {
      setAvisoListado({ error: true, texto: "Elegí una fecha para generar el listado de cobranzas." });
      return;
    }

    let ventana;
    setAvisoListado(null);
    setAccionListado(accion);

    try {
      if (accion === "imprimir") ventana = abrirVentanaCobros(fechaListado);
      const params = new URLSearchParams({ fecha: fechaListado });
      const res = await fetch(`${API}/cobranzas/cobros?${params}`, { cache: "no-store" });
      const reporte = await res.json();

      if (!res.ok) {
        throw new Error(reporte.error || "No se pudo cargar el listado de cobranzas.");
      }

      if (reporte.items.length === 0) {
        ventana?.close();
        setAvisoListado({
          error: false,
          texto: `No hay cobranzas registradas el ${formatearDiaCobros(reporte.fecha)}.`,
        });
        return;
      }

      if (accion === "pdf") {
        const { descargarPdfCobrosDiarios } = await import("./pdfCobrosDiarios");
        await descargarPdfCobrosDiarios(reporte);
        setAvisoListado({
          error: false,
          texto: `Descarga del PDF de cobranzas del ${formatearDiaCobros(reporte.fecha)} iniciada.`,
        });
      } else {
        imprimirCobrosDiarios(ventana, reporte);
        setAvisoListado({
          error: false,
          texto: `Listado del ${formatearDiaCobros(reporte.fecha)} listo para imprimir.`,
        });
      }
    } catch (error) {
      if (ventana && !ventana.closed) ventana.close();
      setAvisoListado({
        error: true,
        texto: error.message || "No se pudo preparar el listado de cobranzas.",
      });
    } finally {
      setAccionListado(null);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Cobranzas</h2>
        <div style={styles.headerActions}>
          <form
            style={styles.listadoActions}
            onSubmit={(event) => {
              event.preventDefault();
              generarListadoCobranzas(event.nativeEvent.submitter?.value === "pdf" ? "pdf" : "imprimir");
            }}
          >
            <div>
              <label htmlFor="fecha-listado-cobranzas" style={styles.label}>
                Fecha de cobranzas
              </label>
              <input
                id="fecha-listado-cobranzas"
                style={styles.input}
                type="date"
                min="0001-01-01"
                max="9999-12-31"
                required
                value={fechaListado}
                disabled={preparandoListado || operacionAbierta}
                onChange={(event) => {
                  setFechaListado(event.target.value);
                  setAvisoListado(null);
                }}
              />
            </div>
            <button
              style={styles.btnSecundario}
              disabled={preparandoListado || operacionAbierta}
              type="button"
              onClick={() => {
                setFechaListado(obtenerFechaActualCobros());
                setAvisoListado(null);
              }}
            >
              Hoy
            </button>
            <button
              style={styles.btnPrincipal}
              disabled={preparandoListado || operacionAbierta || !fechaListado}
              type="submit"
              value="imprimir"
            >
              <LoadingContent loading={accionListado === "imprimir"} loadingText="Preparando listado...">
                Imprimir cobranzas
              </LoadingContent>
            </button>
            <button
              style={styles.btnSecundario}
              disabled={preparandoListado || operacionAbierta || !fechaListado}
              type="submit"
              value="pdf"
            >
              <LoadingContent loading={accionListado === "pdf"} loadingText="Generando PDF...">
                Descargar PDF
              </LoadingContent>
            </button>
          </form>
          {onVolverVenta && (
            <button
              style={styles.btnSecundario}
              onClick={onVolverVenta}
              disabled={operacionAbierta}
              type="button"
            >
              Volver a la venta
            </button>
          )}
        </div>
      </div>

      {avisoListado && (
        <div
          style={{ ...styles.bloque, color: avisoListado.error ? "var(--danger)" : "var(--text-soft)" }}
          role={avisoListado.error ? "alert" : "status"}
        >
          {avisoListado.texto}
        </div>
      )}

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
          <span style={styles.metricaLabel}>Saldo neto</span>
          <strong style={styles.metricaValor}>
            {formatearSaldo(totales.saldoPendiente)}
          </strong>
          <span style={styles.detalleMuted}>Deudas menos saldos a favor</span>
        </div>
        <button
          style={{
            ...styles.metrica,
            ...styles.metricaButton,
            ...(soloConDeuda ? styles.metricaActiva : {}),
          }}
          onClick={alternarFiltroDeuda}
          type="button"
        >
          <span style={styles.metricaLabel}>Clientes con deuda</span>
          <strong style={styles.metricaValor}>{totales.clientesConSaldo}</strong>
        </button>
        <div style={styles.metrica}>
          <span style={styles.metricaLabel}>Ventas pendientes</span>
          <strong style={styles.metricaValor}>{totales.ventasPendientes}</strong>
        </div>
      </div>

      {soloConDeuda && (
        <div style={styles.filtroActivo}>
          <span>Mostrando solo clientes con deuda.</span>
          <button
            style={styles.btnSecundario}
            onClick={limpiarFiltroDeuda}
            type="button"
          >
            Mostrar todos
          </button>
        </div>
      )}

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
                    {formatearSaldo(cliente.saldoPendiente)}
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

          {!loadingCuenta && errorCuenta && (
            <div style={styles.empty} role="alert">
              <p>{errorCuenta}</p>
              <button
                style={styles.btnSecundario}
                onClick={() => verCuenta(solicitudCuenta.clienteId)}
                type="button"
              >
                Reintentar
              </button>
            </div>
          )}

          {!loadingCuenta && !errorCuenta && !cuenta && (
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
                <div style={{ ...styles.detalleSaldo, ...(cuenta.resumen.saldoPendiente <= 0 ? styles.saldoCero : {}) }}>
                  <div style={styles.detalleMuted}>
                    {cuenta.resumen.saldoPendiente < 0 ? "Saldo a favor" : "Saldo pendiente"}
                  </div>
                  {formatearMoneda(Math.abs(cuenta.resumen.saldoPendiente))}
                </div>
              </div>

              <div style={styles.headerActions}>
                <button
                  style={styles.btnPrincipal}
                  type="button"
                  disabled={operacionAbierta || cuenta.resumen.saldoPendiente <= 0}
                  onClick={() => abrirCobro()}
                >
                  Registrar cobro
                </button>
                <button
                  style={styles.btnSecundario}
                  type="button"
                  disabled={operacionAbierta}
                  onClick={() => setOperacionCuenta({ tipo: "ajuste" })}
                >
                  Ajustar saldo
                </button>
              </div>

              {avisoCuenta && <div style={styles.emptyInterno} role="status">{avisoCuenta}</div>}

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
                  <span>Ajustes netos</span>
                  <strong>{formatearMoneda(cuenta.resumen.totalAjustes || 0)}</strong>
                </div>
                <div style={styles.resumenBox}>
                  <span>Pendientes</span>
                  <strong>{cuenta.resumen.ventasPendientes}</strong>
                </div>
              </div>

              <div style={styles.seccionDetalle}>
                <h4 style={styles.subTitle}>Ventas con saldo pendiente</h4>
                <div style={styles.detalleMuted}>
                  Estos saldos corresponden a cada venta. El saldo de la cuenta también incluye los ajustes manuales.
                </div>

                {cuenta.ventasPendientes.length === 0 && (
                  <div style={styles.emptyInterno}>No hay ventas pendientes.</div>
                )}

                {cuenta.ventasPendientes.map((venta) => {
                  const detalleAbierto = Boolean(
                    ventasDetalleAbiertas[venta.id],
                  );

                  return (
                    <div key={venta.id} style={styles.ventaPendiente}>
                      <div>
                        <strong>Venta #{venta.id}</strong>
                        <div style={styles.detalleMuted}>
                          {formatearFecha(venta.fecha)}
                        </div>
                      </div>
                      <div style={styles.ventaNumeros}>
                        <span>Total {formatearMoneda(venta.total)}</span>
                        <strong>
                          Saldo {formatearMoneda(venta.saldoPendiente)}
                        </strong>
                      </div>

                      <div style={styles.ventaPendienteActions}>
                        <button
                          style={styles.btnSecundario}
                          onClick={() => alternarDetalleVenta(venta.id)}
                          type="button"
                        >
                          {detalleAbierto ? "Ocultar detalle" : "Ver detalle"}
                        </button>
                        <button
                          style={styles.btnPrincipal}
                          onClick={() => abrirCobro(venta)}
                          disabled={operacionAbierta || cuenta.resumen.saldoPendiente <= 0}
                          type="button"
                        >
                          Cobrar
                        </button>
                      </div>

                      {detalleAbierto && (
                        <div style={styles.ventaDetalleBox}>
                          <div style={styles.ventaDetalleResumen}>
                            <span>
                              Pagado {formatearMoneda(venta.montoPagado)}
                            </span>
                            {venta.descuento > 0 && (
                              <span>
                                Descuento {formatearMoneda(venta.descuento)}
                              </span>
                            )}
                          </div>

                          {venta.detalles?.length > 0 ? (
                            venta.detalles.map((item) => (
                              <div key={item.id} style={styles.ventaDetalleItem}>
                                <div style={styles.ventaDetalleProducto}>
                                  {item.productoNombre} - {item.varianteNombre}
                                </div>
                                <div style={styles.ventaDetalleNumeros}>
                                  <span>x{item.cantidad}</span>
                                  <span>
                                    {formatearMoneda(item.precioUnitario)}
                                  </span>
                                  <strong>
                                    {formatearMoneda(item.subtotal)}
                                  </strong>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div style={styles.emptyInterno}>
                              Esta venta no tiene detalle de productos.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
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
                        {formatearFecha(movimiento.fecha)}
                        {movimiento.ajusteId ? " · Ajuste manual" : ""}
                        {movimiento.formaPago ? ` · ${formatearFormaPago(movimiento.formaPago)}` : ""}
                      </div>
                      {movimiento.observaciones && (
                        <div style={styles.movimientoObservaciones}>{movimiento.observaciones}</div>
                      )}
                      {movimiento.ajusteId && movimiento.usuario?.nombre && (
                        <div style={styles.detalleMuted}>Registrado por {movimiento.usuario.nombre}</div>
                      )}
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
                      <strong>{formatearSaldo(movimiento.saldo)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {operacionCuenta && cuenta && (
        <MovimientoCuentaDialog
          key={`${cuenta.cliente.id}-${operacionCuenta.tipo}-${operacionCuenta.venta?.id || "general"}`}
          cuenta={cuenta}
          operacion={operacionCuenta}
          onCerrar={() => setOperacionCuenta(null)}
          onGuardado={movimientoGuardado}
        />
      )}
    </div>
  );
}

const styles = {
  container: { display: "flex", flexDirection: "column", gap: 16 },
  header: { display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", alignItems: "center" },
  headerActions: { display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 8 },
  listadoActions: { display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 8 },
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
  metricaButton: {
    alignItems: "flex-start",
    color: "var(--text)",
    textAlign: "left",
  },
  metricaActiva: {
    borderColor: "var(--primary)",
    background: "var(--surface-selected)",
  },
  metricaLabel: { fontSize: 12, color: "var(--text-muted)" },
  metricaValor: { fontSize: 18 },
  filtroActivo: {
    alignItems: "center",
    background: "var(--surface-selected)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    color: "var(--text-soft)",
    display: "flex",
    flexWrap: "wrap",
    fontSize: 13,
    gap: 10,
    justifyContent: "space-between",
    padding: 12,
  },
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
  ventaPendienteActions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  },
  ventaDetalleBox: {
    borderTop: "1px solid var(--border-subtle)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    paddingTop: 8,
  },
  ventaDetalleResumen: {
    color: "var(--text-soft)",
    display: "flex",
    flexWrap: "wrap",
    fontSize: 12,
    gap: 10,
  },
  ventaDetalleItem: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  ventaDetalleProducto: {
    fontSize: 13,
    fontWeight: 600,
  },
  ventaDetalleNumeros: {
    color: "var(--text-soft)",
    display: "grid",
    fontSize: 12,
    gap: 8,
    gridTemplateColumns: "48px 1fr 1fr",
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
  movimientoObservaciones: {
    color: "var(--text-soft)",
    fontSize: 13,
    marginTop: 4,
    overflowWrap: "anywhere",
    whiteSpace: "pre-wrap",
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
};
