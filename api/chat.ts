// Serverless function de Vercel: POST /api/chat.
// La API key vive solo aquí (server-side). Importa el orquestador de forma
// dinámica dentro del try para capturar también errores de carga de módulo y
// devolver el detalle en JSON (evita el opaco FUNCTION_INVOCATION_FAILED).
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }
  try {
    const { procesarChat } = await import("./_lib/orquestador.js");
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
    const salida = await procesarChat(body);
    res.status(200).json(salida);
  } catch (err: any) {
    res.status(500).json({
      error: err?.message ?? "Error interno",
      nombre: err?.name,
      stack: String(err?.stack ?? "").split("\n").slice(0, 5),
    });
  }
}
