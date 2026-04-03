import { logout, getUser } from "../services/auth";

export default function Dashboard({ onLogout }) {
  const user = getUser();

  const handleLogout = () => {
    logout();
    onLogout();
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Bienvenido {user?.nombre || user?.username}</h2>

      <button onClick={handleLogout}>Cerrar sesión</button>

      <hr />

      <h3>Menú</h3>
      <ul>
        <li>Productos</li>
        <li>Ventas</li>
        <li>Compras</li>
      </ul>
    </div>
  );
}