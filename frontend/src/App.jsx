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

  const ActiveSection = sections[activeSection] || Ventas;

  return isAuth ? (
  <Layout
    onLogout={() => {
      setIsAuth(false);
      setActiveSection("ventas");
    }}
    activeSection={activeSection}
    onNavigate={setActiveSection}
  >
    <ActiveSection />
  </Layout>
) : (
  <Login
    onLogin={() => {
      setIsAuth(true);
      setActiveSection("ventas");
    }}
  />
);
}

export default App;
