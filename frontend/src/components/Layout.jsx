import { useState } from "react";
import Topbar from "./Topbar";
import Sidebar from "./Sidebar";
import { getUser, logout } from "../services/auth";
import styles from "./Layout.module.css";

export default function Layout({
  children,
  onLogout,
  activeSection,
  onNavigate,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const user = getUser();

  const handleLogout = () => {
    logout();
    onLogout();
  };

  return (
    <div className={styles.shell}>
      <Topbar
        onMenuToggle={() => setMenuOpen(true)}
        user={user}
        onLogout={handleLogout}
      />

      <Sidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        active={activeSection}
        onNavigate={onNavigate}
      />

      <main className={styles.content}>{children}</main>
    </div>
  );
}
