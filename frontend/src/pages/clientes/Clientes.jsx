import { useEffect, useMemo, useState } from "react";
import { API_URL as API } from "../../config/api";

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");

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
    cargarClientes();
  }, []);

  async function cargarClientes() {
    try {
      const res = await fetch(`${API}/clientes`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error cargando clientes");
      setClientes(data);
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  const clientesFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return clientes;

    return clientes.filter((cliente) => {
      const combinado = `
        ${cliente.nombre || ""}
        ${cliente.email || ""}
        ${cliente.telefono || ""}
        ${cliente.direccion || ""}
        ${cliente.localidad || ""}
        ${cliente.cuit || ""}
      `.toLowerCase();
      return combinado.includes(texto);
    });
  }, [clientes, busqueda]);

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

    try {
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

      await cargarClientes();
      cerrarModalNuevo();
    } catch (error) {
      alert(error.message);
    }
  }

  async function guardarEdicionCliente() {
    if (!clienteEditar || !nombre.trim()) return alert("Nombre obligatorio");

    try {
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

      await cargarClientes();
      cerrarModalEditar();
    } catch (error) {
      alert(error.message);
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
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div style={styles.lista}>
        {clientesFiltrados.map((cliente) => (
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
      </div>

      {/* MODAL (Nuevo / Editar) */}
      {(modalNuevoOpen || modalEditarOpen) && (
        <>
          <div style={styles.overlay} onClick={modalNuevoOpen ? cerrarModalNuevo : cerrarModalEditar}></div>
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
              <button style={styles.btnSecundario} onClick={modalNuevoOpen ? cerrarModalNuevo : cerrarModalEditar}>Cancelar</button>
              <button style={styles.btnNuevo} onClick={modalNuevoOpen ? guardarNuevoCliente : guardarEdicionCliente}>Guardar</button>
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
  card: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 8 },
  linea1: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  nombre: { fontWeight: 700, fontSize: 16, color: "var(--text)" },
  datosGrid: { display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "var(--text-soft)" },
  dato: { lineHeight: "1.4" },
  observaciones: { fontSize: 12, color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)", paddingTop: 8, marginTop: 4 },
  btnNuevo: { border: "none", borderRadius: 10, background: "var(--primary)", color: "var(--text-inverse)", padding: "10px 16px", fontWeight: 600, cursor: "pointer" },
  btnEditar: { border: "1px solid var(--border-strong)", borderRadius: 8, background: "var(--surface)", color: "var(--text-soft)", padding: "6px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnSecundario: { border: "1px solid var(--border-strong)", borderRadius: 10, background: "var(--surface)", padding: "10px 16px", fontWeight: 600, cursor: "pointer" },
  overlay: { position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.46)", zIndex: 999 },
  modal: { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "90%", maxWidth: 450, background: "var(--surface)", borderRadius: 16, padding: 20, zIndex: 1000, display: "flex", flexDirection: "column", gap: 12, maxHeight: "90vh", overflowY: "auto" },
  modalTitle: { margin: "0 0 8px 0", fontSize: 18 },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 },
};
