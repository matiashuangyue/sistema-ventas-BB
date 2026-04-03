import { useState } from "react";
import Login from "./pages/LoginTemp";
import Dashboard from "./pages/Dashboard";
import { getToken } from "./services/auth";

function App() {
  const [isAuth, setIsAuth] = useState(!!getToken());

  return isAuth ? (
    <Dashboard onLogout={() => setIsAuth(false)} />
  ) : (
    <Login onLogin={() => setIsAuth(true)} />
  );
}

export default App;