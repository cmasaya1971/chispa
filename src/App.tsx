import { useState } from "react";
import { PhoneFrame } from "./ui/PhoneFrame";
import { ChatHeader } from "./ui/ChatHeader";
import { ChatThread } from "./ui/ChatThread";
import { ChatInput } from "./ui/ChatInput";
import { QuickReplies, type QuickReply } from "./ui/QuickReplies";
import type { Mensaje } from "./chat/tipos";
import { horaWa } from "./lib/formato";
import { enviarAChispa, type MensajeChat } from "./chat/api";
import { semilla, type Estado } from "../shared/estado";

let contador = 0;
const nuevoId = () => `m${contador++}`;

const TEXTO_SALUDO =
  "¡Hola, José! 👋 Soy **Chispa**, de Banco GyT Continental. ¿En qué te ayudo hoy?";

function saludoInicial(): Mensaje[] {
  return [{ id: nuevoId(), emisor: "chispa", texto: TEXTO_SALUDO, hora: horaWa() }];
}

const SUGERENCIAS: QuickReply[] = [
  { id: "saldo", label: "Ver mi saldo" },
  { id: "prestamo", label: "Necesito un préstamo" },
  { id: "pagar", label: "Pagar un servicio" },
];

// Convierte los mensajes visibles en el historial que consume el backend.
function aHistorial(mensajes: Mensaje[]): MensajeChat[] {
  return mensajes.map((m) => ({
    role: m.emisor === "chispa" ? "assistant" : "user",
    content: m.texto,
  }));
}

export default function App() {
  const [mensajes, setMensajes] = useState<Mensaje[]>(saludoInicial);
  const [estado, setEstado] = useState<Estado>(() => semilla());
  const [escribiendo, setEscribiendo] = useState(false);

  function reiniciar() {
    contador = 0;
    setMensajes(saludoInicial());
    setEstado(semilla());
    setEscribiendo(false);
  }

  async function responder(textoUsuario: string) {
    const t = textoUsuario.trim();
    if (!t || escribiendo) return;

    const mensajeUsuario: Mensaje = { id: nuevoId(), emisor: "usuario", texto: t, hora: horaWa() };
    const conUsuario = [...mensajes, mensajeUsuario];
    setMensajes(conUsuario);
    setEscribiendo(true);

    try {
      const res = await enviarAChispa(aHistorial(conUsuario), estado);
      setEstado(res.estado);
      setMensajes((prev) => [
        ...prev,
        { id: nuevoId(), emisor: "chispa", texto: res.mensaje || "…", hora: horaWa() },
      ]);
    } catch (err) {
      setMensajes((prev) => [
        ...prev,
        {
          id: nuevoId(),
          emisor: "chispa",
          texto:
            "Disculpá, tuve un problema para responder. Revisá que la API key esté configurada e intentá de nuevo.",
          hora: horaWa(),
        },
      ]);
      console.error(err);
    } finally {
      setEscribiendo(false);
    }
  }

  return (
    <PhoneFrame>
      <ChatHeader onReiniciar={reiniciar} />
      <ChatThread mensajes={mensajes} escribiendo={escribiendo} />
      <div className="bg-wa-chat-bg">
        {!escribiendo && mensajes.length <= 1 && (
          <QuickReplies opciones={SUGERENCIAS} onElegir={(qr) => responder(qr.label)} />
        )}
        <ChatInput onEnviar={responder} deshabilitado={escribiendo} />
      </div>
    </PhoneFrame>
  );
}
