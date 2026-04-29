import styles from "./Sidebar.module.css";

export default function Sidebar({ open, onClose, onNavigate, active }) {
  if (!open) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onClose}></div>

      <aside className={styles.sidebar}>
        <div className={styles.header}>
          <h3 className={styles.title}>Menu</h3>
          <button
            aria-label="Cerrar menu"
            className={styles.close}
            onClick={onClose}
            type="button"
          >
            x
          </button>
        </div>

        {menuItems.map((item) => (
          <button
            key={item.key}
            className={`${styles.item} ${active === item.key ? styles.active : ""}`}
            onClick={() => {
              onNavigate(item.key);
              onClose();
            }}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </aside>
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
