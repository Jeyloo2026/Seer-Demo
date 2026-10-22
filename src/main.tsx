import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";

const Home = lazy(() => import("./pages/Home"));
const Explorer = lazy(() => import("./pages/Explorer"));
const MarketPage = lazy(() => import("./pages/MarketPage"));
const Deep = lazy(() => import("./pages/Deep"));
const Futarchy = lazy(() => import("./pages/Futarchy"));
const Opportunity = lazy(() => import("./pages/Opportunity"));
const Risk = lazy(() => import("./pages/Risk"));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Suspense fallback={<div className="min-h-screen bg-bg" />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/app" element={<Explorer />} />
          <Route path="/app/market/:chainId/:id" element={<MarketPage />} />
          <Route path="/deep" element={<Deep />} />
          <Route path="/deep/:chainId/:id" element={<Deep />} />
          <Route path="/futarchy" element={<Futarchy />} />
          <Route path="/futarchy/:slug" element={<Futarchy />} />
          <Route path="/opportunity" element={<Opportunity />} />
          <Route path="/opportunity/:slug" element={<Opportunity />} />
          <Route path="/risk" element={<Risk />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
);
