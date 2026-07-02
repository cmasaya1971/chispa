import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Plugin de dev: monta /api/chat en el servidor de Vite reutilizando el MISMO
// core que usa la serverless function de Vercel. Asi `npm run dev` funciona solo,
// sin necesitar `vercel dev` ni la CLI de Vercel en local.
function apiDev() {
  return {
    name: "chispa-api-dev",
    configureServer(server: any) {
      server.middlewares.use("/api/chat", async (req: any, res: any) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method Not Allowed");
          return;
        }
        try {
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
          // Import dinamico para recoger cambios en caliente durante el dev.
          const { procesarChat } = await server.ssrLoadModule("/api/_lib/orquestador.ts");
          const resultado = await procesarChat(body);
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(resultado));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: err?.message ?? "Error interno" }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), apiDev()],
});
