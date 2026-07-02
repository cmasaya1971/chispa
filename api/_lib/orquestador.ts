// Orquestador LLM: corre el loop de tool-calling contra OpenAI.
// Vive en el servidor (la API key nunca llega al navegador).
import "dotenv/config";
import OpenAI from "openai";
import type { Estado } from "../../shared/estado";
import { systemPrompt } from "./systemPrompt.js";
import { toolSchemas, ejecutarTool } from "./tools.js";
import { construirAdjuntos } from "./adjuntos.js";
import type { Adjunto } from "../../shared/adjuntos";

export type MensajeChat = { role: "user" | "assistant"; content: string };

export type EntradaChat = {
  messages: MensajeChat[];
  estado: Estado;
};

export type SalidaChat = {
  mensaje: string;
  estado: Estado;
  toolsUsadas: string[];
  uiAccion?: string; // señal de UI para el cliente, ej. "escaneoRostro"
  adjuntos?: Adjunto[]; // tarjetas estructuradas a renderizar con el mensaje
};

const MAX_ITERACIONES = 6;

export async function procesarChat(entrada: EntradaChat): Promise<SalidaChat> {
  const { messages, estado } = entrada;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      mensaje:
        "⚠️ Falta configurar la API key de OpenAI. Creá un archivo `.env` con `OPENAI_API_KEY=...` y reiniciá el servidor.",
      estado,
      toolsUsadas: [],
    };
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-4o";
  const toolsUsadas: string[] = [];
  let uiAccion: string | undefined;

  const convo: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt(estado) },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  for (let i = 0; i < MAX_ITERACIONES; i++) {
    const resp = await client.chat.completions.create({
      model,
      messages: convo,
      tools: toolSchemas,
      tool_choice: "auto",
      temperature: 0.7,
    });

    const msg = resp.choices[0].message;
    convo.push(msg);

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      for (const tc of msg.tool_calls) {
        if (tc.type !== "function") continue;
        let args: Record<string, unknown> = {};
        try {
          args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
        } catch {
          args = {};
        }
        toolsUsadas.push(tc.function.name);
        const resultado = ejecutarTool(tc.function.name, args, estado);
        if (resultado && typeof resultado === "object" && "uiAccion" in resultado) {
          uiAccion = (resultado as { uiAccion?: string }).uiAccion;
        }
        convo.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(resultado),
        });
      }
      continue; // volver a llamar al modelo con los resultados
    }

    // Respuesta final de texto
    return {
      mensaje: msg.content ?? "",
      estado,
      toolsUsadas,
      uiAccion,
      adjuntos: construirAdjuntos(toolsUsadas, estado),
    };
  }

  return {
    mensaje: "Disculpá, ${nombre} — se me complicó procesar eso. ¿Lo intentamos de nuevo?".replace(
      "${nombre}",
      estado.usuario.nombreCorto
    ),
    estado,
    toolsUsadas,
  };
}
