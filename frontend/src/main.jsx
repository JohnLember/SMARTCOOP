import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Toastify base first, so the app-shell overrides in index.css win on the cascade.
import "react-toastify/ReactToastify.css";
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from "react-router";
import { AuthProvider } from "./context/AuthContext";
import { ConfirmProvider } from "./components/ConfirmDialog";
import { ToastContainer, cssTransition } from "react-toastify";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";

// Enter from the right and settle; exit quicker back to the right, so the motion
// reads the same direction as swipe-to-dismiss. Curve + reduced-motion fallback
// live in index.css alongside the app's other motion tokens.
const toastMotion = cssTransition({
  enter: "toast-in",
  exit: "toast-out",
  collapseDuration: 240,
});

// Type is signalled by a lucide glyph in the app's own accent colors — the same
// vocabulary as the in-page alerts (check = done, triangle = caution).
const TOAST_ICONS = {
  success: [CheckCircle2, "#346538"],
  error: [XCircle, "#9F2F2D"],
  warning: [AlertTriangle, "#B9701F"],
  info: [Info, "#1F6C9F"],
};
const renderToastIcon = ({ type }) => {
  const cfg = TOAST_ICONS[type];
  if (!cfg) return null;
  const [Icon, color] = cfg;
  return <Icon size={18} strokeWidth={2.25} style={{ color }} />;
};

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <StrictMode>
      <AuthProvider>
        {/* One confirmation dialog for every destructive action in the app;
            reach it with useConfirm() from anywhere below here. */}
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
        <ToastContainer
          position="top-right"
          autoClose={3200}
          newestOnTop
          theme="light"
          transition={toastMotion}
          icon={renderToastIcon}
          draggable
          closeOnClick
          pauseOnHover
        />
      </AuthProvider>
    </StrictMode>
  </BrowserRouter>,
)
