import { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { api } from "./services/api";
import { connectPrices } from "./services/ws";
import { usePortfolioStore } from "./store/portfolioStore";
import { AiAnalysisPage } from "./features/ai/AiAnalysisPage";
import { AlarmsPage } from "./features/alarms/AlarmsPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { SetupWizard } from "./features/setup/SetupWizard";
import { StockDetailPage } from "./features/stock/StockDetailPage";
import { AppLayout } from "./layout/AppLayout";

function AppRoutes() {
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);
  const load = usePortfolioStore((s) => s.load);
  const applyWsPrices = usePortfolioStore((s) => s.applyWsPrices);
  const setWsConnected = usePortfolioStore((s) => s.setWsConnected);

  const checkSetup = useCallback(async () => {
    try {
      const st = await api.setupStatus();
      setSetupComplete(st.setup_complete);
      if (st.setup_complete) await load();
    } catch {
      setSetupComplete(true);
      await load();
    }
  }, [load]);

  useEffect(() => {
    checkSetup();
  }, [checkSetup]);

  useEffect(() => {
    if (!setupComplete) return;
    const disconnect = connectPrices((data) => {
      setWsConnected(true);
      applyWsPrices(data);
    });
    return disconnect;
  }, [setupComplete, applyWsPrices, setWsConnected]);

  if (setupComplete === null) {
    return (
      <div className="setup" style={{ justifyContent: "center" }}>
        <p className="muted">Yükleniyor…</p>
      </div>
    );
  }

  if (!setupComplete) {
    return <SetupWizard onComplete={() => { setSetupComplete(true); load(); }} />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/stock/:symbol" element={<StockDetailPage />} />
        <Route path="/ai" element={<AiAnalysisPage />} />
        <Route path="/alarms" element={<AlarmsPage />} />
        <Route
          path="/settings"
          element={<SettingsPage onResetSetup={() => setSetupComplete(false)} />}
        />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
