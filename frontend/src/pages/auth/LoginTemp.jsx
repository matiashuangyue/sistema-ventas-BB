import { useState } from "react";
import { login } from "../../services/auth";
import { API_URL as API } from "../../config/api";
import LoadingContent from "../../components/LoadingContent";
import Signup from "./Signup";
import styles from "./Auth.module.css";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [esRegistro, setEsRegistro] = useState(false);

  if (esRegistro) {
    return <Signup onBack={() => setEsRegistro(false)} API={API} />;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) return setError("Completa todos los campos");

    try {
      setLoading(true);
      setError("");
      await login(username, password);
      onLogin();
    } catch {
      setError("Usuario o contrasena incorrectos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${styles.page} ${styles.pageStack}`}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h2 className={styles.title}>B&B Distribuidora</h2>
          <p className={styles.subtitle}>Ingresa al sistema de gestion</p>
        </div>

        <form className={styles.form} onSubmit={handleLogin}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Usuario</label>
            <input
              autoCapitalize="none"
              autoCorrect="off"
              autoFocus
              className={styles.input}
              placeholder="Ej: admin"
              spellCheck={false}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Contrasena</label>
            <input
              autoCapitalize="none"
              autoCorrect="off"
              className={styles.input}
              placeholder="********"
              spellCheck={false}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <div className={styles.errorBox}>{error}</div>}

          <button
            className={`${styles.primaryButton} ${loading ? styles.loading : ""}`}
            disabled={loading}
            type="submit"
          >
            <LoadingContent loading={loading} loadingText="Verificando...">
              Ingresar
            </LoadingContent>
          </button>

          <button
            className={styles.linkButton}
            onClick={() => setEsRegistro(true)}
            disabled={loading}
            type="button"
          >
            No tenes cuenta? Registrate aqui
          </button>
        </form>
      </div>

      <p className={styles.footerText}>2026 Sistema de Gestion Interno</p>
    </div>
  );
}
