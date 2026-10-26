import { useEffect, useRef, useState } from "react";
import { API_URL as API } from "../../config/api";
import LoadingContent from "../../components/LoadingContent";
import styles from "./AvisoDeudaCliente.module.css";

const CONSULTA_INICIAL = { cargando: true, saldo: null, error: "" };

export default function AvisoDeudaCliente({
  cliente,
  onAbrirCuentaCorriente,
  onConsultaFinalizada,
  deshabilitado = false,
}) {
  const [consulta, setConsulta] = useState(CONSULTA_INICIAL);
  const [intento, setIntento] = useState(0);
  const [confirmacionAbierta, setConfirmacionAbierta] = useState(false);
  const dialogoRef = useRef(null);
  const botonCobranzaRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();

    async function consultarDeuda() {
      try {
        const res = await fetch(
          `${API}/cobranzas/clientes/${cliente.id}/cuenta-corriente`,
          { signal: controller.signal },
        );
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "No se pudo consultar la deuda del cliente.");
        }

        const saldo = data?.resumen?.saldoPendiente;
        if (typeof saldo !== "number" || !Number.isFinite(saldo) || saldo < 0) {
          throw new Error("No se pudo consultar la deuda del cliente.");
        }

        if (!controller.signal.aborted) {
          setConsulta({ cargando: false, saldo, error: "" });
          setConfirmacionAbierta(saldo > 0);
          onConsultaFinalizada(cliente.id);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setConsulta({
            cargando: false,
            saldo: null,
            error: error.message || "No se pudo consultar la deuda del cliente.",
          });
          onConsultaFinalizada(cliente.id);
        }
      }
    }

    consultarDeuda();
    return () => controller.abort();
  }, [cliente.id, intento, onConsultaFinalizada]);

  useEffect(() => {
    const dialogo = dialogoRef.current;
    if (!dialogo) return;

    if (confirmacionAbierta && !deshabilitado) {
      dialogo.showModal();
    }

    return () => dialogo.close();
  }, [confirmacionAbierta, deshabilitado]);

  function cancelarCobranza() {
    dialogoRef.current?.close();
    setConfirmacionAbierta(false);
    botonCobranzaRef.current?.focus();
  }

  if (consulta.cargando) {
    return (
      <div className={styles.estado} role="status">
        <LoadingContent loading={true} loadingText="Consultando deuda del cliente..." />
      </div>
    );
  }

  if (consulta.error) {
    return (
      <div className={styles.aviso} role="alert">
        <span>No se pudo verificar la deuda anterior. {consulta.error}</span>
        <button
          className={styles.secundario}
          type="button"
          disabled={deshabilitado}
          onClick={() => {
            onConsultaFinalizada(null);
            setConsulta(CONSULTA_INICIAL);
            setIntento((actual) => actual + 1);
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (consulta.saldo <= 0) return null;

  const saldoFormateado = `$${consulta.saldo.toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

  return (
    <>
      <div className={styles.aviso}>
        <strong>Deuda anterior: {saldoFormateado}</strong>
        <button
          ref={botonCobranzaRef}
          className={styles.secundario}
          type="button"
          disabled={deshabilitado}
          onClick={() => setConfirmacionAbierta(true)}
        >
          Realizar una cobranza
        </button>
      </div>

      <dialog
        ref={dialogoRef}
        className={styles.dialogo}
        aria-labelledby="deuda-cliente-titulo"
        aria-describedby="deuda-cliente-descripcion"
        onCancel={(event) => {
          event.preventDefault();
          cancelarCobranza();
        }}
      >
        <h3 id="deuda-cliente-titulo">El cliente posee una deuda anterior</h3>
        <p id="deuda-cliente-descripcion">
          <strong>{cliente.nombre}</strong> tiene un saldo pendiente de{" "}
          <strong>{saldoFormateado}</strong>. ¿Desea realizar una cobranza?
        </p>
        <p className={styles.aclaracion}>
          Se abrirá su cuenta corriente. La venta en curso queda guardada para retomarla.
        </p>
        <div className={styles.acciones}>
          <button
            className={styles.secundario}
            type="button"
            onClick={cancelarCobranza}
            autoFocus
          >
            Cancelar
          </button>
          <button
            className={styles.primario}
            type="button"
            disabled={deshabilitado}
            onClick={() => onAbrirCuentaCorriente(cliente.id)}
          >
            Aceptar
          </button>
        </div>
      </dialog>
    </>
  );
}
