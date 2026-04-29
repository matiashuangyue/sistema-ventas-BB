import { useEffect, useMemo, useRef, useState } from "react";
import { getToken } from "../../services/auth";
import { API_URL as API } from "../../config/api";

export default function Ventas() {
  const token = getToken();
  const buscadorRef = useRef(null);

  const [variantes, setVariantes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [carrito, setCarrito] = useState([]);
  const [descuento, setDescuento] = useState(0);
  const [cantidadesBusqueda, setCantidadesBusqueda] = useState({});
  const [clienteBusqueda, setClienteBusqueda] = useState("");
  const [clientesEncontrados, setClientesEncontrados] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  

  useEffect(() => {
    cargarVariantes();
  }, []);

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

  async function cargarVariantes() {
    const data = await fetch(`${API}/variantes`).then((r) => r.json());
    setVariantes(data);
  }

  const variantesFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return [];

    return variantes.filter((v) => {
      const combinado = `${v.producto?.nombre || ""} ${v.nombre}`.toLowerCase();
      return combinado.includes(texto);
    });
  }, [variantes, busqueda]);

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
        },
      ];
    });

    setCantidadesBusqueda((prev) => ({
      ...prev,
      [variante.id]: 1,
    }));

    setBusqueda("");

    setTimeout(() => {
      buscadorRef.current?.focus();
    }, 0);
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

  function calcularSubtotal() {
    return carrito.reduce((acc, item) => {
      const variante = variantes.find((v) => v.id === item.varianteId);
      if (!variante || !item.cantidad) return acc;

      const aplicado = obtenerPrecioAplicado(variante, Number(item.cantidad));
      return acc + aplicado.precioUnitario * Number(item.cantidad);
    }, 0);
  }

  const subtotal = calcularSubtotal();
  const total = Math.max(0, subtotal - descuento);

  async function confirmarVenta() {
    if (carrito.length === 0) {
      alert("Agregá al menos un producto");
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

    try {
      const res = await fetch(`${API}/ventas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            clienteId: clienteSeleccionado?.id || null,
            descuento,
            items: carrito.map((item) => ({
            varianteId: item.varianteId,
            cantidad: Number(item.cantidad),
         })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al registrar la venta");
      }

      alert("Venta realizada ✔");

      setCarrito([]);
      setDescuento(0);
      setClienteSeleccionado(null);
      setClienteBusqueda("");
      setClientesEncontrados([]);
      await cargarVariantes();

      buscadorRef.current?.focus();
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Ventas</h2>

      <div style={styles.bloque}>
  <label style={styles.label}>Cliente (opcional)</label>

  <input
    style={styles.input}
    placeholder="Buscar cliente..."
    value={clienteBusqueda}
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
          onChange={(e) => setBusqueda(e.target.value)}
        />

        {variantesFiltradas.length > 0 && (
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

  <div style={styles.resultadoLinea2}>
    <div style={styles.resultadoEscalas}>
      {variante.precios?.map((p) => (
        <span key={p.id} style={styles.escalaInline}>
          {p.cantidadMinima}+ ${p.precio}
        </span>
      ))}
    </div>

    <input
      type="number"
      min="1"
      style={styles.inputCantidadBusqueda}
      value={cantidadesBusqueda[variante.id] ?? 1}
      onChange={(e) =>
        handleCantidadBusquedaChange(variante.id, e.target.value)
      }
    />

    <div style={styles.resultadoPrecioAplicado}>
      {aplicadoPreview.cantidadMinima
        ? `${aplicadoPreview.cantidadMinima}+`
        : "-"}{" "}
      ${aplicadoPreview.precioUnitario}
    </div>

    <button
      style={styles.btnAgregar}
      onClick={() => agregarAlCarrito(variante)}
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

        {carrito.map((item) => {
          const variante = variantes.find((v) => v.id === item.varianteId);
          const aplicado = obtenerPrecioAplicado(variante, Number(item.cantidad || 0));
          const subtotalItem =
            aplicado.precioUnitario * Number(item.cantidad || 0);

          return (
            <div key={item.varianteId} style={styles.carritoCard}>
  <div style={styles.carritoLinea1}>
    <div style={styles.carritoNombreCompleto}>
      {variante?.producto?.nombre} - {item.nombre}
    </div>

    <button
      style={styles.btnDelete}
      onClick={() => eliminarItem(item.varianteId)}
      title="Eliminar"
    >
      🗑
    </button>
  </div>

  <div style={styles.carritoLinea2}>
    <div style={styles.carritoEscala}>
      {aplicado.cantidadMinima ? `${aplicado.cantidadMinima}+` : "-"}
    </div>

    <div style={styles.carritoPrecio}>${aplicado.precioUnitario}</div>

    <input
      type="number"
      min="1"
      style={styles.carritoCantidad}
      value={item.cantidad}
      onChange={(e) =>
        cambiarCantidadCarrito(item.varianteId, e.target.value)
      }
      onBlur={normalizarCantidadesCarrito}
    />

    <div style={styles.carritoSubtotal}>${subtotalItem}</div>
  </div>
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
            onChange={(e) => setDescuento(Number(e.target.value) || 0)}
          />
        </div>

        <div style={styles.totalRow}>
          <span>Total</span>
          <strong>${total}</strong>
        </div>

        <button style={styles.btnConfirmar} onClick={confirmarVenta}>
          Confirmar venta
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
  gridTemplateColumns: "0.8fr 1fr 80px 1fr",
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
  width: "100%",
  padding: 6,
  borderRadius: 8,
  border: "1px solid var(--border-strong)",
  textAlign: "center",
  boxSizing: "border-box",
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
  gridTemplateColumns: "1fr 70px auto auto",
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
  width: "100%",
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
