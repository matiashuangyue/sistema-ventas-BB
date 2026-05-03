import { useEffect, useMemo, useState } from "react";
import { API_URL as API } from "../../config/api";
import LoadingContent from "../../components/LoadingContent";
import { getToken } from "../../services/auth";

export default function Productos() {
  const token = getToken();

  const [variantes, setVariantes] = useState([]);
  const [productosBase, setProductosBase] = useState([]);
  const [listasPrecio, setListasPrecio] = useState([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);

  const [busqueda, setBusqueda] = useState("");
  const [productoFiltroId, setProductoFiltroId] = useState("");

  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [varianteSeleccionada, setVarianteSeleccionada] = useState(null);
  const [cantidadStock, setCantidadStock] = useState("");

  const [adminProductosOpen, setAdminProductosOpen] = useState(false);
  const [nuevoProductoNombre, setNuevoProductoNombre] = useState("");
  const [nuevoProductoCategoria, setNuevoProductoCategoria] = useState("");
  const [productoEditandoId, setProductoEditandoId] = useState(null);
  const [productoEditarNombre, setProductoEditarNombre] = useState("");
  const [productoEditarCategoria, setProductoEditarCategoria] = useState("");

  const [varianteModalOpen, setVarianteModalOpen] = useState(false);
  const [nuevoProductoId, setNuevoProductoId] = useState("");
  const [nuevaVarianteNombre, setNuevaVarianteNombre] = useState("");
  const [nuevaVarianteStock, setNuevaVarianteStock] = useState("");
  const [nuevaVarianteStockMinimo, setNuevaVarianteStockMinimo] = useState("");

  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const [varianteEditar, setVarianteEditar] = useState(null);
  const [editarNombre, setEditarNombre] = useState("");
  const [editarStockMinimo, setEditarStockMinimo] = useState("");
  const [editarProductoId, setEditarProductoId] = useState("");

  const [precioProductoModalOpen, setPrecioProductoModalOpen] = useState(false);
  const [precioProductoId, setPrecioProductoId] = useState("");
  const [precioProductoListaId, setPrecioProductoListaId] = useState("");
  const [precioProductoCantidadMinima, setPrecioProductoCantidadMinima] =
    useState("");
  const [precioProductoValor, setPrecioProductoValor] = useState("");
  const [precioProductoBusqueda, setPrecioProductoBusqueda] = useState("");

  const [preciosModalOpen, setPreciosModalOpen] = useState(false);
  const [variantePreciosSeleccionada, setVariantePreciosSeleccionada] =
    useState(null);
  const [nuevoPrecioListaId, setNuevoPrecioListaId] = useState("");
  const [nuevoPrecioCantidadMinima, setNuevoPrecioCantidadMinima] =
    useState("");
  const [nuevoPrecioValor, setNuevoPrecioValor] = useState("");
  const [editandoPrecioId, setEditandoPrecioId] = useState(null);
  const [editarCantidadMinima, setEditarCantidadMinima] = useState("");
  const [editarPrecioValor, setEditarPrecioValor] = useState("");
  const [accionEnCurso, setAccionEnCurso] = useState(null);

  const hayAccionEnCurso = Boolean(accionEnCurso) || cargandoProductos;

  function accionActiva(nombre) {
    return accionEnCurso === nombre;
  }

  async function ejecutarConCarga(nombre, callback) {
    if (accionEnCurso) return;

    setAccionEnCurso(nombre);

    try {
      await callback();
    } finally {
      setAccionEnCurso(null);
    }
  }

  function contenidoCarga(nombre, textoCarga, textoNormal) {
    return (
      <LoadingContent loading={accionActiva(nombre)} loadingText={textoCarga}>
        {textoNormal}
      </LoadingContent>
    );
  }

  async function handleResponse(res, fallbackMessage) {
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || fallbackMessage);
    }

    return data;
  }

  async function cargarVariantes() {
    try {
      const res = await fetch(`${API}/variantes`);
      const data = await handleResponse(res, "Error cargando productos");
      setVariantes(data);
      return data;
    } catch (error) {
      console.error(error);
      alert(error.message);
      return [];
    }
  }

  async function cargarProductosBase() {
    try {
      const res = await fetch(`${API}/productos`);
      const data = await handleResponse(res, "Error cargando productos base");
      setProductosBase(data);
      return data;
    } catch (error) {
      console.error(error);
      alert(error.message);
      return [];
    }
  }

  useEffect(() => {
    let activo = true;

    async function cargarInicial() {
      try {
        setCargandoProductos(true);

        const [variantesRes, productosRes] = await Promise.all([
          fetch(`${API}/variantes`),
          fetch(`${API}/productos`),
        ]);
        const [variantesData, productosData] = await Promise.all([
          variantesRes.json(),
          productosRes.json(),
        ]);

        if (!variantesRes.ok) {
          throw new Error(variantesData.error || "Error cargando productos");
        }

        if (!productosRes.ok) {
          throw new Error(
            productosData.error || "Error cargando productos base",
          );
        }

        if (!activo) return;

        setVariantes(variantesData);
        setProductosBase(productosData);
      } catch (error) {
        console.error(error);
        alert(error.message);
      } finally {
        if (activo) {
          setCargandoProductos(false);
        }
      }
    }

    cargarInicial();

    return () => {
      activo = false;
    };
  }, []);

  async function cargarListasPrecio() {
    try {
      const res = await fetch(`${API}/listas-precio`);
      const data = await handleResponse(res, "Error cargando listas de precio");
      setListasPrecio(data);
      return data;
    } catch (error) {
      console.error(error);
      alert(error.message);
      return [];
    }
  }

  const productosDisponibles = useMemo(() => {
    return [...productosBase].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [productosBase]);

  const variantesFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const productoId = productoFiltroId ? Number(productoFiltroId) : null;

    return variantes.filter((variante) => {
      const coincideProducto = !productoId || variante.productoId === productoId;
      const nombreCompleto =
        `${variante.producto?.nombre || ""} ${variante.nombre}`.toLowerCase();
      const coincideTexto = !texto || nombreCompleto.includes(texto);

      return coincideProducto && coincideTexto;
    });
  }, [variantes, busqueda, productoFiltroId]);

  const productosPrecioFiltrados = useMemo(() => {
    const texto = precioProductoBusqueda.trim().toLowerCase();

    return productosBase
      .filter((producto) => {
        const nombre = producto.nombre?.toLowerCase() || "";
        const categoria = producto.categoria?.toLowerCase() || "";
        return !texto || `${nombre} ${categoria}`.includes(texto);
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [productosBase, precioProductoBusqueda]);

  const productoPrecioSeleccionado = useMemo(
    () =>
      productosBase.find((producto) => producto.id === Number(precioProductoId)),
    [productosBase, precioProductoId],
  );

  const cantidadVariantesPrecioProducto = useMemo(() => {
    if (!precioProductoId) return 0;

    return variantes.filter(
      (variante) => variante.productoId === Number(precioProductoId),
    ).length;
  }, [variantes, precioProductoId]);

  function limpiarFiltrosProductos() {
    setBusqueda("");
    setProductoFiltroId("");
  }

  function limpiarNuevoProducto() {
    setNuevoProductoNombre("");
    setNuevoProductoCategoria("");
  }

  function limpiarEdicionProducto() {
    setProductoEditandoId(null);
    setProductoEditarNombre("");
    setProductoEditarCategoria("");
  }

  async function abrirModalAdministrarProductos() {
    await ejecutarConCarga("abrirAdminProductos", async () => {
      await cargarProductosBase();
      limpiarNuevoProducto();
      limpiarEdicionProducto();
      setAdminProductosOpen(true);
    });
  }

  function cerrarModalAdministrarProductos() {
    setAdminProductosOpen(false);
    limpiarNuevoProducto();
    limpiarEdicionProducto();
  }

  async function guardarProducto() {
    if (!nuevoProductoNombre.trim()) {
      alert("Ingresa el nombre del producto");
      return;
    }

    try {
      await ejecutarConCarga("guardarProducto", async () => {
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

      await handleResponse(res, "Error creando producto");
      limpiarNuevoProducto();
      await Promise.all([cargarProductosBase(), cargarVariantes()]);
      });
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  function iniciarEdicionProducto(producto) {
    setProductoEditandoId(producto.id);
    setProductoEditarNombre(producto.nombre || "");
    setProductoEditarCategoria(producto.categoria || "");
  }

  async function guardarEdicionProducto(productoId) {
    if (!productoEditarNombre.trim()) {
      alert("El nombre es obligatorio");
      return;
    }

    try {
      await ejecutarConCarga(`guardarProducto:${productoId}`, async () => {
      const res = await fetch(`${API}/productos/${productoId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: productoEditarNombre.trim(),
          categoria: productoEditarCategoria.trim(),
        }),
      });

      await handleResponse(res, "Error actualizando producto");
      limpiarEdicionProducto();
      await Promise.all([cargarProductosBase(), cargarVariantes()]);
      });
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  async function eliminarProducto(producto) {
    const confirmar = window.confirm(
      `Se eliminara el producto "${producto.nombre}". Tambien se eliminaran todas sus variantes. Continuar?`,
    );

    if (!confirmar) return;

    try {
      await ejecutarConCarga(`eliminarProducto:${producto.id}`, async () => {
      const res = await fetch(`${API}/productos/${producto.id}`, {
        method: "DELETE",
      });

      await handleResponse(res, "Error eliminando producto");

      if (productoFiltroId === String(producto.id)) {
        setProductoFiltroId("");
      }

      if (precioProductoId === String(producto.id)) {
        setPrecioProductoId("");
      }

      limpiarEdicionProducto();
      await Promise.all([cargarProductosBase(), cargarVariantes()]);
      alert(`Producto "${producto.nombre}" eliminado correctamente.`);
      });
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

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

  async function guardarStock() {
    const cantidad = Number(cantidadStock);

    if (!cantidad || cantidad < 1) {
      alert("Ingresa una cantidad valida");
      return;
    }

    const nuevoStock = (varianteSeleccionada?.stock || 0) + cantidad;

    try {
      await ejecutarConCarga("guardarStock", async () => {
      const res = await fetch(`${API}/variantes/${varianteSeleccionada.id}/stock`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          stock: nuevoStock,
        }),
      });

      await handleResponse(res, "Error actualizando stock");
      await cargarVariantes();
      cerrarModalStock();
      });
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  async function abrirModalVariante() {
    await ejecutarConCarga("abrirModalVariante", async () => {
      await cargarProductosBase();
      setNuevoProductoId("");
      setNuevaVarianteNombre("");
      setNuevaVarianteStock("");
      setNuevaVarianteStockMinimo("");
      setVarianteModalOpen(true);
    });
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
      alert("Selecciona un producto y carga el nombre de la variante");
      return;
    }

    try {
      await ejecutarConCarga("guardarVariante", async () => {
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

      await handleResponse(res, "Error creando variante");
      await cargarVariantes();
      cerrarModalVariante();
      });
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  async function abrirModalEditar(variante) {
    await ejecutarConCarga(`abrirEditar:${variante.id}`, async () => {
      await cargarProductosBase();
      setVarianteEditar(variante);
      setEditarNombre(variante.nombre);
      setEditarStockMinimo(variante.stockMinimo || "");
      setEditarProductoId(variante.productoId || "");
      setEditarModalOpen(true);
    });
  }

  function cerrarModalEditar() {
    setEditarModalOpen(false);
    setVarianteEditar(null);
    setEditarNombre("");
    setEditarStockMinimo("");
    setEditarProductoId("");
  }

  async function guardarEdicionVariante() {
    if (!editarNombre.trim()) {
      alert("El nombre es obligatorio");
      return;
    }

    try {
      await ejecutarConCarga("guardarEdicionVariante", async () => {
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

      await handleResponse(res, "Error editando variante");
      await cargarVariantes();
      cerrarModalEditar();
      });
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  async function eliminarVariante(variante) {
    const confirmar = window.confirm(
      `Se eliminara la variante "${variante.producto?.nombre || ""} - ${variante.nombre}". Continuar?`,
    );

    if (!confirmar) return;

    try {
      await ejecutarConCarga(`eliminarVariante:${variante.id}`, async () => {
      const res = await fetch(`${API}/variantes/${variante.id}`, {
        method: "DELETE",
      });

      await handleResponse(res, "Error eliminando variante");
      await cargarVariantes();
      });
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  async function abrirModalPrecioProducto() {
    await ejecutarConCarga("abrirPrecioProducto", async () => {
      await Promise.all([cargarProductosBase(), cargarListasPrecio()]);
      setPrecioProductoId("");
      setPrecioProductoListaId("");
      setPrecioProductoCantidadMinima("");
      setPrecioProductoValor("");
      setPrecioProductoBusqueda("");
      setPrecioProductoModalOpen(true);
    });
  }

  function cerrarModalPrecioProducto() {
    setPrecioProductoModalOpen(false);
    setPrecioProductoId("");
    setPrecioProductoListaId("");
    setPrecioProductoCantidadMinima("");
    setPrecioProductoValor("");
    setPrecioProductoBusqueda("");
  }

  async function guardarPrecioProducto() {
    if (
      !precioProductoId ||
      !precioProductoListaId ||
      !precioProductoCantidadMinima ||
      !precioProductoValor
    ) {
      alert("Completa todos los campos");
      return;
    }

    try {
      await ejecutarConCarga("guardarPrecioProducto", async () => {
      const res = await fetch(`${API}/precios-variantes/por-producto`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productoId: Number(precioProductoId),
          listaPrecioId: Number(precioProductoListaId),
          cantidadMinima: Number(precioProductoCantidadMinima),
          precio: Number(precioProductoValor),
        }),
      });

      const data = await handleResponse(
        res,
        "Error actualizando precios por producto",
      );
      await cargarVariantes();
      cerrarModalPrecioProducto();
      alert(`Precios actualizados en ${data.variantesActualizadas} variantes`);
      });
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  async function abrirModalPrecios(variante) {
    await ejecutarConCarga(`abrirPrecios:${variante.id}`, async () => {
      await cargarListasPrecio();
      setVariantePreciosSeleccionada(variante);
      setNuevoPrecioListaId("");
      setNuevoPrecioCantidadMinima("");
      setNuevoPrecioValor("");
      setPreciosModalOpen(true);
    });
  }

  function cerrarModalPrecios() {
    setPreciosModalOpen(false);
    setVariantePreciosSeleccionada(null);
    setNuevoPrecioListaId("");
    setNuevoPrecioCantidadMinima("");
    setNuevoPrecioValor("");
    cancelarEdicionPrecio();
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

  function actualizarVariantePreciosSeleccionada(actualizadas) {
    if (!variantePreciosSeleccionada) return;

    const varianteActualizada = actualizadas.find(
      (variante) => variante.id === variantePreciosSeleccionada.id,
    );

    setVariantePreciosSeleccionada(varianteActualizada || null);
  }

  async function guardarPrecio() {
    if (
      !variantePreciosSeleccionada ||
      !nuevoPrecioListaId ||
      !nuevoPrecioCantidadMinima ||
      !nuevoPrecioValor
    ) {
      alert("Completa todos los campos");
      return;
    }

    try {
      await ejecutarConCarga("guardarPrecio", async () => {
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

      await handleResponse(res, "Error creando precio");
      const actualizadas = await cargarVariantes();
      actualizarVariantePreciosSeleccionada(actualizadas);
      setNuevoPrecioListaId("");
      setNuevoPrecioCantidadMinima("");
      setNuevoPrecioValor("");
      });
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  async function guardarEdicionPrecio(precioId) {
    if (!editarCantidadMinima || !editarPrecioValor) {
      alert("Completa los campos");
      return;
    }

    try {
      await ejecutarConCarga(`guardarEdicionPrecio:${precioId}`, async () => {
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

      await handleResponse(res, "Error actualizando precio");
      const actualizadas = await cargarVariantes();
      actualizarVariantePreciosSeleccionada(actualizadas);
      cancelarEdicionPrecio();
      });
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  async function eliminarPrecio(precioId) {
    const confirmar = window.confirm("Eliminar esta escala de precio?");
    if (!confirmar) return;

    try {
      await ejecutarConCarga(`eliminarPrecio:${precioId}`, async () => {
      const res = await fetch(`${API}/precios-variantes/${precioId}`, {
        method: "DELETE",
      });

      await handleResponse(res, "Error eliminando precio");
      const actualizadas = await cargarVariantes();
      actualizarVariantePreciosSeleccionada(actualizadas);
      });
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
            onClick={abrirModalPrecioProducto}
            disabled={hayAccionEnCurso}
          >
            {contenidoCarga(
              "abrirPrecioProducto",
              "Cargando...",
              "Precio por producto",
            )}
          </button>

          <button
            style={styles.btnSecundario}
            onClick={abrirModalVariante}
            disabled={hayAccionEnCurso}
          >
            {contenidoCarga(
              "abrirModalVariante",
              "Cargando...",
              "+ Nueva variante",
            )}
          </button>

          <button
            style={styles.btnNuevo}
            onClick={abrirModalAdministrarProductos}
            disabled={hayAccionEnCurso}
          >
            {contenidoCarga(
              "abrirAdminProductos",
              "Cargando...",
              "Administrar productos",
            )}
          </button>
        </div>
      </div>

      <div style={styles.bloque}>
        <div style={styles.filtrosGrid}>
          <div>
            <label style={styles.label}>Buscar producto o variante</label>
            <input
              style={styles.input}
              placeholder="Ej: Lavanda, Textil, Oreo..."
              value={busqueda}
              disabled={cargandoProductos}
              onChange={(event) => setBusqueda(event.target.value)}
            />
          </div>

          <div>
            <label style={styles.label}>Filtrar por producto</label>
            <select
              style={styles.input}
              value={productoFiltroId}
              disabled={cargandoProductos}
              onChange={(event) => setProductoFiltroId(event.target.value)}
            >
              <option value="">Todos los productos</option>
              {productosDisponibles.map((producto) => (
                <option key={producto.id} value={producto.id}>
                  {producto.nombre}
                </option>
              ))}
            </select>
          </div>

          <button
            style={styles.btnFiltro}
            onClick={limpiarFiltrosProductos}
            disabled={cargandoProductos}
            type="button"
          >
            Limpiar
          </button>
        </div>

        <div style={styles.filtroResumen}>
          {cargandoProductos ? (
            <LoadingContent loading={true} loadingText="Cargando productos..." />
          ) : (
            `${variantesFiltradas.length} de ${variantes.length} variantes visibles`
          )}
        </div>
      </div>

      <div style={styles.lista}>
        {cargandoProductos && (
          <div style={styles.loadingProductos}>
            <LoadingContent loading={true} loadingText="Cargando productos..." />
          </div>
        )}

        {!cargandoProductos && variantesFiltradas.length === 0 && (
          <div style={styles.empty}>No se encontraron productos.</div>
        )}

        {!cargandoProductos && variantesFiltradas.map((variante) => (
          <div key={variante.id} style={styles.card}>
            <div style={styles.cardBody}>
              <div style={styles.linea1}>
                <div style={styles.nombreCompleto}>
                  {variante.producto?.nombre} - {variante.nombre}
                </div>

                <div
                  style={{
                    ...styles.stock,
                    color:
                      variante.stock <= (variante.stockMinimo || 0)
                        ? "var(--danger)"
                        : "var(--text)",
                  }}
                >
                  Stock: {variante.stock}
                </div>
              </div>

              <div style={styles.linea2}>
                {variante.precios?.length > 0 ? (
                  variante.precios.map((precio) => (
                    <span key={precio.id} style={styles.escala}>
                      {precio.cantidadMinima}+ ${precio.precio}
                    </span>
                  ))
                ) : (
                  <span style={styles.sinPrecios}>Sin precios cargados</span>
                )}
              </div>

              <div style={styles.linea3}>
                <div style={styles.cardActionsMain}>
                  <button
                    style={styles.btnStock}
                    onClick={() => abrirModalStock(variante)}
                    disabled={hayAccionEnCurso}
                  >
                    + Stock
                  </button>

                  <button
                    style={styles.btnSecundario}
                    onClick={() => abrirModalEditar(variante)}
                    disabled={hayAccionEnCurso}
                  >
                    {contenidoCarga(`abrirEditar:${variante.id}`, "Cargando...", "Editar")}
                  </button>

                  <button
                    style={styles.btnSecundario}
                    onClick={() => abrirModalPrecios(variante)}
                    disabled={hayAccionEnCurso}
                  >
                    {contenidoCarga(`abrirPrecios:${variante.id}`, "Cargando...", "Precios")}
                  </button>
                </div>

                <button
                  style={styles.btnDestructivo}
                  onClick={() => eliminarVariante(variante)}
                  disabled={hayAccionEnCurso}
                >
                  {contenidoCarga(
                    `eliminarVariante:${variante.id}`,
                    "Eliminando...",
                    "Eliminar",
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {stockModalOpen && (
        <>
          <div
            style={styles.overlay}
            onClick={hayAccionEnCurso ? undefined : cerrarModalStock}
          ></div>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Sumar stock</h3>
            <div style={styles.modalNombre}>
              {varianteSeleccionada?.producto?.nombre} -{" "}
              {varianteSeleccionada?.nombre}
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
              onChange={(event) => setCantidadStock(event.target.value)}
            />
            <div style={styles.modalActions}>
              <button
                style={styles.btnSecundario}
                onClick={cerrarModalStock}
                disabled={hayAccionEnCurso}
              >
                Cancelar
              </button>
              <button
                style={styles.btnStock}
                onClick={guardarStock}
                disabled={hayAccionEnCurso}
              >
                {contenidoCarga("guardarStock", "Guardando...", "Guardar")}
              </button>
            </div>
          </div>
        </>
      )}

      {adminProductosOpen && (
        <>
          <div
            style={styles.overlay}
            onClick={
              hayAccionEnCurso ? undefined : cerrarModalAdministrarProductos
            }
          ></div>
          <div style={{ ...styles.modal, ...styles.modalGrande }}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Administrar productos</h3>
              <button
                style={styles.btnCerrarModal}
                onClick={cerrarModalAdministrarProductos}
                disabled={hayAccionEnCurso}
              >
                Cerrar
              </button>
            </div>

            <div style={styles.productForm}>
              <strong style={styles.productFormTitle}>Nuevo producto</strong>

              <div style={styles.productFormFields}>
                <input
                  style={styles.input}
                  placeholder="Nombre del producto"
                  value={nuevoProductoNombre}
                  onChange={(event) => setNuevoProductoNombre(event.target.value)}
                />
                <input
                  style={styles.input}
                  placeholder="Categoria (opcional)"
                  value={nuevoProductoCategoria}
                  onChange={(event) =>
                    setNuevoProductoCategoria(event.target.value)
                  }
                />
              </div>

              <div style={styles.productFormActions}>
                <button
                  style={styles.btnSecundario}
                  onClick={limpiarNuevoProducto}
                  disabled={hayAccionEnCurso}
                >
                  Limpiar
                </button>
                <button
                  style={styles.btnNuevo}
                  onClick={guardarProducto}
                  disabled={hayAccionEnCurso}
                >
                  {contenidoCarga(
                    "guardarProducto",
                    "Creando...",
                    "Crear producto",
                  )}
                </button>
              </div>
            </div>

            <div style={styles.productList}>
              {productosBase.length === 0 && (
                <div style={styles.emptyCompact}>No hay productos activos.</div>
              )}

              {productosBase.map((producto) => (
                <div key={producto.id} style={styles.productRow}>
                  {productoEditandoId === producto.id ? (
                    <>
                      <div style={styles.productEditGrid}>
                        <input
                          style={styles.input}
                          value={productoEditarNombre}
                          onChange={(event) =>
                            setProductoEditarNombre(event.target.value)
                          }
                          placeholder="Nombre"
                        />
                        <input
                          style={styles.input}
                          value={productoEditarCategoria}
                          onChange={(event) =>
                            setProductoEditarCategoria(event.target.value)
                          }
                          placeholder="Categoria"
                        />
                      </div>
                      <div style={styles.productActions}>
                        <button
                          style={styles.btnSecundario}
                          onClick={limpiarEdicionProducto}
                          disabled={hayAccionEnCurso}
                        >
                          Cancelar
                        </button>
                        <button
                          style={styles.btnNuevo}
                          onClick={() => guardarEdicionProducto(producto.id)}
                          disabled={hayAccionEnCurso}
                        >
                          {contenidoCarga(
                            `guardarProducto:${producto.id}`,
                            "Guardando...",
                            "Guardar",
                          )}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={styles.productInfo}>
                        <strong>{producto.nombre}</strong>
                        <span>{producto.categoria || "Sin categoria"}</span>
                      </div>
                      <div style={styles.productActions}>
                        <button
                          style={styles.btnSecundario}
                          onClick={() => iniciarEdicionProducto(producto)}
                          disabled={hayAccionEnCurso}
                        >
                          Modificar
                        </button>
                        <button
                          style={styles.btnDestructivo}
                          onClick={() => eliminarProducto(producto)}
                          disabled={hayAccionEnCurso}
                        >
                          {contenidoCarga(
                            `eliminarProducto:${producto.id}`,
                            "Eliminando...",
                            "Eliminar",
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

          </div>
        </>
      )}

      {varianteModalOpen && (
        <>
          <div
            style={styles.overlay}
            onClick={hayAccionEnCurso ? undefined : cerrarModalVariante}
          ></div>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Nueva variante</h3>
            <select
              style={styles.input}
              value={nuevoProductoId}
              onChange={(event) => setNuevoProductoId(event.target.value)}
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
              onChange={(event) => setNuevaVarianteNombre(event.target.value)}
            />
            <input
              type="number"
              min="0"
              style={styles.input}
              placeholder="Stock inicial"
              value={nuevaVarianteStock}
              onChange={(event) => setNuevaVarianteStock(event.target.value)}
            />
            <input
              type="number"
              min="0"
              style={styles.input}
              placeholder="Stock minimo"
              value={nuevaVarianteStockMinimo}
              onChange={(event) => setNuevaVarianteStockMinimo(event.target.value)}
            />
            <div style={styles.modalActions}>
              <button
                style={styles.btnSecundario}
                onClick={cerrarModalVariante}
                disabled={hayAccionEnCurso}
              >
                Cancelar
              </button>
              <button
                style={styles.btnNuevo}
                onClick={guardarVariante}
                disabled={hayAccionEnCurso}
              >
                {contenidoCarga("guardarVariante", "Guardando...", "Guardar")}
              </button>
            </div>
          </div>
        </>
      )}

      {editarModalOpen && varianteEditar && (
        <>
          <div
            style={styles.overlay}
            onClick={hayAccionEnCurso ? undefined : cerrarModalEditar}
          ></div>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Editar variante</h3>
            <div style={styles.modalNombre}>ID: {varianteEditar.id}</div>
            <select
              style={styles.input}
              value={editarProductoId}
              onChange={(event) => setEditarProductoId(event.target.value)}
            >
              {productosBase.map((producto) => (
                <option key={producto.id} value={producto.id}>
                  {producto.nombre}
                </option>
              ))}
            </select>
            <input
              style={styles.input}
              value={editarNombre}
              onChange={(event) => setEditarNombre(event.target.value)}
              placeholder="Nombre variante"
            />
            <input
              type="number"
              min="0"
              style={styles.input}
              value={editarStockMinimo}
              onChange={(event) => setEditarStockMinimo(event.target.value)}
              placeholder="Stock minimo"
            />
            <div style={styles.modalActions}>
              <button
                style={styles.btnSecundario}
                onClick={cerrarModalEditar}
                disabled={hayAccionEnCurso}
              >
                Cancelar
              </button>
              <button
                style={styles.btnNuevo}
                onClick={guardarEdicionVariante}
                disabled={hayAccionEnCurso}
              >
                {contenidoCarga(
                  "guardarEdicionVariante",
                  "Guardando...",
                  "Guardar cambios",
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {precioProductoModalOpen && (
        <>
          <div
            style={styles.overlay}
            onClick={
              hayAccionEnCurso ? undefined : cerrarModalPrecioProducto
            }
          ></div>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Actualizar precios por producto</h3>
            <label style={styles.label}>Buscar producto</label>
            <input
              style={styles.input}
              placeholder="Ej: Saphirus Textil..."
              value={precioProductoBusqueda}
              onChange={(event) => setPrecioProductoBusqueda(event.target.value)}
            />
            <label style={styles.label}>Producto</label>
            <select
              style={styles.input}
              value={precioProductoId}
              onChange={(event) => setPrecioProductoId(event.target.value)}
            >
              <option value="">Seleccionar producto</option>
              {productosPrecioFiltrados.map((producto) => (
                <option key={producto.id} value={producto.id}>
                  {producto.nombre}
                </option>
              ))}
            </select>

            {productoPrecioSeleccionado && (
              <div style={styles.precioProductoInfo}>
                <strong>{productoPrecioSeleccionado.nombre}</strong>
                <span>
                  Se actualizaran {cantidadVariantesPrecioProducto} variantes.
                </span>
              </div>
            )}

            <label style={styles.label}>Lista de precio</label>
            <select
              style={styles.input}
              value={precioProductoListaId}
              onChange={(event) => setPrecioProductoListaId(event.target.value)}
            >
              <option value="">Seleccionar lista</option>
              {listasPrecio.map((lista) => (
                <option key={lista.id} value={lista.id}>
                  {lista.nombre}
                </option>
              ))}
            </select>
            <label style={styles.label}>Cantidad minima</label>
            <input
              type="number"
              min="1"
              style={styles.input}
              placeholder="Cantidad minima"
              value={precioProductoCantidadMinima}
              onChange={(event) =>
                setPrecioProductoCantidadMinima(event.target.value)
              }
            />
            <label style={styles.label}>Precio</label>
            <input
              type="number"
              min="0"
              style={styles.input}
              placeholder="Precio"
              value={precioProductoValor}
              onChange={(event) => setPrecioProductoValor(event.target.value)}
            />
            <div style={styles.modalActions}>
              <button
                style={styles.btnSecundario}
                onClick={cerrarModalPrecioProducto}
                disabled={hayAccionEnCurso}
              >
                Cancelar
              </button>
              <button
                style={styles.btnNuevo}
                onClick={guardarPrecioProducto}
                disabled={hayAccionEnCurso}
              >
                {contenidoCarga(
                  "guardarPrecioProducto",
                  "Actualizando...",
                  "Actualizar",
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {preciosModalOpen && variantePreciosSeleccionada && (
        <>
          <div
            style={styles.overlay}
            onClick={hayAccionEnCurso ? undefined : cerrarModalPrecios}
          ></div>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Precios por cantidad</h3>
            <div style={styles.modalNombre}>
              {variantePreciosSeleccionada.producto?.nombre} -{" "}
              {variantePreciosSeleccionada.nombre}
            </div>

            <div style={styles.listaPreciosActuales}>
              {variantePreciosSeleccionada.precios?.length > 0 ? (
                variantePreciosSeleccionada.precios.map((precio) => (
                  <div key={precio.id} style={styles.precioFila}>
                    {editandoPrecioId === precio.id ? (
                      <>
                        <input
                          type="number"
                          min="1"
                          style={styles.inputPrecioMini}
                          value={editarCantidadMinima}
                          onChange={(event) =>
                            setEditarCantidadMinima(event.target.value)
                          }
                          placeholder="Cant. min."
                        />
                        <span style={styles.precioListaNombre}>
                          {precio.listaPrecio?.nombre}
                        </span>
                        <input
                          type="number"
                          min="0"
                          style={styles.inputPrecioMini}
                          value={editarPrecioValor}
                          onChange={(event) =>
                            setEditarPrecioValor(event.target.value)
                          }
                          placeholder="Precio"
                        />
                        <div style={styles.precioAcciones}>
                          <button
                            style={styles.btnMiniGuardar}
                            onClick={() => guardarEdicionPrecio(precio.id)}
                            disabled={hayAccionEnCurso}
                          >
                            {contenidoCarga(
                              `guardarEdicionPrecio:${precio.id}`,
                              "Guardando...",
                              "Guardar",
                            )}
                          </button>
                          <button
                            style={styles.btnMiniCancelar}
                            onClick={cancelarEdicionPrecio}
                            disabled={hayAccionEnCurso}
                          >
                            Cancelar
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span>{precio.cantidadMinima}+</span>
                        <span style={styles.precioListaNombre}>
                          {precio.listaPrecio?.nombre}
                        </span>
                        <strong>${precio.precio}</strong>
                        <div style={styles.precioAcciones}>
                          <button
                            style={styles.btnMiniEditar}
                            onClick={() => iniciarEdicionPrecio(precio)}
                            disabled={hayAccionEnCurso}
                          >
                            Editar
                          </button>
                          <button
                            style={styles.btnMiniEliminar}
                            onClick={() => eliminarPrecio(precio.id)}
                            disabled={hayAccionEnCurso}
                          >
                            {contenidoCarga(
                              `eliminarPrecio:${precio.id}`,
                              "Eliminando...",
                              "Eliminar",
                            )}
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
              onChange={(event) => setNuevoPrecioListaId(event.target.value)}
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
              placeholder="Cantidad minima"
              value={nuevoPrecioCantidadMinima}
              onChange={(event) => setNuevoPrecioCantidadMinima(event.target.value)}
            />
            <input
              type="number"
              min="0"
              style={styles.input}
              placeholder="Precio"
              value={nuevoPrecioValor}
              onChange={(event) => setNuevoPrecioValor(event.target.value)}
            />
            <div style={styles.modalActions}>
              <button
                style={styles.btnSecundario}
                onClick={cerrarModalPrecios}
                disabled={hayAccionEnCurso}
              >
                Cerrar
              </button>
              <button
                style={styles.btnNuevo}
                onClick={guardarPrecio}
                disabled={hayAccionEnCurso}
              >
                {contenidoCarga("guardarPrecio", "Agregando...", "Agregar escala")}
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
    background: "var(--primary)",
    color: "var(--text-inverse)",
    padding: "10px 12px",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  btnFiltro: {
    border: "1px solid var(--border-strong)",
    borderRadius: 10,
    background: "var(--surface)",
    color: "var(--text)",
    padding: "10px 12px",
    fontWeight: 600,
    minHeight: 42,
    whiteSpace: "nowrap",
  },
  btnSecundario: {
    border: "1px solid var(--border-strong)",
    borderRadius: 10,
    background: "var(--surface)",
    color: "var(--text)",
    padding: "9px 12px",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  btnStock: {
    border: "none",
    borderRadius: 10,
    background: "var(--success)",
    color: "var(--text-inverse)",
    padding: "9px 12px",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  btnDestructivo: {
    border: "1px solid var(--danger)",
    borderRadius: 10,
    background: "var(--danger)",
    color: "var(--text-inverse)",
    padding: "9px 12px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  bloque: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: 14,
  },
  filtrosGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 10,
    alignItems: "end",
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
  filtroResumen: {
    marginTop: 10,
    color: "var(--text-muted)",
    fontSize: 13,
  },
  lista: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  empty: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: 14,
    color: "var(--text-muted)",
  },
  loadingProductos: {
    alignItems: "center",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    color: "var(--text-muted)",
    display: "flex",
    justifyContent: "center",
    minHeight: 88,
    padding: 18,
  },
  emptyCompact: {
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: 12,
    color: "var(--text-muted)",
  },
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    alignItems: "stretch",
  },
  cardBody: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    minWidth: 0,
    width: "100%",
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
    minWidth: 0,
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
    background: "var(--surface-muted)",
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 12,
    whiteSpace: "nowrap",
  },
  linea3: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  cardActionsMain: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
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
    width: "min(420px, calc(100vw - 24px))",
    maxWidth: "calc(100vw - 24px)",
    maxHeight: "calc(100dvh - 24px)",
    overflowY: "auto",
    background: "var(--surface)",
    borderRadius: 14,
    padding: 18,
    zIndex: 1000,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    boxShadow: "var(--shadow-lg)",
  },
  modalGrande: {
    width: "min(760px, calc(100vw - 24px))",
    maxWidth: "calc(100vw - 24px)",
    padding: 20,
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  modalTitle: {
    margin: 0,
  },
  btnCerrarModal: {
    border: "1px solid var(--border-strong)",
    borderRadius: 10,
    background: "var(--surface)",
    color: "var(--text)",
    padding: "9px 12px",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  modalNombre: {
    fontWeight: 600,
    fontSize: 14,
  },
  modalStockActual: {
    fontSize: 14,
    color: "var(--text-soft)",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    flexWrap: "wrap",
  },
  productForm: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: 14,
    background: "var(--surface-soft)",
  },
  productFormTitle: {
    fontSize: 16,
    lineHeight: 1.2,
  },
  productFormFields: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
    gap: 10,
  },
  productFormActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    flexWrap: "wrap",
  },
  productList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  productRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: 12,
  },
  productInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 0,
    flex: "1 1 240px",
  },
  productActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "flex-end",
    flex: "1 1 180px",
  },
  productEditGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
    gap: 8,
    flex: "1 1 320px",
    minWidth: 0,
  },
  precioProductoInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    border: "1px solid var(--border)",
    borderRadius: 10,
    background: "var(--surface-selected)",
    color: "var(--text-soft)",
    padding: 10,
    fontSize: 13,
  },
  listaPreciosActuales: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: 10,
    maxHeight: 180,
    overflowY: "auto",
  },
  precioFila: {
    display: "grid",
    gridTemplateColumns: "72px 1fr 96px auto",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    borderBottom: "1px solid var(--border-subtle)",
    paddingBottom: 6,
  },
  sinPrecios: {
    fontSize: 13,
    color: "var(--text-muted)",
  },
  precioListaNombre: {
    fontSize: 13,
    color: "var(--text-soft)",
  },
  precioAcciones: {
    display: "flex",
    gap: 6,
    justifyContent: "flex-end",
    flexWrap: "wrap",
  },
  inputPrecioMini: {
    width: "100%",
    padding: 6,
    borderRadius: 8,
    border: "1px solid var(--border-strong)",
    fontSize: 13,
    boxSizing: "border-box",
  },
  btnMiniEditar: {
    border: "1px solid var(--border-strong)",
    background: "var(--surface)",
    color: "var(--text)",
    borderRadius: 8,
    padding: "4px 8px",
  },
  btnMiniEliminar: {
    border: "1px solid var(--border-danger)",
    background: "var(--surface-danger)",
    color: "var(--danger)",
    borderRadius: 8,
    padding: "4px 8px",
    fontWeight: 600,
  },
  btnMiniGuardar: {
    border: "1px solid var(--border-success)",
    background: "var(--surface-success)",
    color: "var(--success)",
    borderRadius: 8,
    padding: "4px 8px",
    fontWeight: 600,
  },
  btnMiniCancelar: {
    border: "1px solid var(--border)",
    background: "var(--surface)",
    color: "var(--text)",
    borderRadius: 8,
    padding: "4px 8px",
  },
};
