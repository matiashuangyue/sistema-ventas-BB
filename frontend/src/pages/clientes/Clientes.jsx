import { useEffect, useState } from "react";
import { API_URL as API } from "../../config/api";
import LoadingContent from "../../components/LoadingContent";

const CLIENTES_PAGE_SIZE = 10;

function normalizarRespuestaClientes(data, page, limit) {
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

async function obtenerClientes({
  search = "",
  page = 1,
  limit = CLIENTES_PAGE_SIZE,
} = {}) {
  const params = new URLSearchParams({
    page: String(Math.max(1, Number(page) || 1)),
    limit: String(limit),
  });
  const texto = search.trim();

  if (texto) {
    params.set("search", texto);
  }

  const res = await fetch(`${API}/clientes?${params.toString()}`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Error cargando clientes");
  }

  return data;
}

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargandoClientes, setCargandoClientes] = useState(true);
  const [paginaClientes, setPaginaClientes] = useState(1);
  const [totalClientes, setTotalClientes] = useState(0);
  const [totalPaginasClientes, setTotalPaginasClientes] = useState(1);
  const [guardandoCliente, setGuardandoCliente] = useState(false);

  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [modalEditarOpen, setModalEditarOpen] = useState(false);

  const [clienteEditar, setClienteEditar] = useState(null);

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState(""); // 👈 Nuevo estado para Email
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [localidad, setLocalidad] = useState("");
  const [cuit, setCuit] = useState("");
  const [observaciones, setObservaciones] = useState("");

  useEffect(() => {
    let cancelado = false;

    const timeout = setTimeout(async () => {
      try {
        setCargandoClientes(true);
        const data = await obtenerClientes({
          search: busqueda,
          page: paginaClientes,
        });
        const respuesta = normalizarRespuestaClientes(
          data,
          paginaClientes,
          CLIENTES_PAGE_SIZE,
        );

        if (!cancelado) {
          setClientes(respuesta.items);
          setPaginaClientes(respuesta.page);
          setTotalClientes(respuesta.total);
          setTotalPaginasClientes(respuesta.totalPages);
        }
      } catch (error) {
        console.error(error);
        alert(error.message);
      } finally {
        if (!cancelado) {
          setCargandoClientes(false);
        }
      }
    }, 250);

    return () => {
      cancelado = true;
      clearTimeout(timeout);
    };
  }, [busqueda, paginaClientes]);

  function aplicarRespuestaClientes(respuesta) {
    setClientes(respuesta.items);
    setPaginaClientes(respuesta.page);
    setTotalClientes(respuesta.total);
    setTotalPaginasClientes(respuesta.totalPages);
  }

  async function recargarClientesActuales() {
    const data = await obtenerClientes({
      search: busqueda,
      page: paginaClientes,
    });
    aplicarRespuestaClientes(
      normalizarRespuestaClientes(data, paginaClientes, CLIENTES_PAGE_SIZE),
    );
  }

  function cambiarPaginaClientes(nuevaPagina) {
    const pagina = Math.min(
      Math.max(1, nuevaPagina),
      totalPaginasClientes,
    );

    setPaginaClientes(pagina);
  }

  function limpiarFormulario() {
    setNombre("");
    setEmail(""); // 👈 Limpiar email
    setTelefono("");
    setDireccion("");
    setLocalidad("");
    setCuit("");
    setObservaciones("");
  }

  function abrirModalNuevo() {
    limpiarFormulario();
    setModalNuevoOpen(true);
  }

  function cerrarModalNuevo() {
    setModalNuevoOpen(false);
    limpiarFormulario();
  }

  function abrirModalEditar(cliente) {
    setClienteEditar(cliente);
    setNombre(cliente.nombre || "");
    setEmail(cliente.email || ""); // 👈 Cargar email al editar
    setTelefono(cliente.telefono || "");
    setDireccion(cliente.direccion || "");
    setLocalidad(cliente.localidad || "");
    setCuit(cliente.cuit || "");
    setObservaciones(cliente.observaciones || "");
    setModalEditarOpen(true);
  }

  function cerrarModalEditar() {
    setModalEditarOpen(false);
    setClienteEditar(null);
    limpiarFormulario();
  }

  async function guardarNuevoCliente() {
    if (!nombre.trim()) return alert("El nombre es obligatorio");
    if (guardandoCliente) return;

    try {
      setGuardandoCliente(true);
      const res = await fetch(`${API}/clientes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          email: email.trim(), // 👈 Enviar email
          telefono: telefono.trim(),
          direccion: direccion.trim(),
          localidad: localidad.trim(),
          cuit: cuit.trim(),
          observaciones: observaciones.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error creando cliente");

      await recargarClientesActuales();
      cerrarModalNuevo();
    } catch (error) {
      alert(error.message);
    } finally {
      setGuardandoCliente(false);
    }
  }

  async function guardarEdicionCliente() {
    if (!clienteEditar || !nombre.trim()) return alert("Nombre obligatorio");
    if (guardandoCliente) return;

    try {
      setGuardandoCliente(true);
      const res = await fetch(`${API}/clientes/${clienteEditar.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          email: email.trim(), // 👈 Actualizar email
          telefono: telefono.trim(),
          direccion: direccion.trim(),
          localidad: localidad.trim(),
          cuit: cuit.trim(),
          observaciones: observaciones.trim(),
        }),
      });

      if (!res.ok) throw new Error("Error editando cliente");

      await recargarClientesActuales();
      cerrarModalEditar();
    } catch (error) {
      alert(error.message);
    } finally {
      setGuardandoCliente(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Clientes</h2>
        <button style={styles.btnNuevo} onClick={abrirModalNuevo}>+ Nuevo</button>
      </div>

      <div style={styles.bloque}>
        <input
          style={styles.input}
          placeholder="Buscar por nombre, mail, CUIT..."
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setPaginaClientes(1);
          }}
        />
      </div>

      <div style={styles.lista}>
        {cargandoClientes && (
          <div style={styles.empty}>
            <LoadingContent loading={true} loadingText="Cargando clientes..." />
          </div>
        )}

        {!cargandoClientes && clientes.length === 0 && (
          <div style={styles.empty}>No hay clientes para mostrar.</div>
        )}

        {!cargandoClientes && clientes.map((cliente) => (
          <div key={cliente.id} style={styles.card}>
            <div style={styles.linea1}>
              <div style={styles.nombre}>{cliente.nombre}</div>
              <button style={styles.btnEditar} onClick={() => abrirModalEditar(cliente)}>Editar</button>
            </div>

            <div style={styles.datosGrid}>
              <div style={styles.dato}><strong>Email:</strong> {cliente.email || "-"}</div>
              <div style={styles.dato}><strong>Tel:</strong> {cliente.telefono || "-"}</div>
              <div style={styles.dato}><strong>CUIT:</strong> {cliente.cuit || "-"}</div>
              <div style={styles.dato}><strong>Ubicación:</strong> {cliente.direccion} ({cliente.localidad})</div>
            </div>

            {cliente.observaciones && (
              <div style={styles.observaciones}><strong>Obs:</strong> {cliente.observaciones}</div>
            )}
          </div>
        ))}

        {!cargandoClientes && totalPaginasClientes > 1 && (
          <div style={styles.pagination}>
            <button
              style={styles.btnSecundario}
              onClick={() => cambiarPaginaClientes(paginaClientes - 1)}
              disabled={paginaClientes <= 1}
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
              disabled={paginaClientes >= totalPaginasClientes}
              type="button"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      {/* MODAL (Nuevo / Editar) */}
      {(modalNuevoOpen || modalEditarOpen) && (
        <>
          <div
            style={styles.overlay}
            onClick={
              guardandoCliente
                ? undefined
                : modalNuevoOpen
                  ? cerrarModalNuevo
                  : cerrarModalEditar
            }
          ></div>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>{modalNuevoOpen ? "Nuevo Cliente" : "Editar Cliente"}</h3>
            <input style={styles.input} placeholder="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} />
            <input style={styles.input} placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            <input style={styles.input} placeholder="Teléfono" value={telefono} onChange={e => setTelefono(e.target.value)} />
            <input style={styles.input} placeholder="CUIT" value={cuit} onChange={e => setCuit(e.target.value)} />
            <input style={styles.input} placeholder="Dirección" value={direccion} onChange={e => setDireccion(e.target.value)} />
            <input style={styles.input} placeholder="Localidad" value={localidad} onChange={e => setLocalidad(e.target.value)} />
            <textarea style={styles.textarea} placeholder="Observaciones" value={observaciones} onChange={e => setObservaciones(e.target.value)} />
            
            <div style={styles.modalActions}>
              <button
                style={styles.btnSecundario}
                onClick={modalNuevoOpen ? cerrarModalNuevo : cerrarModalEditar}
                disabled={guardandoCliente}
              >
                Cancelar
              </button>
              <button
                style={styles.btnNuevo}
                onClick={modalNuevoOpen ? guardarNuevoCliente : guardarEdicionCliente}
                disabled={guardandoCliente}
              >
                <LoadingContent
                  loading={guardandoCliente}
                  loadingText="Guardando..."
                >
                  Guardar
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
  bloque: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 12 },
  input: { width: "100%", padding: 12, borderRadius: 10, border: "1px solid var(--border-strong)", fontSize: 15, boxSizing: "border-box" },
  textarea: { width: "100%", minHeight: 80, padding: 10, borderRadius: 10, border: "1px solid var(--border-strong)", fontSize: 15, boxSizing: "border-box", resize: "none" },
  lista: { display: "flex", flexDirection: "column", gap: 10 },
  empty: { background: "var(--surface-soft)", border: "1px solid var(--border-subtle)", borderRadius: 10, padding: 12, color: "var(--text-muted)" },
  card: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 8 },
  linea1: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  nombre: { fontWeight: 700, fontSize: 16, color: "var(--text)" },
  datosGrid: { display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "var(--text-soft)" },
  dato: { lineHeight: "1.4" },
  observaciones: { fontSize: 12, color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)", paddingTop: 8, marginTop: 4 },
  btnNuevo: { border: "none", borderRadius: 10, background: "var(--primary)", color: "var(--text-inverse)", padding: "10px 16px", fontWeight: 600, cursor: "pointer" },
  btnEditar: { border: "1px solid var(--border-strong)", borderRadius: 8, background: "var(--surface)", color: "var(--text-soft)", padding: "6px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnSecundario: { border: "1px solid var(--border-strong)", borderRadius: 10, background: "var(--surface)", padding: "10px 16px", fontWeight: 600, cursor: "pointer" },
  pagination: { alignItems: "center", display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", padding: "4px 0" },
  paginationText: { color: "var(--text-soft)", fontSize: 13, fontWeight: 600 },
  overlay: { position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.46)", zIndex: 999 },
  modal: { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "90%", maxWidth: 450, background: "var(--surface)", borderRadius: 16, padding: 20, zIndex: 1000, display: "flex", flexDirection: "column", gap: 12, maxHeight: "90vh", overflowY: "auto" },
  modalTitle: { margin: "0 0 8px 0", fontSize: 18 },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 },
};
