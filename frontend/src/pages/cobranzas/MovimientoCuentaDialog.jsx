import { useEffect, useRef, useState } from "react";
import LoadingContent from "../../components/LoadingContent";
import { API_URL as API } from "../../config/api";
import { getToken } from "../../services/auth";
import styles from "./MovimientoCuentaDialog.module.css";

const FORMAS_COBRO = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "TARJETA", label: "Tarjeta" },
  { value: "OTRO", label: "Otro" },
];

const redondear = (valor) => Math.round(Number(valor) * 100) / 100;
const dinero = (valor) => Number(valor).toLocaleString("es-AR", {
  style: "currency", currency: "ARS", maximumFractionDigits: 2,
});

export default function MovimientoCuentaDialog({ cuenta, operacion, onCerrar, onGuardado }) {
  const esAjuste = operacion.tipo === "ajuste";
  const venta = operacion.venta;
  const saldoActual = cuenta.resumen.saldoPendiente;
  const limiteCobro = Math.max(0, Math.min(saldoActual, venta?.saldoPendiente ?? saldoActual));
  const [tipoAjuste, setTipoAjuste] = useState("DEBITO");
  const [monto, setMonto] = useState(esAjuste ? "" : String(limiteCobro));
  const [formaPago, setFormaPago] = useState("EFECTIVO");
  const [observaciones, setObservaciones] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const enviando = useRef(false);
  const dialogoRef = useRef(null);
  const importe = redondear(monto);
  const importeValido = monto.trim() !== "" && Number.isFinite(importe) && importe > 0;
  const saldoPrevisto = redondear(saldoActual + (importeValido
    ? importe * (esAjuste && tipoAjuste === "DEBITO" ? 1 : -1) : 0));

  useEffect(() => {
    const dialogo = dialogoRef.current;
    dialogo.showModal();
    return () => dialogo.close();
  }, []);

  function cerrar() {
    if (!enviando.current) onCerrar();
  }

  async function guardar(event) {
    event.preventDefault();
    if (enviando.current) return;
    if (!importeValido) { setError("Ingresá un importe mayor a cero."); return; }
    if (!esAjuste && importe > limiteCobro) {
      setError("El monto no puede superar el saldo disponible para cobrar."); return;
    }
    if (esAjuste && !observaciones.trim()) {
      setError("Ingresá el motivo del ajuste."); return;
    }

    enviando.current = true;
    setGuardando(true);
    setError("");
    try {
      const ruta = esAjuste
        ? `/cobranzas/clientes/${cuenta.cliente.id}/ajustes`
        : venta ? "/cobranzas/cobros" : `/cobranzas/clientes/${cuenta.cliente.id}/cobros`;
      const body = esAjuste
        ? { tipo: tipoAjuste, monto: importe, motivo: observaciones.trim() }
        : { ...(venta ? { ventaId: venta.id } : {}), monto: importe, formaPago, observaciones: observaciones.trim() };
      const token = getToken();
      const res = await fetch(`${API}${ruta}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar el movimiento.");
      onGuardado(data, esAjuste ? "Ajuste registrado." : "Cobro registrado.");
    } catch (e) {
      setError(e.message || "No se pudo guardar el movimiento.");
    } finally {
      enviando.current = false;
      setGuardando(false);
    }
  }

  return (
    <dialog
      ref={dialogoRef}
      className={styles.dialogo}
      aria-labelledby="movimiento-cuenta-titulo"
      onCancel={(event) => { event.preventDefault(); cerrar(); }}
    >
      <form className={styles.formulario} onSubmit={guardar}>
        <h3 id="movimiento-cuenta-titulo">{esAjuste ? "Ajustar saldo" : "Registrar cobro"}</h3>
        <strong>{cuenta.cliente.nombre}</strong>
        <p className={styles.ayuda}>
          {esAjuste
            ? "El ajuste modifica la cuenta corriente y queda en el historial. No cambia productos, stock ni cobros."
            : venta
              ? `Venta #${venta.id}. Disponible para cobrar: ${dinero(limiteCobro)}.`
              : "El cobro se aplica primero a las ventas más antiguas y luego al saldo de ajustes."}
        </p>

        {esAjuste && (
          <label>
            Tipo de ajuste
            <select value={tipoAjuste} onChange={(event) => setTipoAjuste(event.target.value)} disabled={guardando}>
              <option value="DEBITO">Aumentar deuda</option>
              <option value="CREDITO">Reducir deuda / agregar saldo a favor</option>
            </select>
          </label>
        )}

        <label>
          Importe
          <input
            type="number" min="0.01" step="0.01" max={esAjuste ? undefined : limiteCobro}
            required autoFocus value={monto} disabled={guardando}
            onChange={(event) => setMonto(event.target.value)}
          />
        </label>

        {!esAjuste && (
          <label>
            Forma de pago
            <select value={formaPago} onChange={(event) => setFormaPago(event.target.value)} disabled={guardando}>
              {FORMAS_COBRO.map((forma) => <option key={forma.value} value={forma.value}>{forma.label}</option>)}
            </select>
          </label>
        )}

        <label>
          {esAjuste ? "Motivo del ajuste" : "Observaciones (opcional)"}
          <textarea
            value={observaciones} required={esAjuste} maxLength={500} rows={3}
            disabled={guardando} onChange={(event) => setObservaciones(event.target.value)}
            placeholder={esAjuste ? "Ej.: corrección de saldo inicial, bonificación..." : ""}
          />
        </label>

        <div className={styles.resumen} aria-live="polite">
          <div><span>{saldoActual < 0 ? "Saldo actual a favor" : "Saldo actual"}</span><strong>{dinero(Math.abs(saldoActual))}</strong></div>
          <div><span>{saldoPrevisto < 0 ? "Saldo resultante a favor" : "Saldo resultante"}</span><strong>{dinero(Math.abs(saldoPrevisto))}</strong></div>
        </div>

        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.acciones}>
          <button type="button" onClick={cerrar} disabled={guardando}>Cancelar</button>
          <button className={styles.primario} type="submit" disabled={guardando}>
            <LoadingContent loading={guardando} loadingText="Guardando...">
              {esAjuste ? "Guardar ajuste" : "Guardar cobro"}
            </LoadingContent>
          </button>
        </div>
      </form>
    </dialog>
  );
}
