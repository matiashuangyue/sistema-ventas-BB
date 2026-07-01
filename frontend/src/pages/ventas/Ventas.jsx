import { useEffect, useMemo, useRef, useState } from "react";
import { API_URL as API } from "../../config/api";
import LoadingContent from "../../components/LoadingContent";
import { getToken } from "../../services/auth";

const VENTA_DRAFT_STORAGE_KEY = "ventas:borrador:v1";

const BORRADOR_INICIAL = {
  busqueda: "",
  carrito: [],
  descuento: 0,
  cantidadesBusqueda: {},
  clienteBusqueda: "",
  clienteSeleccionado: null,
  formaPago: "EFECTIVO",
  montoPagado: "",
  montoPagadoManual: false,
  observacionesPago: "",
};

function leerBorradorVenta() {
  try {
    const raw = localStorage.getItem(VENTA_DRAFT_STORAGE_KEY);
    if (!raw) return BORRADOR_INICIAL;

    const borrador = JSON.parse(raw);

    return {
      ...BORRADOR_INICIAL,
      ...borrador,
      carrito: Array.isArray(borrador.carrito) ? borrador.carrito : [],
      descuento: Number(borrador.descuento || 0),
      cantidadesBusqueda:
        borrador.cantidadesBusqueda &&
        typeof borrador.cantidadesBusqueda === "object"
          ? borrador.cantidadesBusqueda
          : {},
      formaPago: borrador.formaPago || BORRADOR_INICIAL.formaPago,
      montoPagado:
        borrador.montoPagado == null ? "" : String(borrador.montoPagado),
      montoPagadoManual: Boolean(borrador.montoPagadoManual),
      observacionesPago: borrador.observacionesPago || "",
    };
  } catch (error) {
    console.error("No se pudo recuperar el borrador de venta", error);
    localStorage.removeItem(VENTA_DRAFT_STORAGE_KEY);
    return BORRADOR_INICIAL;
  }
}

function ventaTieneDatos(borrador) {
  return (
    borrador.carrito.length > 0 ||
    Boolean(String(borrador.busqueda || "").trim()) ||
    Boolean(String(borrador.clienteBusqueda || "").trim()) ||
    Boolean(borrador.clienteSeleccionado) ||
    Number(borrador.descuento || 0) > 0 ||
    String(borrador.formaPago || "EFECTIVO") !== "EFECTIVO" ||
    Boolean(borrador.montoPagadoManual) ||
    Boolean(String(borrador.observacionesPago || "").trim())
  );
}

const FORMAS_PAGO = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "TARJETA", label: "Tarjeta" },
  { value: "CUENTA_CORRIENTE", label: "Cuenta corriente" },
  { value: "OTRO", label: "Otro" },
];

