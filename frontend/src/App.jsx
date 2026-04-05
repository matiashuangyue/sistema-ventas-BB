import { useState } from "react";
import Login from "./pages/LoginTemp";
import Layout from "./components/Layout";
import { getToken } from "./services/auth";

import Ventas from "./pages/Ventas";
import Compras from "./pages/Compras";
import HistorialVentas from "./pages/HistorialVentas";
import Productos from "./pages/Productos";
import Clientes from "./pages/Clientes";
import Reportes from "./pages/Reportes";

function App() {
  const [isAuth, setIsAuth] = useState(!!getToken());
  const [activeSection, setActiveSection] = useState("ventas");

  const renderSection = () => {
    switch (activeSection) {
      case "ventas":
        return <Ventas />;
      case "compras":
        return <HistorialVentas />;
      case "productos":
        return <Productos />;
      case "clientes":
        return <Clientes />;
      case "reportes":
        return <Reportes />;
      default:
        return <Ventas />;
    }
  };

  return isAuth ? (
  <Layout
    onLogout={() => {
      setIsAuth(false);
      setActiveSection("ventas");
    }}
    activeSection={activeSection}
    onNavigate={setActiveSection}
  >
    {renderSection()}
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
