import { useEffect, useMemo, useState } from "react";

const API = "http://localhost:8080";

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [modalEditarOpen, setModalEditarOpen] = useState(false);

  const [clienteEditar, setClienteEditar] = useState(null);

  const [nombre, setNombre] = useState("");
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

      if (!res.ok) {
        throw new Error(data.error || "Error cargando clientes");
      }

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
    if (!nombre.trim()) {
      alert("El nombre es obligatorio");
      return;
    }

    try {
      const res = await fetch(`${API}/clientes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: nombre.trim(),
          telefono: telefono.trim(),
          direccion: direccion.trim(),
          localidad: localidad.trim(),
          cuit: cuit.trim(),
          observaciones: observaciones.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error creando cliente");
      }

      await cargarClientes();
      cerrarModalNuevo();
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  async function guardarEdicionCliente() {
    if (!clienteEditar) return;

    if (!nombre.trim()) {
      alert("El nombre es obligatorio");
      return;
    }

    try {
      const res = await fetch(`${API}/clientes/${clienteEditar.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: nombre.trim(),
          telefono: telefono.trim(),
          direccion: direccion.trim(),
          localidad: localidad.trim(),
          cuit: cuit.trim(),
          observaciones: observaciones.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error editando cliente");
      }

      await cargarClientes();
      cerrarModalEditar();
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Clientes</h2>

        <button style={styles.btnNuevo} onClick={abrirModalNuevo}>
          + Nuevo cliente
        </button>
      </div>

      <div style={styles.bloque}>
        <label style={styles.label}>Buscar cliente</label>
        <input
          style={styles.input}
          placeholder="Buscar por nombre, teléfono, dirección o CUIT..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div style={styles.lista}>
        {clientesFiltrados.length === 0 && (
          <div style={styles.empty}>No se encontraron clientes.</div>
        )}

        {clientesFiltrados.map((cliente) => (
          <div key={cliente.id} style={styles.card}>
            <div style={styles.linea1}>
              <div style={styles.nombre}>{cliente.nombre}</div>

              <button
                style={styles.btnEditar}
                onClick={() => abrirModalEditar(cliente)}
              >
                Editar
              </button>
            </div>

            <div style={styles.linea2}>
              <div style={styles.dato}>
                <strong>Tel:</strong> {cliente.telefono || "-"}
              </div>
              <div style={styles.dato}>
                <strong>CUIT:</strong> {cliente.cuit || "-"}
              </div>
            </div>

            <div style={styles.linea2}>
              <div style={styles.dato}>
                <strong>Dirección:</strong> {cliente.direccion || "-"}
              </div>
              <div style={styles.dato}>
                <strong>Localidad:</strong> {cliente.localidad || "-"}
              </div>
            </div>

            {cliente.observaciones && (
              <div style={styles.observaciones}>
                <strong>Obs:</strong> {cliente.observaciones}
              </div>
            )}
          </div>
        ))}
      </div>

      {modalNuevoOpen && (
        <>
          <div style={styles.overlay} onClick={cerrarModalNuevo}></div>

          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Nuevo cliente</h3>

            <input
              style={styles.input}
              placeholder="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />

            <input
              style={styles.input}
              placeholder="Teléfono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
            />

            <input
              style={styles.input}
              placeholder="Dirección"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
            />

            <input
              style={styles.input}
              placeholder="Localidad"
              value={localidad}
              onChange={(e) => setLocalidad(e.target.value)}
            />

            <input
              style={styles.input}
              placeholder="CUIT"
              value={cuit}
              onChange={(e) => setCuit(e.target.value)}
            />

            <textarea
              style={styles.textarea}
              placeholder="Observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />

            <div style={styles.modalActions}>
              <button style={styles.btnSecundario} onClick={cerrarModalNuevo}>
                Cancelar
              </button>

              <button style={styles.btnNuevo} onClick={guardarNuevoCliente}>
                Guardar
              </button>
            </div>
          </div>
        </>
      )}

      {modalEditarOpen && clienteEditar && (
        <>
          <div style={styles.overlay} onClick={cerrarModalEditar}></div>

          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Editar cliente</h3>

            <input
              style={styles.input}
              placeholder="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />

            <input
              style={styles.input}
              placeholder="Teléfono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
            />

            <input
              style={styles.input}
              placeholder="Dirección"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
            />

            <input
              style={styles.input}
              placeholder="Localidad"
              value={localidad}
              onChange={(e) => setLocalidad(e.target.value)}
            />

            <input
              style={styles.input}
              placeholder="CUIT"
              value={cuit}
              onChange={(e) => setCuit(e.target.value)}
            />

            <textarea
              style={styles.textarea}
              placeholder="Observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />

            <div style={styles.modalActions}>
              <button style={styles.btnSecundario} onClick={cerrarModalEditar}>
                Cancelar
              </button>

              <button style={styles.btnNuevo} onClick={guardarEdicionCliente}>
                Guardar cambios
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
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
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
  textarea: {
    width: "100%",
    minHeight: 90,
    padding: 10,
    borderRadius: 10,
    border: "1px solid #d1d5db",
    fontSize: 15,
    boxSizing: "border-box",
    resize: "vertical",
  },
  lista: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  empty: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 14,
    color: "#6b7280",
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  linea1: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  nombre: {
    fontWeight: 700,
    fontSize: 16,
  },
  linea2: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    fontSize: 14,
    color: "#374151",
  },
  dato: {
    lineHeight: 1.3,
  },
  observaciones: {
    fontSize: 13,
    color: "#4b5563",
    borderTop: "1px solid #f3f4f6",
    paddingTop: 8,
  },
  btnNuevo: {
    border: "none",
    borderRadius: 10,
    background: "#2563eb",
    color: "#fff",
    padding: "10px 14px",
    fontWeight: 600,
  },
  btnEditar: {
    border: "1px solid #d1d5db",
    borderRadius: 10,
    background: "#fff",
    color: "#111827",
    padding: "8px 12px",
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
    background: "#fff",
    borderRadius: 14,
    padding: 18,
    zIndex: 1000,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    maxHeight: "85vh",
    overflowY: "auto",
  },
  modalTitle: {
    margin: 0,
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
  },
};