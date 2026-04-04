// src/components/Topbar.jsx
export default function Topbar({ onMenuToggle, user, onLogout }) {
  return (
    <div style={styles.topbar}>
      <button onClick={onMenuToggle} style={styles.menuBtn}>☰</button>

      <div style={styles.title}>B&B Distribuidora</div>

      <div style={styles.right}>
        <span>{user?.nombre || user?.username}</span>
        <button onClick={onLogout} style={styles.logout}>Salir</button>
      </div>
    </div>
  );
}

const styles = {
  topbar: {
    height: 60,
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 15px",
    borderBottom: "1px solid #ddd",
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  menuBtn: {
    fontSize: 20,
  },
  title: {
    fontWeight: "bold",
  },
  right: {
    display: "flex",
    gap: 10,
    alignItems: "center",
  },
  logout: {
    background: "red",
    color: "white",
  },
};