import { useEffect, useRef, useState } from "react";
import LoadingContent from "../../components/LoadingContent";
import { API_URL as API } from "../../config/api";
import styles from "./EditorVenta.module.css";

const dinero = (valor) => Number(valor).toLocaleString("es-AR", {
  style: "currency", currency: "ARS", minimumFractionDigits: 2,
});
const redondear = (valor) => Math.round(Number(valor) * 100) / 100;
const nombreVariante = (variante) =>
  [variante?.producto?.nombre, variante?.nombre].filter(Boolean).join(" / ") || "Producto";

function precioParaCantidad(variante, cantidad) {
  return variante.precios?.filter((precio) =>
    precio.cantidadMinima != null && precio.cantidadMinima <= cantidad,
  ).sort((a, b) => b.cantidadMinima - a.cantidadMinima)[0]?.precio;
}

export default function EditorVenta({ venta, onCancelar, onGuardada }) {
  const [items, setItems] = useState(() => venta.detalles.map((detalle) => ({
    key: `detalle-${detalle.id}`,
    detalleId: detalle.id,
    varianteId: detalle.varianteId,
    variante: detalle.variante,
    cantidad: String(detalle.cantidad),
    precioUnitario: String(detalle.precioUnitario),
  })));
  const [descuento, setDescuento] = useState(String(venta.descuento));
  const [busqueda, setBusqueda] = useState("");
  const [busquedaEstado, setBusquedaEstado] = useState({ texto: "", items: [], error: "", cargando: false });
  const [cantidades, setCantidades] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const enviando = useRef(false);
  const siguienteKey = useRef(0);
  const textoBusqueda = busqueda.trim();
  const resultadoActual = busquedaEstado.texto === textoBusqueda;
  const resultados = resultadoActual ? busquedaEstado.items : [];

  useEffect(() => {
    if (!textoBusqueda) return;
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setBusquedaEstado({ texto: textoBusqueda, items: [], error: "", cargando: true });
      try {
        const params = new URLSearchParams({ search: textoBusqueda, page: "1", limit: "20" });
        const res = await fetch(`${API}/variantes?${params}`, { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se pudieron buscar productos.");
        if (!controller.signal.aborted) {
          setBusquedaEstado({ texto: textoBusqueda, items: Array.isArray(data) ? data : data.items || [], error: "", cargando: false });
        }
      } catch (e) {
        if (!controller.signal.aborted) {
          setBusquedaEstado({ texto: textoBusqueda, items: [], error: e.message, cargando: false });
        }
      }
    }, 300);
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [textoBusqueda]);

  const cantidadesOriginales = new Map();
  for (const detalle of venta.detalles) {
    cantidadesOriginales.set(detalle.varianteId, (cantidadesOriginales.get(detalle.varianteId) || 0) + detalle.cantidad);
  }
  const subtotal = redondear(items.reduce((sum, item) =>
    sum + redondear(Number(item.cantidad) * Number(item.precioUnitario)), 0));
  const total = redondear(subtotal - Number(descuento));
  const pagado = Number(venta.montoPagado || 0);
  const saldo = redondear(total - pagado);
  const tieneCliente = Boolean(venta.clienteId || venta.cliente?.id);

  function modificarItem(key, campo, valor) {
    setItems((prev) => prev.map((item) => item.key === key ? { ...item, [campo]: valor } : item));
    setError("");
  }

  function agregar(variante) {
    const cantidad = Number(cantidades[variante.id] ?? 1);
    const existente = items.find((item) => item.varianteId === variante.id);
    const precio = existente ? Number(existente.precioUnitario) : precioParaCantidad(variante, cantidad);
    const cantidadEnVenta = items.filter((item) => item.varianteId === variante.id)
      .reduce((sum, item) => sum + Number(item.cantidad), 0);
    const disponible = variante.stock + (cantidadesOriginales.get(variante.id) || 0);
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      setError("Ingresá una cantidad entera mayor a 0 para agregar el producto.");
      return;
    }
    if (cantidadEnVenta + cantidad > disponible) {
      setError(`Stock insuficiente para ${nombreVariante(variante)}. Podés incluir hasta ${disponible} unidades en esta venta.`);
      return;
    }
    if (!Number.isFinite(precio) || precio < 0) {
      setError("No hay precio configurado para esa cantidad.");
      return;
    }
    if (existente) {
      modificarItem(existente.key, "cantidad", String(Number(existente.cantidad) + cantidad));
    } else {
      siguienteKey.current += 1;
      setItems((prev) => [...prev, {
        key: `nuevo-${siguienteKey.current}`, varianteId: variante.id, variante,
        cantidad: String(cantidad), precioUnitario: String(precio),
      }]);
    }
    setCantidades((prev) => ({ ...prev, [variante.id]: "1" }));
    setError("");
  }

  async function guardar(event) {
    event.preventDefault();
    if (enviando.current) return;
    if (!items.length) { setError("La venta debe tener al menos un producto."); return; }
    if (items.some((item) => !Number.isSafeInteger(Number(item.cantidad)) || Number(item.cantidad) < 1)) {
      setError("Todas las cantidades deben ser enteras y mayores a 0."); return;
    }
    if (items.some((item) => item.precioUnitario === "" || !Number.isFinite(Number(item.precioUnitario)) || Number(item.precioUnitario) < 0)) {
      setError("Revisá los precios: deben ser importes válidos, mayores o iguales a 0."); return;
    }
    if (descuento === "" || !Number.isFinite(Number(descuento)) || Number(descuento) < 0 || Number(descuento) > subtotal) {
      setError("El descuento debe estar entre 0 y el subtotal."); return;
    }
    if (saldo < 0) {
      setError("La venta tiene cobros registrados por un importe mayor al nuevo total. Revisá el pago antes de reducir la venta."); return;
    }
    if (!tieneCliente && saldo !== 0) {
      setError("Esta venta no tiene un cliente asociado. El total debe coincidir con lo pagado para no dejar saldo pendiente sin cliente."); return;
    }
    if (!venta.versionEdicion) {
      setError("Cerrá este detalle y volvé a abrir la venta para cargar su versión actual antes de editarla."); return;
    }
    enviando.current = true;
    setGuardando(true);
    setError("");
    try {
      const res = await fetch(`${API}/ventas/${venta.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: venta.versionEdicion,
          descuento: Number(descuento),
          items: items.map(({ detalleId, varianteId, cantidad, precioUnitario }) => ({
            detalleId, varianteId, cantidad: Number(cantidad), precioUnitario: Number(precioUnitario),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(`${data.error || "No se pudieron guardar los cambios."}${res.status === 409 ? " Cancelá la edición y volvé a abrir la venta para revisar los datos actuales." : ""}`);
      }
      await onGuardada(data);
    } catch (e) {
      setError(e.message);
    } finally {
      enviando.current = false;
      setGuardando(false);
    }
  }

  return (
    <form className={styles.editor} onSubmit={guardar}>
      <p className={styles.ayuda}>Agregá o quitá productos y ajustá cantidades. Al guardar se actualizan el stock y la cuenta corriente. Los cobros registrados se conservan.</p>
      <fieldset className={styles.campos} disabled={guardando}>
        <legend className={styles.titulo}>Productos de la venta</legend>
        {items.map((item) => (
          <div className={styles.item} key={item.key}>
            <div className={styles.encabezadoItem}>
              <strong>{nombreVariante(item.variante)}</strong>
              <button type="button" className={styles.quitar} onClick={() => { setItems((prev) => prev.filter((linea) => linea.key !== item.key)); setError(""); }} aria-label={`Quitar ${nombreVariante(item.variante)}`}>Quitar</button>
            </div>
            <div className={styles.lineaItem}>
              <label>Cantidad<input type="number" min="1" step="1" required value={item.cantidad} onChange={(e) => modificarItem(item.key, "cantidad", e.target.value)} /></label>
              <label>Precio unitario<input type="number" min="0" step="any" required value={item.precioUnitario} onChange={(e) => modificarItem(item.key, "precioUnitario", e.target.value)} /></label>
              <div className={styles.importe}><span>Importe</span><strong>{dinero(redondear(Number(item.cantidad) * Number(item.precioUnitario)))}</strong></div>
            </div>
          </div>
        ))}
        {!items.length && <p className={styles.ayuda}>Agregá al menos un producto para guardar la venta.</p>}

        <div className={styles.buscador}>
          <label>Agregar productos<input type="search" placeholder="Buscar producto o variante..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }} /></label>
          {textoBusqueda && (!resultadoActual || busquedaEstado.cargando) && <p role="status"><LoadingContent loading loadingText="Buscando productos..." /></p>}
          {textoBusqueda && resultadoActual && busquedaEstado.error && <p role="alert" className={styles.error}>{busquedaEstado.error}</p>}
          {textoBusqueda && resultadoActual && !busquedaEstado.cargando && !busquedaEstado.error && resultados.length === 0 && <p className={styles.ayuda}>No se encontraron productos.</p>}
          {textoBusqueda && resultados.map((variante) => {
            const cantidad = cantidades[variante.id] ?? "1";
            const existente = items.find((item) => item.varianteId === variante.id);
            const precio = existente ? Number(existente.precioUnitario) : precioParaCantidad(variante, Number(cantidad));
            const disponible = variante.stock + (cantidadesOriginales.get(variante.id) || 0);
            return (
              <div className={styles.resultado} key={variante.id}>
                <div><strong>{nombreVariante(variante)}</strong><small>Hasta {disponible} unidades en esta venta · {precio == null ? "Sin precio para esta cantidad" : `${dinero(precio)} c/u`}</small></div>
                <div className={styles.agregarAcciones}>
                  <label>Cantidad<input type="number" min="1" step="1" value={cantidad} aria-label={`Cantidad a agregar de ${nombreVariante(variante)}`} onChange={(e) => setCantidades((prev) => ({ ...prev, [variante.id]: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregar(variante); } }} /></label>
                  <button type="button" className={styles.secundario} onClick={() => agregar(variante)}>Agregar</button>
                </div>
              </div>
            );
          })}
          {resultados.length === 20 && <p className={styles.ayuda}>Se muestran hasta 20 resultados. Escribí un nombre más específico para encontrar otro producto.</p>}
        </div>

        <div className={styles.resumen} aria-live="polite">
          <div><span>Subtotal</span><strong>{dinero(subtotal)}</strong></div>
          <label className={styles.descuento}>Descuento<input type="number" min="0" max={subtotal} step="0.01" required value={descuento} onChange={(e) => { setDescuento(e.target.value); setError(""); }} /></label>
          <div className={styles.total}><span>Nuevo total</span><strong>{dinero(total)}</strong></div>
          <div><span>Ya pagado</span><strong>{dinero(pagado)}</strong></div>
          <div><span>Nuevo saldo pendiente</span><strong>{dinero(saldo)}</strong></div>
        </div>
        {saldo < 0 && <p className={styles.aviso}>Hay cobros registrados por {dinero(pagado)}. Revisá el pago antes de guardar un total menor a ese importe.</p>}
        {!tieneCliente && saldo !== 0 && <p className={styles.aviso}>Esta venta no tiene cliente asociado. El total debe coincidir con lo pagado para poder guardar.</p>}
      </fieldset>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <div className={styles.acciones}>
        <button type="button" className={styles.secundario} onClick={onCancelar} disabled={guardando}>Cancelar edición</button>
        <button type="submit" className={styles.principal} disabled={guardando || !items.length}>
          <LoadingContent loading={guardando} loadingText="Guardando cambios...">Guardar cambios</LoadingContent>
        </button>
      </div>
    </form>
  );
}
