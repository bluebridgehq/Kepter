import "./polyfills.ts";
import "./index.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App.tsx";

const dark = window.matchMedia("(prefers-color-scheme: dark)");
const applyTheme = () => {
  const theme = dark.matches ? "dark" : "light";
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark.matches ? "#0D1412" : "#FBF7F1");
};
applyTheme();
dark.addEventListener("change", applyTheme);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
