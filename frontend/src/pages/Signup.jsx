// Agregá este input en tu formulario de Signup
<div style={styles.inputGroup}>
  <label style={styles.label}>Correo Electrónico</label>
  <input
    type="email"
    style={styles.input}
    placeholder="ejemplo@correo.com"
    value={form.email}
    onChange={(e) => setForm({...form, email: e.target.value})}
    required
  />
</div>