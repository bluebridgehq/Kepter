import { lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { Layout } from "./components/Layout.tsx";
import { ToastProvider } from "./lib/ToastProvider.tsx";
import { TxProvider } from "./lib/TxProvider.tsx";
import { WalletProvider } from "./lib/WalletProvider.tsx";

const Home = lazy(() => import("./pages/Home.tsx").then((m) => ({ default: m.Home })));
const OpenShop = lazy(() => import("./pages/OpenShop.tsx").then((m) => ({ default: m.OpenShop })));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx").then((m) => ({ default: m.Dashboard })));
const Scan = lazy(() => import("./pages/Scan.tsx").then((m) => ({ default: m.Scan })));
const Poster = lazy(() => import("./pages/Poster.tsx").then((m) => ({ default: m.Poster })));
const Buy = lazy(() => import("./pages/Buy.tsx").then((m) => ({ default: m.Buy })));
const ChipIn = lazy(() => import("./pages/ChipIn.tsx").then((m) => ({ default: m.ChipIn })));
const GiftCardPage = lazy(() => import("./pages/GiftCardPage.tsx").then((m) => ({ default: m.GiftCardPage })));
const NotFound = lazy(() => import("./pages/NotFound.tsx").then((m) => ({ default: m.NotFound })));

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <WalletProvider>
          <TxProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="open" element={<OpenShop />} />
                <Route path="shop" element={<Dashboard />} />
                <Route path="shop/scan" element={<Scan />} />
                <Route path="shop/poster" element={<Poster />} />
                <Route path="s/:shop" element={<Buy />} />
                <Route path="g/:cardId" element={<ChipIn />} />
                <Route path="c/:cardId" element={<GiftCardPage />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </TxProvider>
        </WalletProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
