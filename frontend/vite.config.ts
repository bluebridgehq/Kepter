import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

// `pnpm dev:phone` serves over HTTPS on the local network, since phone browsers only allow the camera on HTTPS.
const phone = process.env.KEPTER_PHONE === "1";

export default defineConfig({
  plugins: [react(), tailwindcss(), ...(phone ? [basicSsl()] : [])],
  define: {
    global: "globalThis",
  },
  server: phone ? { host: true } : undefined,
});
