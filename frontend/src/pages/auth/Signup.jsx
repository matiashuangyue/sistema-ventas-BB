import { useState } from "react";
import LoadingContent from "../../components/LoadingContent";
import styles from "./Auth.module.css";

export default function Signup({ onBack, API }) {
  const [form, setForm] = useState({
    nombre: "",
    username: "",
    email: "",
    password: "",
    rol: "admin",
    codigoInvitacion: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al registrar");

      alert("Usuario creado con exito. Ahora podes iniciar sesion.");
      onBack();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h2 className={styles.title}>Nuevo Usuario</h2>
          <p className={styles.subtitle}>Crear cuenta para gestion de B&B</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            className={styles.input}
            placeholder="Nombre completo"
            required
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />

          <input
            autoCapitalize="none"
            autoCorrect="off"
            className={styles.input}
            placeholder="Nombre de usuario"
            required
            spellCheck={false}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />

          <input
            autoCapitalize="none"
            autoCorrect="off"
            className={styles.input}
            inputMode="email"
            placeholder="Correo electronico"
            required
            spellCheck={false}
            type="email"
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <input
            autoCapitalize="none"
            autoCorrect="off"
            className={styles.input}
            placeholder="Contrasena"
            required
            spellCheck={false}
            type="password"
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />

          <div className={styles.divider}></div>

          <label className={styles.secretLabel}>Codigo de invitacion</label>
          <input
            autoCapitalize="none"
            autoCorrect="off"
            className={styles.inputSecret}
            placeholder="Clave de acceso"
            required
            spellCheck={false}
            type="password"
            onChange={(e) =>
              setForm({ ...form, codigoInvitacion: e.target.value })
            }
          />

          {error && <div className={styles.errorBox}>{error}</div>}

          <button
            className={`${styles.primaryButton} ${loading ? styles.loading : ""}`}
            disabled={loading}
            type="submit"
          >
            <LoadingContent loading={loading} loadingText="Registrando...">
              Crear Cuenta
            </LoadingContent>
          </button>

          <button
            className={styles.linkButton}
            onClick={onBack}
            disabled={loading}
            type="button"
          >
            Ya tengo cuenta, volver al login
          </button>
        </form>
      </div>
    </div>
  );
}
