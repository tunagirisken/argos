import { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { api } from "./services/api";
import { connectMarketStream } from "./services/ws";
import { useAuthStore } from "./store/authStore";
import { usePortfolioStore } from "./store/portfolioStore";
import { LandingPage } from "./features/auth/LandingPage";
import { RegisterPage } from "./features/auth/RegisterPage";
import { AiAnalysisPage } from "./features/ai/AiAnalysisPage";
import { AlarmsPage } from "./features/alarms/AlarmsPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { DiscoveryPage } from "./features/discovery/DiscoveryPage";
import { TradeEnginePage } from "./features/trade/TradeEnginePage";
import { DocsPage } from "./features/docs/DocsPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { SetupWizard } from "./features/setup/SetupWizard";
import { StockDetailPage } from "./features/stock/StockDetailPage";
import { AppLayout } from "./layout/AppLayout";

function AppRoutes() {
  const { user, ready, restore, clearSession } = useAuthStore();
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);
  const load = usePortfolioStore((s) => s.load);
  const applyMarketUpdate = usePortfolioStore((s) => s.applyMarketUpdate);
  const refreshMarket = usePortfolioStore((s) => s.refreshMarket);
  const setWsConnected = usePortfolioStore((s) => s.setWsConnected);

  useEffect(() => {
    restore();
  }, [restore]);

  const checkSetup = useCallback(async () => {
    if (!user) {
      setSetupComplete(null);
      return;
    }
    try {
      const st = await api.setupStatus();
      setSetupComplete(st.setup_complete);
      if (st.setup_complete) await load();
    } catch {
      clearSession();
      setSetupComplete(null);
    }
  }, [load, user]);

  useEffect(() => {
    if (user) checkSetup();
    else setSetupComplete(null);
  }, [user, checkSetup]);

  useEffect(() => {
    if (!setupComplete) return;
    const disconnect = connectMarketStream(
      (payload) => {
        applyMarketUpdate(payload.data, payload.trade_signals);
      },
      {
        onConnected: setWsConnected,
        onFallback: () => {
          refreshMarket();
        },
      }
    );
    const poll = window.setInterval(() => refreshMarket(), 60000);
    return () => {
      disconnect();
      window.clearInterval(poll);
    };
  }, [setupComplete, applyMarketUpdate, refreshMarket, setWsConnected]);

  if (!ready) {
    return (
      <div className="setup" style={{ justifyContent: "center" }}>
        <p className="muted">Yükleniyor…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LandingPage scrollToLogin />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  if (setupComplete === null) {
    return (
      <div className="setup" style={{ justifyContent: "center" }}>
        <p className="muted">Yükleniyor…</p>
      </div>
    );
  }

  if (!setupComplete) {
    return (
      <SetupWizard
        onComplete={() => {
          setSetupComplete(true);
          load();
        }}
      />
    );
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/stock/:symbol" element={<StockDetailPage />} />
        <Route path="/discovery" element={<DiscoveryPage />} />
        <Route path="/trade" element={<TradeEnginePage />} />
        <Route path="/ai" element={<AiAnalysisPage />} />
        <Route path="/alarms" element={<AlarmsPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route
          path="/settings"
          element={
            <SettingsPage
              onResetSetup={() => setSetupComplete(false)}
            />
          }
        />
      </Route>
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
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