export default function Ventas() {
  const token = getToken();
  const buscadorRef = useRef(null);
  const borradorInicialRef = useRef(leerBorradorVenta());
  const carritoRef = useRef(borradorInicialRef.current.carrito);

  const [variantes, setVariantes] = useState([]);
  const [busqueda, setBusqueda] = useState(borradorInicialRef.current.busqueda);
  const [carrito, setCarrito] = useState(borradorInicialRef.current.carrito);
  const [descuento, setDescuento] = useState(
    borradorInicialRef.current.descuento,
  );
  const [cantidadesBusqueda, setCantidadesBusqueda] = useState(
    borradorInicialRef.current.cantidadesBusqueda,
  );
  const [clienteBusqueda, setClienteBusqueda] = useState(
    borradorInicialRef.current.clienteBusqueda,
  );
  const [clientesEncontrados, setClientesEncontrados] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(
    borradorInicialRef.current.clienteSeleccionado,
  );
  const [formaPago, setFormaPago] = useState(
    borradorInicialRef.current.formaPago,
  );
  const [montoPagado, setMontoPagado] = useState(
    borradorInicialRef.current.montoPagado,
  );
  const [montoPagadoManual, setMontoPagadoManual] = useState(
    borradorInicialRef.current.montoPagadoManual,
  );
  const [observacionesPago, setObservacionesPago] = useState(
    borradorInicialRef.current.observacionesPago,
  );
  const [borradorVisible, setBorradorVisible] = useState(
    ventaTieneDatos(borradorInicialRef.current),
  );
  const [confirmandoVenta, setConfirmandoVenta] = useState(false);
  const [resultadoVarianteIds, setResultadoVarianteIds] = useState([]);
  const [buscandoVariantes, setBuscandoVariantes] = useState(false);
  const [editandoPrecio, setEditandoPrecio] = useState(null);

  useEffect(() => {
    carritoRef.current = carrito;
  }, [carrito]);


  useEffect(() => {
    cargarVariantes().catch((error) => console.error(error));

    function refrescarSiVuelveLaPestana() {
      if (document.visibilityState === "visible") {
        cargarVariantes().catch((error) => console.error(error));
      }
    }

    function refrescarAlVolverFoco() {
      cargarVariantes().catch((error) => console.error(error));
    }

    window.addEventListener("focus", refrescarAlVolverFoco);
    document.addEventListener("visibilitychange", refrescarSiVuelveLaPestana);

    return () => {
      window.removeEventListener("focus", refrescarAlVolverFoco);
      document.removeEventListener(
        "visibilitychange",
        refrescarSiVuelveLaPestana,
      );
    };
  // cargarVariantes usa carritoRef para refrescar siempre el carrito actual.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const borrador = {
      busqueda,
      carrito,
      descuento,
      cantidadesBusqueda,
      clienteBusqueda,
      clienteSeleccionado,
      formaPago,
      montoPagado,
      montoPagadoManual,
      observacionesPago,
    };

    try {
      if (ventaTieneDatos(borrador)) {
        localStorage.setItem(
          VENTA_DRAFT_STORAGE_KEY,
          JSON.stringify(borrador),
        );
        setBorradorVisible(true);
      } else {
        localStorage.removeItem(VENTA_DRAFT_STORAGE_KEY);
        setBorradorVisible(false);
      }
    } catch (error) {
      console.error("No se pudo guardar el borrador de venta", error);
    }
  }, [
    busqueda,
    carrito,
    descuento,
    cantidadesBusqueda,
    clienteBusqueda,
    clienteSeleccionado,
    formaPago,
    montoPagado,
    montoPagadoManual,
    observacionesPago,
  ]);

  useEffect(() => {
  const texto = clienteBusqueda.trim();

  if (!texto) {
    setClientesEncontrados([]);
    return;
  }

  const timeout = setTimeout(async () => {
    try {
      const res = await fetch(
        `${API}/clientes/buscar?q=${encodeURIComponent(texto)}`
      );
      const data = await res.json();
      setClientesEncontrados(data);
    } catch (error) {
      console.error(error);
    }
  }, 300);

  return () => clearTimeout(timeout);
}, [clienteBusqueda]);

  function normalizarRespuestaVariantes(data) {
    if (Array.isArray(data)) return data;
    return Array.isArray(data.items) ? data.items : [];
  }

  function fusionarVariantes(nuevasVariantes) {
    setVariantes((prev) => {
      const porId = new Map(prev.map((variante) => [variante.id, variante]));

      nuevasVariantes.forEach((variante) => {
        porId.set(variante.id, variante);
      });

      return Array.from(porId.values());
    });
  }

  async function cargarVariantes(
    ids = carritoRef.current.map((item) => item.varianteId),
  ) {
    const idsUnicos = Array.from(new Set(ids)).filter(Boolean);

    if (idsUnicos.length === 0) {
      return [];
    }

    const params = new URLSearchParams({
      ids: idsUnicos.join(","),
      limit: String(Math.min(Math.max(idsUnicos.length, 1), 100)),
    });
    const res = await fetch(`${API}/variantes?${params.toString()}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Error cargando productos del carrito");
    }

    const items = normalizarRespuestaVariantes(data);
    fusionarVariantes(items);
    return items;
  }

  useEffect(() => {
    const texto = busqueda.trim();

    if (!texto) {
      setResultadoVarianteIds([]);
      setBuscandoVariantes(false);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setBuscandoVariantes(true);
        const params = new URLSearchParams({
          search: texto,
          page: "1",
          limit: "20",
        });
        const res = await fetch(`${API}/variantes?${params.toString()}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Error buscando productos");
        }

        const items = normalizarRespuestaVariantes(data);

        fusionarVariantes(items);
        setResultadoVarianteIds(items.map((variante) => variante.id));
      } catch (error) {
        console.error(error);
        setResultadoVarianteIds([]);
      } finally {
        setBuscandoVariantes(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [busqueda]);

  function limpiarBorradorVenta() {
    localStorage.removeItem(VENTA_DRAFT_STORAGE_KEY);
    setBusqueda("");
    setCarrito([]);
    setDescuento(0);
    setCantidadesBusqueda({});
    setClienteBusqueda("");
    setClienteSeleccionado(null);
    setClientesEncontrados([]);
    setFormaPago("EFECTIVO");
    setMontoPagado("");
    setMontoPagadoManual(false);
    setObservacionesPago("");
    setResultadoVarianteIds([]);
    setBuscandoVariantes(false);
    setBorradorVisible(false);
  }

  const variantesFiltradas = useMemo(() => {
    if (!busqueda.trim()) return [];

    return resultadoVarianteIds
      .map((id) => variantes.find((variante) => variante.id === id))
      .filter(Boolean);
  }, [variantes, resultadoVarianteIds, busqueda]);

  const cargandoVariantesCarrito = carrito.some(
    (item) => !variantes.some((variante) => variante.id === item.varianteId),
  );

  function obtenerPrecioAplicado(variante, cantidad) {
    if (!variante?.precios?.length || !cantidad || cantidad <= 0) {
      return {
        precioUnitario: 0,
        cantidadMinima: null,
      };
    }

    const preciosValidos = variante.precios
      .filter((p) => p.cantidadMinima != null && p.cantidadMinima <= cantidad)
      .sort((a, b) => b.cantidadMinima - a.cantidadMinima);

    if (preciosValidos.length === 0) {
      return {
        precioUnitario: 0,
        cantidadMinima: null,
      };
    }

    return {
      precioUnitario: preciosValidos[0].precio,
      cantidadMinima: preciosValidos[0].cantidadMinima,
    };
  }

  function handleCantidadBusquedaChange(varianteId, value) {
    setCantidadesBusqueda((prev) => ({
      ...prev,
      [varianteId]: value === "" ? "" : Math.max(1, Number(value) || 1),
    }));
  }

  function ajustarCantidadBusqueda(variante, diferencia) {
    setCantidadesBusqueda((prev) => {
      const cantidadActual = Number(prev[variante.id] || 1);
      const nuevaCantidad = Math.min(
        variante.stock,
        Math.max(1, cantidadActual + diferencia),
      );

      return { ...prev, [variante.id]: nuevaCantidad };
    });
  }

  function agregarAlCarrito(variante) {
    const cantidadElegida = Number(cantidadesBusqueda[variante.id] || 1);

    if (cantidadElegida <= 0) {
      alert("La cantidad debe ser mayor a 0");
      return;
    }

    if (cantidadElegida > variante.stock) {
      alert(`Stock insuficiente. Stock actual: ${variante.stock}`);
      return;
    }

    setCarrito((prev) => {
      const existe = prev.find((item) => item.varianteId === variante.id);

      if (existe) {
        const nuevaCantidad = existe.cantidad + cantidadElegida;

        if (nuevaCantidad > variante.stock) {
          alert(`Stock insuficiente. Stock actual: ${variante.stock}`);
          return prev;
        }

        return prev.map((item) =>
          item.varianteId === variante.id
            ? { ...item, cantidad: nuevaCantidad }
            : item
        );
      }

      return [
        ...prev,
        {
          varianteId: variante.id,
          nombre: variante.nombre,
          productoNombre: variante.producto?.nombre || "",
          cantidad: cantidadElegida,
          precioEditado: null,
        },
      ];
    });

    setCantidadesBusqueda((prev) => ({
      ...prev,
      [variante.id]: 1,
    }));

  }

  function cambiarCantidadCarrito(varianteId, value) {
    setCarrito((prev) =>
      prev.map((item) => {
        if (item.varianteId !== varianteId) return item;

        const variante = variantes.find((v) => v.id === varianteId);
        if (!variante) return item;

        if (value === "") {
          return { ...item, cantidad: "" };
        }

        let nuevaCantidad = Number(value);

        if (Number.isNaN(nuevaCantidad)) nuevaCantidad = 1;
        if (nuevaCantidad < 1) nuevaCantidad = 1;
        if (nuevaCantidad > variante.stock) nuevaCantidad = variante.stock;

        return {
          ...item,
          cantidad: nuevaCantidad,
        };
      })
    );
  }

  function ajustarCantidadCarrito(varianteId, diferencia) {
    setCarrito((prev) =>
      prev.map((item) => {
        if (item.varianteId !== varianteId) return item;

        const variante = variantes.find((v) => v.id === varianteId);
        if (!variante) return item;

        const cantidadActual = Number(item.cantidad || 1);
        return {
          ...item,
          cantidad: Math.min(
            variante.stock,
            Math.max(1, cantidadActual + diferencia),
          ),
        };
      }),
    );
  }

  function normalizarCantidadesCarrito() {
    setCarrito((prev) =>
      prev.map((item) => {
        if (item.cantidad === "" || item.cantidad == null) {
          return { ...item, cantidad: 1 };
        }
        return item;
      })
    );
  }

  function eliminarItem(varianteId) {
    setCarrito((prev) => prev.filter((item) => item.varianteId !== varianteId));
  }

  function abrirEditarPrecio(varianteId) {
    setEditandoPrecio({ varianteId, tipo: "porcentaje", valor: "" });
  }

  function cerrarEditarPrecio() {
    setEditandoPrecio(null);
  }

  function aplicarPrecioEditado() {
    if (!editandoPrecio) return;
    const { varianteId, tipo, valor } = editandoPrecio;
    const valorNum = Number(valor);

    if (!valor || isNaN(valorNum) || valorNum < 0) {
      alert("Ingresá un valor válido");
      return;
    }

    if (tipo === "porcentaje" && valorNum > 100) {
      alert("El descuento no puede ser mayor al 100%");
      return;
    }

    const item = carrito.find((i) => i.varianteId === varianteId);
    if (!item) return;

    const variante = variantes.find((v) => v.id === varianteId);
    const aplicado = obtenerPrecioAplicado(variante, Number(item.cantidad || 1));
    const precioBase = aplicado.precioUnitario;

    let nuevoPrecio;
    if (tipo === "porcentaje") {
      nuevoPrecio = Math.round(precioBase * (1 - valorNum / 100) * 100) / 100;
    } else {
      nuevoPrecio = Math.round(valorNum * 100) / 100;
    }

    setCarrito((prev) =>
      prev.map((i) =>
        i.varianteId === varianteId ? { ...i, precioEditado: nuevoPrecio } : i
      )
    );

    setEditandoPrecio(null);
  }

  function resetearPrecioEditado(varianteId) {
    setCarrito((prev) =>
      prev.map((i) =>
        i.varianteId === varianteId ? { ...i, precioEditado: null } : i
      )
    );
  }

  function calcularSubtotal() {
    return carrito.reduce((acc, item) => {
      const variante = variantes.find((v) => v.id === item.varianteId);
      if (!variante || !item.cantidad) return acc;

      const aplicado = obtenerPrecioAplicado(variante, Number(item.cantidad));
      const precio = item.precioEditado != null ? item.precioEditado : aplicado.precioUnitario;
      return acc + precio * Number(item.cantidad);
    }, 0);
  }

  const subtotal = calcularSubtotal();
  const total = Math.max(0, subtotal - descuento);
  const montoPagadoNumerico =
    formaPago === "CUENTA_CORRIENTE" ? 0 : Number(montoPagado || 0);
  const saldoPendiente = Math.max(0, total - montoPagadoNumerico);

  useEffect(() => {
    if (formaPago === "CUENTA_CORRIENTE") {
      setMontoPagado("0");
      setMontoPagadoManual(false);
      return;
    }

    if (!montoPagadoManual) {
      setMontoPagado(total > 0 ? String(total) : "");
    }
  }, [formaPago, montoPagadoManual, total]);

  async function confirmarVenta() {
    if (confirmandoVenta) {
      return;
    }

    if (carrito.length === 0) {
      alert("Agregá al menos un producto");
      return;
    }

    if (cargandoVariantesCarrito) {
      alert("Espera a que terminen de cargar los productos del carrito");
      return;
    }

    const itemsInvalidos = carrito.some(
      (item) => !item.cantidad || Number(item.cantidad) <= 0
    );

    if (itemsInvalidos) {
      alert("Hay cantidades inválidas en el carrito");
      return;
    }

    if (descuento < 0) {
      alert("El descuento no puede ser negativo");
      return;
    }

    if (descuento > subtotal) {
      alert("El descuento no puede ser mayor al subtotal");
      return;
    }

    if (!Number.isFinite(montoPagadoNumerico) || montoPagadoNumerico < 0) {
      alert("El monto pagado no puede ser negativo");
      return;
    }

    if (montoPagadoNumerico > total) {
      alert("El monto pagado no puede superar el total");
      return;
    }

    if (saldoPendiente > 0 && !clienteSeleccionado) {
      alert("Para dejar saldo pendiente tenes que seleccionar un cliente");
      return;
    }

    try {
      setConfirmandoVenta(true);

      const res = await fetch(`${API}/ventas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            clienteId: clienteSeleccionado?.id || null,
            descuento,
            formaPago,
            montoPagado: montoPagadoNumerico,
            observacionesPago: observacionesPago.trim(),
            items: carrito.map((item) => ({
              varianteId: item.varianteId,
              cantidad: Number(item.cantidad),
              precioEditado: item.precioEditado ?? null,
            })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al registrar la venta");
      }

      alert("Venta realizada ✔");

      const variantesVendidas = carrito.map((item) => item.varianteId);
      limpiarBorradorVenta();
      await cargarVariantes(variantesVendidas);

      buscadorRef.current?.focus();
    } catch (error) {
      alert(error.message);
    } finally {
      setConfirmandoVenta(false);
    }
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Ventas</h2>

      {borradorVisible && (
        <div style={styles.borradorAviso}>
          <span>
            Venta en curso guardada. Podes salir a actualizar stock y volver
            sin perder los datos.
          </span>
          <button
            style={styles.btnSecundario}
            onClick={limpiarBorradorVenta}
            disabled={confirmandoVenta}
            type="button"
          >
            Limpiar borrador
          </button>
        </div>
      )}

      <div style={styles.bloque}>
  <label style={styles.label}>Cliente (opcional)</label>

  <input
    style={styles.input}
    placeholder="Buscar cliente..."
    value={clienteBusqueda}
    disabled={confirmandoVenta}
    onChange={(e) => {
      setClienteBusqueda(e.target.value);
      setClienteSeleccionado(null);
    }}
  />

  {clienteSeleccionado ? (
    <div style={styles.clienteSeleccionadoBox}>
      <div>
        <strong>{clienteSeleccionado.nombre}</strong>
        {clienteSeleccionado.telefono && (
          <div style={styles.clienteExtra}>{clienteSeleccionado.telefono}</div>
        )}
      </div>

      <button
        style={styles.btnQuitarCliente}
        disabled={confirmandoVenta}
        onClick={() => {
          setClienteSeleccionado(null);
          setClienteBusqueda("");
          setClientesEncontrados([]);
        }}
      >
        Quitar
      </button>
    </div>
  ) : (
    clientesEncontrados.length > 0 && (
      <div style={styles.clientesDropdown}>
        {clientesEncontrados.map((cliente) => (
          <div
            key={cliente.id}
            style={styles.clienteItem}
            onClick={() => {
              setClienteSeleccionado(cliente);
              setClienteBusqueda(cliente.nombre);
              setClientesEncontrados([]);
            }}
          >
            <div style={styles.clienteNombre}>{cliente.nombre}</div>
            <div style={styles.clienteExtra}>
              {cliente.telefono || cliente.localidad || cliente.cuit || ""}
            </div>
          </div>
        ))}
      </div>
    )
  )}

  {!clienteSeleccionado && (
    <div style={styles.clienteFallback}>
      Si no seleccionás un cliente, la venta se registra como <strong>Consumidor Final</strong>.
    </div>
  )}
</div>

      <div style={styles.bloque}>
        <label style={styles.label}>Buscar producto o variante</label>
        <input
          ref={buscadorRef}
          style={styles.input}
          placeholder="Ej: Lavanda, Oreo..."
          value={busqueda}
          disabled={confirmandoVenta}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        {buscandoVariantes && (
          <div style={styles.searchStatus}>
            <LoadingContent loading={true} loadingText="Buscando productos..." />
          </div>
        )}

        {!buscandoVariantes &&
          busqueda.trim() &&
          variantesFiltradas.length === 0 && (
            <div style={styles.searchStatus}>No se encontraron productos.</div>
          )}

        {!buscandoVariantes && variantesFiltradas.length > 0 && (
          <div style={styles.resultadosCompactos}>
            {variantesFiltradas.map((variante) => {
              const cantidadPreview = Number(cantidadesBusqueda[variante.id] || 1);
              const aplicadoPreview = obtenerPrecioAplicado(variante, cantidadPreview);

              return (
                <div key={variante.id} style={styles.resultadoCard}>
  <div style={styles.resultadoLinea1}>
    <div style={styles.resultadoNombreCompleto}>
      {variante.producto?.nombre} - {variante.nombre}
    </div>

    <div style={styles.resultadoStock}>
      Stock: {variante.stock}
    </div>
  </div>

  <div className="venta-resultado-linea2" style={styles.resultadoLinea2}>
    <div className="venta-resultado-escalas" style={styles.resultadoEscalas}>
      {variante.precios?.map((p) => (
        <span key={p.id} style={styles.escalaInline}>
          {p.cantidadMinima}+ ${p.precio}
        </span>
      ))}
    </div>

    <div style={styles.selectorCantidad}>
      <button
        type="button"
        style={styles.btnCantidad}
        onClick={() => ajustarCantidadBusqueda(variante, -1)}
        disabled={confirmandoVenta}
        aria-label="Restar cantidad"
      >
        −
      </button>
      <input
        type="number"
        min="1"
        max={variante.stock}
        style={styles.inputCantidadBusqueda}
        value={cantidadesBusqueda[variante.id] ?? 1}
        disabled={confirmandoVenta}
        onChange={(e) =>
          handleCantidadBusquedaChange(variante.id, e.target.value)
        }
      />
      <button
        type="button"
        style={styles.btnCantidad}
        onClick={() => ajustarCantidadBusqueda(variante, 1)}
        disabled={confirmandoVenta}
        aria-label="Sumar cantidad"
      >
        +
      </button>
    </div>

    <div style={styles.resultadoPrecioAplicado}>
      {aplicadoPreview.cantidadMinima
        ? `${aplicadoPreview.cantidadMinima}+`
        : "-"}{" "}
      ${aplicadoPreview.precioUnitario}
    </div>

    <button
      style={styles.btnAgregar}
      onClick={() => agregarAlCarrito(variante)}
      disabled={confirmandoVenta}
    >
      +
    </button>
  </div>
</div>
              );
            })}
          </div>
        )}
      </div>

      <div style={styles.bloque}>
        <h3 style={styles.subTitle}>Carrito</h3>

        {carrito.length === 0 && (
          <p style={styles.empty}>Todavía no hay productos agregados.</p>
        )}

        {cargandoVariantesCarrito && (
          <p style={styles.empty}>
            <LoadingContent
              loading={true}
              loadingText="Cargando productos del carrito..."
            />
          </p>
        )}

        {carrito.map((item) => {
          const variante = variantes.find((v) => v.id === item.varianteId);
          const aplicado = obtenerPrecioAplicado(variante, Number(item.cantidad || 0));
          const precioFinal = item.precioEditado != null ? item.precioEditado : aplicado.precioUnitario;
          const subtotalItem = precioFinal * Number(item.cantidad || 0);
          const editandoEsteItem = editandoPrecio?.varianteId === item.varianteId;

          return (
            <div key={item.varianteId} style={styles.carritoCard}>
              <div style={styles.carritoLinea1}>
                <div style={styles.carritoNombreCompleto}>
                  {variante?.producto?.nombre || item.productoNombre || "Producto"} -{" "}
                  {item.nombre}
                </div>

                <button
                  style={styles.btnDelete}
                  onClick={() => eliminarItem(item.varianteId)}
                  disabled={confirmandoVenta}
                  title="Eliminar"
                >
                  🗑
                </button>
              </div>

              <div className="venta-carrito-linea2" style={styles.carritoLinea2}>
                <div style={styles.carritoEscala}>
                  {aplicado.cantidadMinima ? `${aplicado.cantidadMinima}+` : "-"}
                </div>

                <div style={{ ...styles.carritoPrecio, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                  {item.precioEditado != null ? (
                    <>
                      <span style={styles.precioOriginalTachado}>${aplicado.precioUnitario}</span>
                      <span style={styles.precioEditadoActivo}>${item.precioEditado}</span>
                      <button
                        style={styles.btnPrecioReset}
                        onClick={() => resetearPrecioEditado(item.varianteId)}
                        disabled={confirmandoVenta}
                        title="Restaurar precio original"
                      >✕</button>
                    </>
                  ) : (
                    <span>${aplicado.precioUnitario}</span>
                  )}
                  <button
                    style={editandoEsteItem ? styles.btnPrecioEditarActivo : styles.btnPrecioEditar}
                    onClick={() => editandoEsteItem ? cerrarEditarPrecio() : abrirEditarPrecio(item.varianteId)}
                    disabled={confirmandoVenta}
                    title="Descuento especial"
                  >%</button>
                </div>

                <div style={styles.selectorCantidad}>
                  <button
                    type="button"
                    style={styles.btnCantidad}
                    onClick={() => ajustarCantidadCarrito(item.varianteId, -1)}
                    disabled={confirmandoVenta}
                    aria-label="Restar cantidad"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={variante?.stock}
                    style={styles.carritoCantidad}
                    value={item.cantidad}
                    disabled={confirmandoVenta}
                    onChange={(e) =>
                      cambiarCantidadCarrito(item.varianteId, e.target.value)
                    }
                    onBlur={normalizarCantidadesCarrito}
                  />
                  <button
                    type="button"
                    style={styles.btnCantidad}
                    onClick={() => ajustarCantidadCarrito(item.varianteId, 1)}
                    disabled={confirmandoVenta}
                    aria-label="Sumar cantidad"
                  >
                    +
                  </button>
                </div>

                <div style={styles.carritoSubtotal}>${subtotalItem}</div>
              </div>

              {editandoEsteItem && (
                <div style={styles.carritoEditarPrecio}>
                  <div style={styles.editarTipoGroup}>
                    <button
                      style={editandoPrecio.tipo === "porcentaje" ? styles.editarTipoActivo : styles.editarTipoInactivo}
                      onClick={() => setEditandoPrecio((prev) => ({ ...prev, tipo: "porcentaje", valor: "" }))}
                    >
                      % Descuento
                    </button>
                    <button
                      style={editandoPrecio.tipo === "monto" ? styles.editarTipoActivo : styles.editarTipoInactivo}
                      onClick={() => setEditandoPrecio((prev) => ({ ...prev, tipo: "monto", valor: "" }))}
                    >
                      $ Precio directo
                    </button>
                  </div>
                  <div style={styles.editarInputGroup}>
                    <input
                      type="number"
                      min="0"
                      style={styles.editarPrecioInput}
                      placeholder={editandoPrecio.tipo === "porcentaje" ? "ej. 10 (10% off)" : "ej. 150"}
                      value={editandoPrecio.valor}
                      onChange={(e) => setEditandoPrecio((prev) => ({ ...prev, valor: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && aplicarPrecioEditado()}
                      autoFocus
                    />
                    <button style={styles.btnAplicarPrecio} onClick={aplicarPrecioEditado}>
                      Aplicar
                    </button>
                    <button style={styles.btnCancelarPrecio} onClick={cerrarEditarPrecio}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={styles.bloque}>
        <div style={styles.resumenRow}>
          <span>Subtotal</span>
          <strong>${subtotal}</strong>
        </div>

        <div style={styles.resumenRow}>
          <span>Descuento</span>
          <input
            type="number"
            min="0"
            style={styles.inputDescuento}
            value={descuento}
            disabled={confirmandoVenta}
            onChange={(e) => setDescuento(Number(e.target.value) || 0)}
          />
        </div>

        <div style={styles.pagoGrid}>
          <div>
            <label style={styles.label}>Forma de pago</label>
            <select
              style={styles.input}
              value={formaPago}
              onChange={(e) => {
                setFormaPago(e.target.value);
                setMontoPagadoManual(false);
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
              max={total}
              style={styles.input}
              value={montoPagado}
              disabled={formaPago === "CUENTA_CORRIENTE"}
              onChange={(e) => {
                setMontoPagado(e.target.value);
                setMontoPagadoManual(true);
              }}
            />
          </div>
        </div>

        <textarea
          style={styles.textarea}
          placeholder="Observaciones de pago (opcional)"
          value={observacionesPago}
          onChange={(e) => setObservacionesPago(e.target.value)}
        />

        <div style={styles.resumenRow}>
          <span>Saldo pendiente</span>
          <strong>${saldoPendiente}</strong>
        </div>

        <div style={styles.totalRow}>
          <span>Total</span>
          <strong>${total}</strong>
        </div>

        <button
          style={styles.btnConfirmar}
          onClick={confirmarVenta}
          disabled={confirmandoVenta || cargandoVariantesCarrito}
        >
          <LoadingContent
            loading={confirmandoVenta}
            loadingText="Procesando venta..."
          >
            Confirmar venta
          </LoadingContent>
        </button>
      </div>
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
  borradorAviso: {
    background: "var(--surface-selected)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: 12,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    color: "var(--text-soft)",
    fontSize: 13,
  },
  subTitle: {
    margin: 0,
  },
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
    minHeight: 72,
    padding: 10,
    borderRadius: 10,
    border: "1px solid var(--border-strong)",
    fontSize: 14,
    boxSizing: "border-box",
    resize: "vertical",
    marginBottom: 10,
  },
  pagoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginBottom: 10,
  },
  btnSecundario: {
    border: "1px solid var(--border-strong)",
    borderRadius: 10,
    background: "var(--surface)",
    color: "var(--text)",
    padding: "8px 10px",
    fontWeight: 600,
  },
  resultadosCompactos: {
    marginTop: 10,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  resultadoRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1.6fr 70px auto auto",
    gap: 8,
    alignItems: "center",
    borderBottom: "1px solid var(--border-subtle)",
    paddingBottom: 8,
  },
  resultadoNombre: {
    fontWeight: 600,
    fontSize: 14,
  },
  empty: {
    margin: 0,
    color: "var(--text-muted)",
  },
  searchStatus: {
    color: "var(--text-muted)",
    fontSize: 13,
    marginTop: 10,
  },
  carritoCard: {
  borderBottom: "1px solid var(--border-subtle)",
  padding: "10px 0",
  display: "flex",
  flexDirection: "column",
  gap: 6,
},

carritoLinea1: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
},

carritoNombreCompleto: {
  fontWeight: 600,
  fontSize: 14,
  lineHeight: 1.2,
  flex: 1,
},

carritoLinea2: {
  display: "grid",
  gridTemplateColumns: "0.8fr 1fr auto 1fr",
  gap: 8,
  alignItems: "center",
  fontSize: 14,
},

carritoEscala: {
  textAlign: "left",
  color: "var(--text-soft)",
  fontSize: 13,
},

carritoPrecio: {
  textAlign: "left",
  fontSize: 13,
},

carritoCantidad: {
  width: 52,
  padding: 6,
  borderRadius: 8,
  border: "1px solid var(--border-strong)",
  textAlign: "center",
  boxSizing: "border-box",
},

selectorCantidad: {
  display: "flex",
  alignItems: "center",
  gap: 4,
},

btnCantidad: {
  width: 28,
  height: 30,
  padding: 0,
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: 18,
  fontWeight: 700,
  cursor: "pointer",
  flexShrink: 0,
},

carritoSubtotal: {
  textAlign: "right",
  fontWeight: 600,
  fontSize: 13,
},

btnDelete: {
  border: "none",
  background: "transparent",
  fontSize: 18,
  cursor: "pointer",
  padding: 0,
},

btnPrecioEditar: {
  border: "1px solid var(--border-strong)",
  borderRadius: 6,
  background: "transparent",
  color: "var(--text-soft)",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
  padding: "1px 5px",
  lineHeight: 1.4,
},

btnPrecioEditarActivo: {
  border: "1px solid var(--primary)",
  borderRadius: 6,
  background: "var(--primary-soft)",
  color: "var(--primary)",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
  padding: "1px 5px",
  lineHeight: 1.4,
},

btnPrecioReset: {
  border: "none",
  background: "transparent",
  color: "var(--text-muted)",
  fontSize: 11,
  cursor: "pointer",
  padding: "1px 3px",
  lineHeight: 1,
},

precioOriginalTachado: {
  textDecoration: "line-through",
  color: "var(--text-muted)",
  fontSize: 11,
},

precioEditadoActivo: {
  color: "var(--warning)",
  fontWeight: 700,
  fontSize: 13,
},

carritoEditarPrecio: {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "8px 10px",
  display: "flex",
  flexDirection: "column",
  gap: 8,
  marginTop: 2,
},

editarTipoGroup: {
  display: "flex",
  gap: 6,
},

editarTipoActivo: {
  border: "1px solid var(--primary)",
  borderRadius: 6,
  background: "var(--primary-soft)",
  color: "var(--primary)",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  padding: "4px 10px",
},

editarTipoInactivo: {
  border: "1px solid var(--border-strong)",
  borderRadius: 6,
  background: "transparent",
  color: "var(--text-soft)",
  fontSize: 12,
  cursor: "pointer",
  padding: "4px 10px",
},

editarInputGroup: {
  display: "flex",
  gap: 6,
  alignItems: "center",
},

editarPrecioInput: {
  flex: 1,
  padding: "6px 8px",
  borderRadius: 6,
  border: "1px solid var(--border-strong)",
  fontSize: 13,
  boxSizing: "border-box",
},

btnAplicarPrecio: {
  border: "none",
  borderRadius: 6,
  background: "var(--primary)",
  color: "#fff",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  padding: "6px 12px",
  whiteSpace: "nowrap",
},

btnCancelarPrecio: {
  border: "1px solid var(--border-strong)",
  borderRadius: 6,
  background: "transparent",
  color: "var(--text-soft)",
  fontSize: 12,
  cursor: "pointer",
  padding: "6px 10px",
  whiteSpace: "nowrap",
},
  resumenRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  inputDescuento: {
    width: 100,
    padding: 8,
    borderRadius: 8,
    border: "1px solid var(--border-strong)",
    textAlign: "right",
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 18,
    marginTop: 8,
    marginBottom: 16,
  },
  btnConfirmar: {
    width: "100%",
    padding: 14,
    border: "none",
    borderRadius: 12,
    background: "var(--success)",
    color: "var(--text-inverse)",
    fontSize: 16,
    fontWeight: 700,
  },
  resultadoCard: {
  borderBottom: "1px solid var(--border-subtle)",
  padding: "8px 0",
  display: "flex",
  flexDirection: "column",
  gap: 6,
},

resultadoLinea1: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
},

resultadoNombreCompleto: {
  fontWeight: 600,
  fontSize: 14,
  lineHeight: 1.2,
  flex: 1,
},

resultadoStock: {
  fontSize: 12,
  color: "var(--text-soft)",
  whiteSpace: "nowrap",
},

resultadoLinea2: {
  display: "grid",
  gridTemplateColumns: "1fr auto auto auto",
  gap: 8,
  alignItems: "center",
},

resultadoEscalas: {
  fontSize: 12,
  color: "var(--text-muted)",
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
},

escalaInline: {
  whiteSpace: "nowrap",
},

inputCantidadBusqueda: {
  width: 52,
  padding: 6,
  borderRadius: 8,
  border: "1px solid var(--border-strong)",
  textAlign: "center",
  boxSizing: "border-box",
},

resultadoPrecioAplicado: {
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: "nowrap",
},

btnAgregar: {
  border: "none",
  borderRadius: 8,
  background: "var(--primary)",
  color: "var(--text-inverse)",
  width: 34,
  height: 34,
  fontSize: 18,
  fontWeight: 700,
},
clienteSeleccionadoBox: {
  marginTop: 10,
  padding: 10,
  border: "1px solid var(--border-success)",
  background: "var(--surface-success)",
  borderRadius: 10,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
},

btnQuitarCliente: {
  border: "none",
  background: "var(--danger)",
  color: "var(--text-inverse)",
  padding: "8px 10px",
  borderRadius: 8,
  fontSize: 12,
},

clientesDropdown: {
  marginTop: 8,
  border: "1px solid var(--border)",
  borderRadius: 10,
  overflow: "hidden",
  background: "var(--surface)",
},

clienteItem: {
  padding: 10,
  borderBottom: "1px solid var(--border-subtle)",
  cursor: "pointer",
},

clienteNombre: {
  fontWeight: 600,
  fontSize: 14,
},

clienteExtra: {
  fontSize: 12,
  color: "var(--text-muted)",
  marginTop: 2,
},

clienteFallback: {
  marginTop: 8,
  fontSize: 12,
  color: "var(--text-muted)",
},
};
