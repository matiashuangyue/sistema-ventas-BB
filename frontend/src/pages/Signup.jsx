import { useState } from "react";

// 1. Mantené este export
export default function Signup({ onBack, API }) {
  const [form, setForm] = useState({
    nombre: "",
    username: "",
    email: "",
    password: "",
    rol: "admin",
    codigoInvitacion: "" 
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

      alert("Usuario creado con éxito. Ahora podés iniciar sesión.");
      onBack(); 
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.fullPage}>
      <div style={styles.card}>
        <h2 style={styles.title}>Nuevo Usuario</h2>
        <p style={styles.subtitle}>Crear cuenta para gestión de B&B</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            placeholder="Nombre completo"
            required
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
          <input
            style={styles.input}
            placeholder="Nombre de usuario"
            required
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
          <input
            type="email"
            style={styles.input}
            placeholder="Correo electrónico"
            required
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            inputMode="email"
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            type="password"
            style={styles.input}
            placeholder="Contraseña"
            required
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />

          <div style={styles.divider}></div>
          
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#2563eb', marginBottom: '-8px' }}>
            CÓDIGO DE INVITACIÓN
          </label>
          <input
            type="password"
            style={styles.inputSecret}
            placeholder="Clave de acceso"
            required
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => setForm({ ...form, codigoInvitacion: e.target.value })}
          />

          {error && <div style={styles.errorBox}>{error}</div>}

          <button type="submit" style={styles.btnPrincipal} disabled={loading}>
            {loading ? "Registrando..." : "Crear Cuenta"}
          </button>

          <button type="button" onClick={onBack} style={styles.btnLink}>
            Ya tengo cuenta, volver al Login
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  fullPage: {
    display: "flex", justifyContent: "center", alignItems: "center",
    minHeight: "100vh", background: "#f3f4f6", padding: "20px",
  },
  card: {
    background: "#fff", width: "100%", maxWidth: "400px", borderRadius: "16px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)", padding: "32px",
  },
  title: { margin: 0, color: "#2563eb", textAlign: "center" },
  subtitle: { textAlign: "center", color: "#6b7280", marginBottom: "20px" },
  form: { display: "flex", flexDirection: "column", gap: "12px" },
  input: {
    padding: "12px", borderRadius: "10px", border: "1px solid #d1d5db", fontSize: "16px",
  },
  divider: {
    height: "2px",
    background: "#e5e7eb",
    margin: "15px 0",
    width: "100%",
  },
  inputSecret: {
    padding: "12px",
    borderRadius: "10px",
    border: "2px solid #2563eb", 
    fontSize: "16px",
    background: "#eff6ff", 
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
  },
  btnPrincipal: {
    padding: "14px", borderRadius: "10px", border: "none",
    background: "#2563eb", color: "#fff", fontWeight: "bold", cursor: "pointer",
  },
  btnLink: {
    background: "none", border: "none", color: "#4b5563",
    textDecoration: "underline", cursor: "pointer", marginTop: "10px",
  },
  errorBox: {
    background: "#fee2e2", color: "#b91c1c", padding: "10px",
    borderRadius: "8px", fontSize: "13px", textAlign: "center",
  }
};

// 2. ❌ BORRÁ LA LÍNEA DE ACÁ ABAJO QUE DICE "export default Signup;"
