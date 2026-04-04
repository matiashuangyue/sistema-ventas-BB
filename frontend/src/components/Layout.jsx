import { useState } from "react";
import Topbar from "./Topbar";
import Sidebar from "./Sidebar";
import { getUser, logout } from "../services/auth";

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
    <div>
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

      <div style={{ marginTop: 60, padding: 20 }}>
        {children}
      </div>
    </div>
  );
}