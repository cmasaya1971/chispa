import type { Estado } from "../../shared/estado";

export type MensajeChat = { role: "user" | "assistant"; content: string };

type Respuesta = {
  mensaje: string;
  estado: Estado;
  toolsUsadas?: string[];
  uiAccion?: string;
  error?: string;
};

// Llama al backend /api/chat con el historial + el estado del mock.
// Devuelve el texto de Chispa y el estado ya mutado por las tools.
export async function enviarAChispa(messages: MensajeChat[], estado: Estado): Promise<Respuesta> {
  const r = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, estado }),
  });
  if (!r.ok) {
    const detalle = await r.json().catch(() => ({}));
    throw new Error(detalle?.error ?? `Error ${r.status}`);
  }
  return r.json();
}
