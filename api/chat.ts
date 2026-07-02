// Serverless function de Vercel: POST /api/chat.
// Wrapper delgado sobre el orquestador. La API key vive solo aquí (server-side).
import { procesarChat } from "./_lib/orquestador";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const salida = await procesarChat(body);
    res.status(200).json(salida);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Error interno" });
  }
}
