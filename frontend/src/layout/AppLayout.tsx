import { Outlet, useLocation } from "react-router-dom";
import { Header } from "../components/layout/Header";
import { Sidebar } from "../components/layout/Sidebar";
import { TweaksPanel } from "../components/tweaks/TweaksPanel";

export function AppLayout() {
  const location = useLocation();
  const pageKey = location.pathname.split("/")[1] || "dashboard";

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Header />
        <Outlet key={pageKey} />
      </div>
      <TweaksPanel />
    </div>
  );
}
