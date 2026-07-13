import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import "react-toastify/ReactToastify.css";
import App from './App.jsx'
import { BrowserRouter } from "react-router";
import { AuthProvider } from "./context/AuthContext";
import { ToastContainer } from "react-toastify";

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <StrictMode>
      <AuthProvider>
        <App />
        <ToastContainer position="top-right" autoClose={3000} newestOnTop theme="light" />
      </AuthProvider>
    </StrictMode>
  </BrowserRouter>,
)
