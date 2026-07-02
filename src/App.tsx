import { useState } from "react";
import { PhoneFrame } from "./ui/PhoneFrame";
import { ChatHeader } from "./ui/ChatHeader";
import { ChatThread } from "./ui/ChatThread";
import { ChatInput } from "./ui/ChatInput";
import { QuickReplies, type QuickReply } from "./ui/QuickReplies";
import type { Mensaje } from "./chat/tipos";
import { horaWa } from "./lib/formato";

let contador = 0;
const nuevoId = () => `m${contador++}`;

// Saludo inicial de Chispa (placeholder de Nivel 2 · paso 2: aún sin OpenAI).
function saludoInicial(): Mensaje[] {
  return [
    {
      id: nuevoId(),
      emisor: "chispa",
      texto: "¡Hola, José! 👋 Soy **Chispa**, de Banco GyT Continental. ¿En qué te ayudo hoy?",
      hora: horaWa(),
    },
  ];
}

const SUGERENCIAS: QuickReply[] = [
  { id: "saldo", label: "Ver mi saldo" },
  { id: "prestamo", label: "Necesito un préstamo" },
  { id: "pagar", label: "Pagar un servicio" },
];

export default function App() {
  const [mensajes, setMensajes] = useState<Mensaje[]>(saludoInicial);
  const [escribiendo, setEscribiendo] = useState(false);

  function reiniciar() {
    contador = 0;
    setMensajes(saludoInicial());
    setEscribiendo(false);
  }

  // Placeholder: hace eco con la voz de Chispa. En el paso 3 se reemplaza por
  // la llamada real a /api/chat (OpenAI + tools).
  function responder(textoUsuario: string) {
    setMensajes((prev) => [
      ...prev,
      { id: nuevoId(), emisor: "usuario", texto: textoUsuario, hora: horaWa() },
    ]);
    setEscribiendo(true);
    const espera = Math.min(1200, 600 + textoUsuario.length * 12);
    window.setTimeout(() => {
      setEscribiendo(false);
      setMensajes((prev) => [
        ...prev,
        {
          id: nuevoId(),
          emisor: "chispa",
          texto:
            "¡Con gusto! Todavía estoy conectando mi cerebro (OpenAI) — en el siguiente paso te respondo de verdad. Mientras, la interfaz ya se ve como WhatsApp. 😉",
          hora: horaWa(),
        },
      ]);
    }, espera);
  }

  return (
    <PhoneFrame>
      <ChatHeader onReiniciar={reiniciar} />
      <ChatThread mensajes={mensajes} escribiendo={escribiendo} />
      <div className="bg-wa-chat-bg">
        {!escribiendo && (
          <QuickReplies
            opciones={SUGERENCIAS}
            onElegir={(qr) => responder(qr.label)}
            deshabilitado={escribiendo}
          />
        )}
        <ChatInput onEnviar={responder} deshabilitado={escribiendo} />
      </div>
    </PhoneFrame>
  );
}
