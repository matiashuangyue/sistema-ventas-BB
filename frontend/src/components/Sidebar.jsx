// src/components/Sidebar.jsx
export default function Sidebar({ open, onClose, onNavigate, active }) {
  if (!open) return null;

  return (
    <>
      <div style={styles.overlay} onClick={onClose}></div>

      <div style={styles.sidebar}>
        <h3>Menú</h3>

        {menuItems.map((item) => (
          <div
            key={item.key}
            onClick={() => {
              onNavigate(item.key);
              onClose();
            }}
            style={{
              ...styles.item,
              background: active === item.key ? "#eee" : "transparent",
            }}
          >
            {item.label}
          </div>
        ))}
      </div>
    </>
  );
}

const menuItems = [
  { key: "ventas", label: "Ventas" },
  { key: "compras", label: "Historial de Ventas" },
  { key: "productos", label: "Productos" },
  { key: "clientes", label: "Clientes" },
  { key: "reportes", label: "Reportes" },
];

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.4)",
    zIndex: 999,
  },
  sidebar: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "70%",
    height: "100%",
    background: "#fff",
    zIndex: 1000,
    padding: 20,
  },
  item: {
    padding: 10,
    marginTop: 10,
    cursor: "pointer",
    borderRadius: 8,
  },
};