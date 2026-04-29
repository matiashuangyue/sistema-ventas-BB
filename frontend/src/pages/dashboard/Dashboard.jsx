import { logout, getUser } from "../../services/auth";
import styles from "./Dashboard.module.css";

export default function Dashboard({ onLogout }) {
  const user = getUser();

  const handleLogout = () => {
    logout();
    onLogout();
  };

  return (
    <div className={styles.page}>
      <section className={styles.panel}>
        <h2 className={styles.title}>
          Bienvenido {user?.nombre || user?.username}
        </h2>

        <button className={styles.button} onClick={handleLogout} type="button">
          Cerrar sesion
        </button>
      </section>

      <section className={styles.panel}>
        <h3 className={styles.title}>Menu</h3>
        <ul className={styles.list}>
          <li>Productos</li>
          <li>Ventas</li>
          <li>Cobranzas</li>
          <li>Compras</li>
        </ul>
      </section>
    </div>
  );
}
