import { useEffect, useMemo, useState } from "react";
import { getToken } from "../services/auth";

const API = "http://localhost:8080";

export default function Productos() {
  const token = getToken();

  const [variantes, setVariantes] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [varianteSeleccionada, setVarianteSeleccionada] = useState(null);
  const [cantidadStock, setCantidadStock] = useState("");

  const [productoModalOpen, setProductoModalOpen] = useState(false);
  const [nuevoProductoNombre, setNuevoProductoNombre] = useState("");
  const [nuevoProductoCategoria, setNuevoProductoCategoria] = useState("");

  const [varianteModalOpen, setVarianteModalOpen] = useState(false);
  const [productosBase, setProductosBase] = useState([]);

  const [nuevoProductoId, setNuevoProductoId] = useState("");
  const [nuevaVarianteNombre, setNuevaVarianteNombre] = useState("");
  const [nuevaVarianteStock, setNuevaVarianteStock] = useState("");
  const [nuevaVarianteStockMinimo, setNuevaVarianteStockMinimo] = useState("");

  const [preciosModalOpen, setPreciosModalOpen] = useState(false);
  const [variantePreciosSeleccionada, setVariantePreciosSeleccionada] = useState(null);

  const [listasPrecio, setListasPrecio] = useState([]);
  const [nuevoPrecioListaId, setNuevoPrecioListaId] = useState("");
  const [nuevoPrecioCantidadMinima, setNuevoPrecioCantidadMinima] = useState("");
  const [nuevoPrecioValor, setNuevoPrecioValor] = useState("");

  const [editandoPrecioId, setEditandoPrecioId] = useState(null);
  const [editarCantidadMinima, setEditarCantidadMinima] = useState("");
  const [editarPrecioValor, setEditarPrecioValor] = useState("");

  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const [varianteEditar, setVarianteEditar] = useState(null);

  const [editarNombre, setEditarNombre] = useState("");
  const [editarStockMinimo, setEditarStockMinimo] = useState("");
  const [editarProductoId, setEditarProductoId] = useState("");
  

  useEffect(() => {
    cargarVariantes();
  }, []);

  async function cargarVariantes() {
    try {
      const res = await fetch(`${API}/variantes`);
      const data = await res.json();
      setVariantes(data);
    } catch (error) {
      console.error(error);
      alert("Error cargando productos");
    }
  }
  async function cargarProductosBase() {
    try {
        const res = await fetch(`${API}/productos`);
        const data = await res.json();
        setProductosBase(data);
    } catch (error) {
        console.error(error);
        alert("Error cargando productos base");
    }
  }

  async function abrirModalEditar(variante) {
  await cargarProductosBase();

  setVarianteEditar(variante);
  setEditarNombre(variante.nombre);
  setEditarStockMinimo(variante.stockMinimo || "");
  setEditarProductoId(variante.productoId || "");

  setEditarModalOpen(true);
}

function cerrarModalEditar() {
  setEditarModalOpen(false);
  setVarianteEditar(null);
}

async function guardarEdicionVariante() {
  if (!editarNombre.trim()) {
    alert("El nombre es obligatorio");
    return;
  }

  try {
    const res = await fetch(`${API}/variantes/${varianteEditar.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nombre: editarNombre.trim(),
        stockMinimo: Number(editarStockMinimo || 0),
        productoId: Number(editarProductoId),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Error editando variante");
    }

    await cargarVariantes();
    cerrarModalEditar();
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}

  async function cargarListasPrecio() {
    try {
        const res = await fetch(`${API}/listas-precio`);
        const data = await res.json();
        setListasPrecio(data);
    } catch (error) {
        console.error(error);
        alert("Error cargando listas de precio");
    }
  }

  const variantesFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return variantes;

    return variantes.filter((v) => {
      const completo = `${v.producto?.nombre || ""} ${v.nombre}`.toLowerCase();
      return completo.includes(texto);
    });
  }, [variantes, busqueda]);

  function abrirModalStock(variante) {
    setVarianteSeleccionada(variante);
    setCantidadStock("");
    setStockModalOpen(true);
  }

  function cerrarModalStock() {
    setStockModalOpen(false);
    setVarianteSeleccionada(null);
    setCantidadStock("");
  }

  function abrirModalProducto() {
  setNuevoProductoNombre("");
  setNuevoProductoCategoria("");
  setProductoModalOpen(true);
}

function cerrarModalProducto() {
  setProductoModalOpen(false);
  setNuevoProductoNombre("");
  setNuevoProductoCategoria("");
}

function iniciarEdicionPrecio(precio) {
  setEditandoPrecioId(precio.id);
  setEditarCantidadMinima(precio.cantidadMinima || "");
  setEditarPrecioValor(precio.precio || "");
}

function cancelarEdicionPrecio() {
  setEditandoPrecioId(null);
  setEditarCantidadMinima("");
  setEditarPrecioValor("");
}

async function guardarEdicionPrecio(precioId) {
  if (!editarCantidadMinima || !editarPrecioValor) {
    alert("Completá los campos");
    return;
  }

  try {
    const res = await fetch(`${API}/precios-variantes/${precioId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cantidadMinima: Number(editarCantidadMinima),
        precio: Number(editarPrecioValor),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Error actualizando precio");
    }

    const actualizadas = await fetch(`${API}/variantes`).then((r) => r.json());
    setVariantes(actualizadas);

    const varianteActualizada = actualizadas.find(
      (v) => v.id === variantePreciosSeleccionada.id
    );

    setVariantePreciosSeleccionada(varianteActualizada || null);
    cancelarEdicionPrecio();
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}

async function eliminarPrecio(precioId) {
  const confirmar = window.confirm("¿Eliminar esta escala de precio?");
  if (!confirmar) return;

  try {
    const res = await fetch(`${API}/precios-variantes/${precioId}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Error eliminando precio");
    }

    const actualizadas = await fetch(`${API}/variantes`).then((r) => r.json());
    setVariantes(actualizadas);

    const varianteActualizada = actualizadas.find(
      (v) => v.id === variantePreciosSeleccionada.id
    );

    setVariantePreciosSeleccionada(varianteActualizada || null);
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}

async function guardarProducto() {
  if (!nuevoProductoNombre.trim()) {
    alert("Ingresá el nombre del producto");
    return;
  }

  try {
    const res = await fetch(`${API}/productos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nombre: nuevoProductoNombre.trim(),
        categoria: nuevoProductoCategoria.trim(),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Error creando producto");
    }

    await cargarVariantes();
    cerrarModalProducto();
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}

//////////////////////////////////////////////////////////////////// Funciones para agregar variante a un producto existente
async function abrirModalVariante() {
  await cargarProductosBase();

  setNuevoProductoId("");
  setNuevaVarianteNombre("");
  setNuevaVarianteStock("");
  setNuevaVarianteStockMinimo("");
  setVarianteModalOpen(true);
}

function cerrarModalVariante() {
  setVarianteModalOpen(false);
  setNuevoProductoId("");
  setNuevaVarianteNombre("");
  setNuevaVarianteStock("");
  setNuevaVarianteStockMinimo("");
}

async function guardarVariante() {
  if (!nuevoProductoId || !nuevaVarianteNombre.trim()) {
    alert("Seleccioná un producto y cargá el nombre de la variante");
    return;
  }

  try {
    const res = await fetch(`${API}/variantes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productoId: Number(nuevoProductoId),
        nombre: nuevaVarianteNombre.trim(),
        stock: Number(nuevaVarianteStock || 0),
        stockMinimo: Number(nuevaVarianteStockMinimo || 0),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Error creando variante");
    }

    await cargarVariantes();
    cerrarModalVariante();
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}

/////////////////////////////////////////////////////////////////// Funciones para cargar y editar precios de una variante
async function abrirModalPrecios(variante) {
  await cargarListasPrecio();

  setVariantePreciosSeleccionada(variante);
  setNuevoPrecioListaId("");
  setNuevoPrecioCantidadMinima("");
  setNuevoPrecioValor("");
  setPreciosModalOpen(true);
}

function cerrarModalPrecios() {
  setPreciosModalOpen(false);
  setVariantePreciosSeleccionada(null);
  setNuevoPrecioListaId("");
  setNuevoPrecioCantidadMinima("");
  setNuevoPrecioValor("");
}

async function guardarPrecio() {
  if (
    !variantePreciosSeleccionada ||
    !nuevoPrecioListaId ||
    !nuevoPrecioCantidadMinima ||
    !nuevoPrecioValor
  ) {
    alert("Completá todos los campos");
    return;
  }

  try {
    const res = await fetch(`${API}/precios-variantes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        varianteId: variantePreciosSeleccionada.id,
        listaPrecioId: Number(nuevoPrecioListaId),
        cantidadMinima: Number(nuevoPrecioCantidadMinima),
        precio: Number(nuevoPrecioValor),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Error creando precio");
    }

    await cargarVariantes();

    const varianteActualizada = await fetch(`${API}/variantes`)
      .then((r) => r.json())
      .then((items) => items.find((v) => v.id === variantePreciosSeleccionada.id));

    setVariantePreciosSeleccionada(varianteActualizada || null);
    setVariantes(await fetch(`${API}/variantes`).then((r) => r.json()));

    setNuevoPrecioListaId("");
    setNuevoPrecioCantidadMinima("");
    setNuevoPrecioValor("");
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}




//////////////////////////// Aquí van las funciones de editar producto, editar variante, cargar precios, etc.


  async function guardarStock() {
    const cantidad = Number(cantidadStock);

    if (!cantidad || cantidad <= 0) {
      alert("Ingresá una cantidad válida");
      return;
    }

    const nuevoStock = (varianteSeleccionada?.stock || 0) + cantidad;

    try {
      const res = await fetch(
        `${API}/variantes/${varianteSeleccionada.id}/stock`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            stock: nuevoStock,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error actualizando stock");
      }

      await cargarVariantes();
      cerrarModalStock();
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Productos / Stock</h2>

        <div style={styles.headerActions}>
            <button
            style={styles.btnSecundario}
            onClick={abrirModalVariante}
            >
            + Nueva variante
            </button>

            <button
            style={styles.btnNuevo}
            onClick={abrirModalProducto}
            >
            + Nuevo producto
            </button>
        </div>
      </div>

      <div style={styles.bloque}>
        <label style={styles.label}>Buscar producto o variante</label>
        <input
          style={styles.input}
          placeholder="Ej: Lavanda, Textil, Oreo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div style={styles.lista}>
        {variantesFiltradas.length === 0 && (
          <div style={styles.empty}>No se encontraron productos.</div>
        )}

        {variantesFiltradas.map((variante) => (
          <div key={variante.id} style={styles.card}>
            <div style={styles.linea1}>
              <div style={styles.nombreCompleto}>
                {variante.producto?.nombre} - {variante.nombre}
              </div>

              <div
                style={{
                  ...styles.stock,
                  color: variante.stock <= (variante.stockMinimo || 0)
                    ? "#dc2626"
                    : "#111827",
                }}
              >
                Stock: {variante.stock}
              </div>
            </div>

            <div style={styles.linea2}>
              {variante.precios?.length > 0 ? (
                variante.precios.map((p) => (
                  <span key={p.id} style={styles.escala}>
                    {p.cantidadMinima}+ ${p.precio}
                  </span>
                ))
              ) : (
                <span style={styles.sinPrecios}>Sin precios cargados</span>
              )}
            </div>

            <div style={styles.linea3}>
              <button
                style={styles.btnStock}
                onClick={() => abrirModalStock(variante)}
              >
                + Stock
              </button>

              <button
                style={styles.btnSecundario}
                onClick={() => abrirModalEditar(variante)}
              >
                Editar
              </button>

              <button
                style={styles.btnSecundario}
                onClick={() => abrirModalPrecios(variante)}
              >
                Precios
              </button>
            </div>
          </div>
        ))}
      </div>

      {stockModalOpen && (
        <>
          <div style={styles.overlay} onClick={cerrarModalStock}></div>

          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Sumar stock</h3>

            <div style={styles.modalNombre}>
              {varianteSeleccionada?.producto?.nombre} - {varianteSeleccionada?.nombre}
            </div>

            <div style={styles.modalStockActual}>
              Stock actual: <strong>{varianteSeleccionada?.stock}</strong>
            </div>

            <input
              type="number"
              min="1"
              style={styles.input}
              placeholder="Cantidad a sumar"
              value={cantidadStock}
              onChange={(e) => setCantidadStock(e.target.value)}
            />

            <div style={styles.modalActions}>
              <button style={styles.btnSecundario} onClick={cerrarModalStock}>
                Cancelar
              </button>

              <button style={styles.btnStock} onClick={guardarStock}>
                Guardar
              </button>
            </div>
          </div>
        </>
      )}
      
      {productoModalOpen && (
        <>
            <div style={styles.overlay} onClick={cerrarModalProducto}></div>

            <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Nuevo producto</h3>

            <input
                style={styles.input}
                placeholder="Nombre del producto"
                value={nuevoProductoNombre}
                onChange={(e) => setNuevoProductoNombre(e.target.value)}
            />

            <input
                style={styles.input}
                placeholder="Categoría (opcional)"
                value={nuevoProductoCategoria}
                onChange={(e) => setNuevoProductoCategoria(e.target.value)}
            />

            <div style={styles.modalActions}>
                <button style={styles.btnSecundario} onClick={cerrarModalProducto}>
                Cancelar
                </button>

                <button style={styles.btnNuevo} onClick={guardarProducto}>
                Guardar
                </button>
            </div>
            </div>
        </>
        )}

        {varianteModalOpen && (
            <>
                <div style={styles.overlay} onClick={cerrarModalVariante}></div>

                <div style={styles.modal}>
                <h3 style={styles.modalTitle}>Nueva variante</h3>

                <select
                    style={styles.input}
                    value={nuevoProductoId}
                    onChange={(e) => setNuevoProductoId(e.target.value)}
                >
                    <option value="">Seleccionar producto</option>
                    {productosBase.map((producto) => (
                    <option key={producto.id} value={producto.id}>
                        {producto.nombre}
                    </option>
                    ))}
                </select>

                <input
                    style={styles.input}
                    placeholder="Nombre de la variante"
                    value={nuevaVarianteNombre}
                    onChange={(e) => setNuevaVarianteNombre(e.target.value)}
                />

                <input
                    type="number"
                    min="0"
                    style={styles.input}
                    placeholder="Stock inicial"
                    value={nuevaVarianteStock}
                    onChange={(e) => setNuevaVarianteStock(e.target.value)}
                />

                <input
                    type="number"
                    min="0"
                    style={styles.input}
                    placeholder="Stock mínimo"
                    value={nuevaVarianteStockMinimo}
                    onChange={(e) => setNuevaVarianteStockMinimo(e.target.value)}
                />

                <div style={styles.modalActions}>
                    <button style={styles.btnSecundario} onClick={cerrarModalVariante}>
                    Cancelar
                    </button>

                    <button style={styles.btnNuevo} onClick={guardarVariante}>
                    Guardar
                    </button>
                </div>
                </div>
            </>
        )}



        {preciosModalOpen && variantePreciosSeleccionada && (
            <>
                <div style={styles.overlay} onClick={cerrarModalPrecios}></div>

                <div style={styles.modal}>
                <h3 style={styles.modalTitle}>Precios por cantidad</h3>

                <div style={styles.modalNombre}>
                    {variantePreciosSeleccionada.producto?.nombre} - {variantePreciosSeleccionada.nombre}
                </div>

                <div style={styles.listaPreciosActuales}>
                    {variantePreciosSeleccionada.precios?.length > 0 ? (
                        variantePreciosSeleccionada.precios.map((p) => (
                        <div key={p.id} style={styles.precioFila}>
                            {editandoPrecioId === p.id ? (
                            <>
                                <input
                                type="number"
                                min="1"
                                style={styles.inputPrecioMini}
                                value={editarCantidadMinima}
                                onChange={(e) => setEditarCantidadMinima(e.target.value)}
                                placeholder="Cant. mín."
                                />

                                <span style={styles.precioListaNombre}>{p.listaPrecio?.nombre}</span>

                                <input
                                type="number"
                                min="0"
                                style={styles.inputPrecioMini}
                                value={editarPrecioValor}
                                onChange={(e) => setEditarPrecioValor(e.target.value)}
                                placeholder="Precio"
                                />

                                <div style={styles.precioAcciones}>
                                <button
                                    style={styles.btnMiniGuardar}
                                    onClick={() => guardarEdicionPrecio(p.id)}
                                >
                                    ✔
                                </button>
                                <button
                                    style={styles.btnMiniCancelar}
                                    onClick={cancelarEdicionPrecio}
                                >
                                    ✖
                                </button>
                                </div>
                            </>
                            ) : (
                            <>
                                <span>{p.cantidadMinima}+</span>
                                <span style={styles.precioListaNombre}>{p.listaPrecio?.nombre}</span>
                                <strong>${p.precio}</strong>

                                <div style={styles.precioAcciones}>
                                <button
                                    style={styles.btnMiniEditar}
                                    onClick={() => iniciarEdicionPrecio(p)}
                                >
                                    ✏
                                </button>
                                <button
                                    style={styles.btnMiniEliminar}
                                    onClick={() => eliminarPrecio(p.id)}
                                >
                                    🗑
                                </button>
                                </div>
                            </>
                            )}
                        </div>
                        ))
                    ) : (
                        <div style={styles.sinPrecios}>Sin precios cargados</div>
                    )}
                    </div>

                <select
                    style={styles.input}
                    value={nuevoPrecioListaId}
                    onChange={(e) => setNuevoPrecioListaId(e.target.value)}
                >
                    <option value="">Seleccionar lista</option>
                    {listasPrecio.map((lista) => (
                    <option key={lista.id} value={lista.id}>
                        {lista.nombre}
                    </option>
                    ))}
                </select>

                <input
                    type="number"
                    min="1"
                    style={styles.input}
                    placeholder="Cantidad mínima"
                    value={nuevoPrecioCantidadMinima}
                    onChange={(e) => setNuevoPrecioCantidadMinima(e.target.value)}
                />

                <input
                    type="number"
                    min="0"
                    style={styles.input}
                    placeholder="Precio"
                    value={nuevoPrecioValor}
                    onChange={(e) => setNuevoPrecioValor(e.target.value)}
                />

                <div style={styles.modalActions}>
                    <button style={styles.btnSecundario} onClick={cerrarModalPrecios}>
                    Cerrar
                    </button>

                    <button style={styles.btnNuevo} onClick={guardarPrecio}>
                    Agregar escala
                    </button>
                </div>
                </div>
            </>
        )}

        {editarModalOpen && varianteEditar && (
            <>
                <div style={styles.overlay} onClick={cerrarModalEditar}></div>

                <div style={styles.modal}>
                <h3 style={styles.modalTitle}>Editar variante</h3>

                <div style={styles.modalNombre}>
                    ID: {varianteEditar.id}
                </div>

                <select
                    style={styles.input}
                    value={editarProductoId}
                    onChange={(e) => setEditarProductoId(e.target.value)}
                >
                    {productosBase.map((p) => (
                    <option key={p.id} value={p.id}>
                        {p.nombre}
                    </option>
                    ))}
                </select>

                <input
                    style={styles.input}
                    value={editarNombre}
                    onChange={(e) => setEditarNombre(e.target.value)}
                    placeholder="Nombre variante"
                />

                <input
                    type="number"
                    min="0"
                    style={styles.input}
                    value={editarStockMinimo}
                    onChange={(e) => setEditarStockMinimo(e.target.value)}
                    placeholder="Stock mínimo"
                />

                <div style={styles.modalActions}>
                    <button style={styles.btnSecundario} onClick={cerrarModalEditar}>
                    Cancelar
                    </button>

                    <button style={styles.btnNuevo} onClick={guardarEdicionVariante}>
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
  headerActions: {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  justifyContent: "flex-end",
  },
  title: {
    margin: 0,
    fontSize: 22,
  },
  btnNuevo: {
    border: "none",
    borderRadius: 10,
    background: "#2563eb",
    color: "#fff",
    padding: "10px 12px",
    fontWeight: 600,
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
    gap: 10,
  },
  linea1: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  nombreCompleto: {
    fontWeight: 600,
    fontSize: 15,
    lineHeight: 1.2,
    flex: 1,
  },
  stock: {
    fontSize: 14,
    whiteSpace: "nowrap",
  },
  linea2: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },
  escala: {
    background: "#f3f4f6",
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 12,
    whiteSpace: "nowrap",
  },
  sinPrecios: {
    fontSize: 12,
    color: "#6b7280",
  },
  linea3: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  btnStock: {
    border: "none",
    borderRadius: 10,
    background: "#16a34a",
    color: "#fff",
    padding: "9px 12px",
    fontWeight: 600,
  },
  btnSecundario: {
    border: "1px solid #d1d5db",
    borderRadius: 10,
    background: "#fff",
    color: "#111827",
    padding: "9px 12px",
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
    width: "90%",
    maxWidth: 420,
    background: "#fff",
    borderRadius: 14,
    padding: 18,
    zIndex: 1000,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  modalTitle: {
    margin: 0,
  },
  modalNombre: {
    fontWeight: 600,
    fontSize: 14,
  },
  modalStockActual: {
    fontSize: 14,
    color: "#374151",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
  },
  listaPreciosActuales: {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 10,
  maxHeight: 180,
  overflowY: "auto",
},

precioFila: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
  fontSize: 14,
  borderBottom: "1px solid #f3f4f6",
  paddingBottom: 6,
},

sinPrecios: {
  fontSize: 13,
  color: "#6b7280",
},
precioListaNombre: {
  fontSize: 13,
  color: "#374151",
},

precioAcciones: {
  display: "flex",
  gap: 6,
  justifyContent: "flex-end",
},

inputPrecioMini: {
  width: 90,
  padding: 6,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  fontSize: 13,
  boxSizing: "border-box",
},

btnMiniEditar: {
  border: "1px solid #d1d5db",
  background: "#fff",
  borderRadius: 8,
  padding: "4px 8px",
  cursor: "pointer",
},

btnMiniEliminar: {
  border: "1px solid #fecaca",
  background: "#fff5f5",
  borderRadius: 8,
  padding: "4px 8px",
  cursor: "pointer",
},

btnMiniGuardar: {
  border: "1px solid #bbf7d0",
  background: "#f0fdf4",
  borderRadius: 8,
  padding: "4px 8px",
  cursor: "pointer",
},

btnMiniCancelar: {
  border: "1px solid #e5e7eb",
  background: "#fff",
  borderRadius: 8,
  padding: "4px 8px",
  cursor: "pointer",
},
};