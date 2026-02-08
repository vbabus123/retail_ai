import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import SellerAnalysis from "./pages/SellerAnalysis.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/seller-analysis" element={<SellerAnalysis />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);