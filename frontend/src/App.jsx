import { useState } from "react";
import Layout from "./components/Layout";
import { getToken } from "./services/auth";
import {
  Clientes,
  Cobranzas,
  HistorialVentas,
  Login,
  Productos,
  Reportes,
  Ventas,
} from "./pages";

const sections = {
  ventas: Ventas,
  compras: HistorialVentas,
  cobranzas: Cobranzas,
  productos: Productos,
  clientes: Clientes,
  reportes: Reportes,
};

function App() {
  const [isAuth, setIsAuth] = useState(!!getToken());
  const [activeSection, setActiveSection] = useState("ventas");
  const [clienteCuentaId, setClienteCuentaId] = useState(null);

  function navegar(section) {
    setClienteCuentaId(null);
    setActiveSection(section);
  }

  function abrirCuentaCorriente(clienteId) {
    setClienteCuentaId(clienteId);
    setActiveSection("cobranzas");
  }

  const ActiveSection = sections[activeSection] || Ventas;

  return isAuth ? (
  <Layout
    onLogout={() => {
      setIsAuth(false);
      navegar("ventas");
    }}
    activeSection={activeSection}
    onNavigate={navegar}
  >
    <ActiveSection
      key={`${activeSection}:${clienteCuentaId ?? ""}`}
      onAbrirCuentaCorriente={abrirCuentaCorriente}
      clienteInicialId={clienteCuentaId}
      onVolverVenta={clienteCuentaId != null ? () => navegar("ventas") : undefined}
    />
  </Layout>
) : (
  <Login
    onLogin={() => {
      setIsAuth(true);
      navegar("ventas");
    }}
  />
);
}

export default App;
