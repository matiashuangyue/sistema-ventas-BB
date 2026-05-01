import styles from "./Topbar.module.css";

export default function Topbar({ onMenuToggle, user, onLogout }) {
  return (
    <header className={styles.topbar}>
      <div className={styles.inner}>
        <button
          aria-label="Abrir menu"
          className={styles.menuBtn}
          onClick={onMenuToggle}
          type="button"
        >
          ☰
        </button>

        <div className={styles.title}>B&B Distribuidora</div>

        <div className={styles.right}>
          <span className={styles.user}>{user?.nombre || user?.username}</span>
          <button className={styles.logout} onClick={onLogout} type="button">
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
