import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ThemeProvider } from "./theme/ThemeContext";
import "./tokens.css";
import "./index.css";
import "./global.css";
import "./styles/design-tv.css";
import "./styles/landing.css";
import "./styles/docs.css";
import "./styles/tweaks.css";
import "./styles/responsive.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
);
