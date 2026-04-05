import { useState } from "react";
import { login } from "../services/auth";
import Signup from "./Signup"; // 👈 Usamos el archivo separado

import { API_URL as API } from "../config/api";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [esRegistro, setEsRegistro] = useState(false);

  // Lógica de navegación
  if (esRegistro) {
    // Le pasamos la prop API para que el Signup sepa a dónde pegar
    return <Signup onBack={() => setEsRegistro(false)} API={API} />;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) return setError("Completá todos los campos");

    try {
      setLoading(true);
      setError("");
      await login(username, password);
      onLogin();
    } catch (err) {
      setError("Usuario o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.fullPage}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.title}>B&B Distribuidora</h2>
          <p style={styles.subtitle}>Ingresá al sistema de gestión</p>
        </div>

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Usuario</label>
            <input
              style={styles.input}
              placeholder="Ej: admin"
              value={username}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Contraseña</label>
            <input
              type="password"
              style={styles.input}
              placeholder="••••••••"
              value={password}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}

          <button 
            type="submit" 
            style={{
              ...styles.btnPrincipal,
              backgroundColor: loading ? "#93c5fd" : "#2563eb",
              cursor: loading ? "not-allowed" : "pointer"
            }}
            disabled={loading}
          >
            {loading ? "Verificando..." : "Ingresar"}
          </button>

          <button type="button" onClick={() => setEsRegistro(true)} style={styles.btnLink}>
            ¿No tenés cuenta? Registrate aquí
          </button>
        </form>
      </div>
      <p style={styles.footerText}>© 2026 Sistema de Gestión Interno</p>
    </div>
  );
}

const styles = {
  fullPage: {
    display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
    minHeight: "100vh", background: "#f3f4f6", padding: "20px",
  },
  card: {
    background: "#fff", width: "100%", maxWidth: "400px", borderRadius: "16px",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)", padding: "32px", boxSizing: "border-box",
  },
  header: { textAlign: "center", marginBottom: "24px" },
  title: { margin: 0, color: "#2563eb", fontSize: "24px", fontWeight: "800" },
  subtitle: { margin: "8px 0 0 0", color: "#6b7280", fontSize: "14px" },
  form: { display: "flex", flexDirection: "column", gap: "16px" },
  inputGroup: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "13px", fontWeight: "600", color: "#374151" },
  input: {
    padding: "12px", borderRadius: "10px", border: "1px solid #d1d5db",
    fontSize: "16px", outline: "none", width: "100%", boxSizing: "border-box"
  },
  btnPrincipal: {
    marginTop: "8px", padding: "14px", borderRadius: "10px", border: "none",
    color: "#fff", fontSize: "16px", fontWeight: "700", transition: "all 0.2s",
  },
  btnLink: {
    background: "none", border: "none", color: "#2563eb", textDecoration: "underline",
    cursor: "pointer", fontSize: "14px", marginTop: "8px", fontWeight: "600"
  },
  errorBox: {
    background: "#fee2e2", color: "#b91c1c", padding: "10px", borderRadius: "8px",
    fontSize: "13px", textAlign: "center", fontWeight: "500",
  },
  footerText: { marginTop: "20px", fontSize: "12px", color: "#9ca3af" }
};
