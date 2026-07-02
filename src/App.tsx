import { useState } from "react";
import { PhoneFrame } from "./ui/PhoneFrame";
import { ChatHeader } from "./ui/ChatHeader";
import { ChatThread } from "./ui/ChatThread";
import { ChatInput } from "./ui/ChatInput";
import { QuickReplies, type QuickReply } from "./ui/QuickReplies";
import { FaceScanner } from "./ui/FaceScanner";
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
// Los avisos de "sistema" se envían como turno del usuario usando su `textoIA`
// (señal interna); si no tienen señal, se omiten del historial.
function aHistorial(mensajes: Mensaje[]): MensajeChat[] {
  const out: MensajeChat[] = [];
  for (const m of mensajes) {
    if (m.emisor === "chispa") {
      out.push({ role: "assistant", content: m.texto });
    } else if (m.emisor === "usuario") {
      out.push({ role: "user", content: m.texto });
    } else if (m.textoIA) {
      out.push({ role: "user", content: m.textoIA });
    }
  }
  return out;
}

export default function App() {
  const [mensajes, setMensajes] = useState<Mensaje[]>(saludoInicial);
  const [estado, setEstado] = useState<Estado>(() => semilla());
  const [escribiendo, setEscribiendo] = useState(false);
  const [escaneando, setEscaneando] = useState(false);

  function reiniciar() {
    contador = 0;
    setMensajes(saludoInicial());
    setEstado(semilla());
    setEscribiendo(false);
    setEscaneando(false);
  }

  // Núcleo de un turno: agrega uno o más mensajes visibles, manda el historial
  // a Chispa y añade su respuesta.
  async function procesarTurno(nuevos: Mensaje[]) {
    if (escribiendo || nuevos.length === 0) return;
    const conNuevos = [...mensajes, ...nuevos];
    setMensajes(conNuevos);
    setEscribiendo(true);

    try {
      const res = await enviarAChispa(aHistorial(conNuevos), estado);
      setEstado(res.estado);
      setMensajes((prev) => [
        ...prev,
        {
          id: nuevoId(),
          emisor: "chispa",
          texto: res.mensaje || "",
          hora: horaWa(),
          adjuntos: res.adjuntos,
        },
      ]);
      // Señal de UI: abrir la cámara para el reconocimiento facial.
      if (res.uiAccion === "escaneoRostro") setEscaneando(true);
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

  function responder(textoUsuario: string) {
    const t = textoUsuario.trim();
    if (!t) return;
    procesarTurno([{ id: nuevoId(), emisor: "usuario", texto: t, hora: horaWa() }]);
  }

  // El usuario completó el escaneo facial. Mostramos un aviso de SISTEMA (no una
  // burbuja del usuario) y le pasamos a la IA una señal interna para finalizar.
  function escaneoCompletado() {
    setEscaneando(false);
    procesarTurno([
      {
        id: nuevoId(),
        emisor: "sistema",
        texto:
          "Validación biométrica completada con éxito. Tu identidad fue contrastada con la base de datos del **RENAP**.",
        textoIA:
          "[Evento del sistema: la validación biométrica facial se completó con éxito y la identidad del usuario fue contrastada satisfactoriamente contra la base de datos del RENAP.]",
        hora: horaWa(),
      },
    ]);
  }

  function escaneoCancelado() {
    setEscaneando(false);
    procesarTurno([
      {
        id: nuevoId(),
        emisor: "sistema",
        texto: "Validación biométrica cancelada.",
        textoIA: "[Evento del sistema: el usuario canceló la validación biométrica.]",
        hora: horaWa(),
      },
    ]);
  }

  return (
    <PhoneFrame
      overlay={
        escaneando ? <FaceScanner onComplete={escaneoCompletado} onCancel={escaneoCancelado} /> : null
      }
    >
      <ChatHeader onReiniciar={reiniciar} />
      <ChatThread mensajes={mensajes} escribiendo={escribiendo} />
      <div className="bg-wa-chat-bg">
        {!escribiendo && mensajes.length <= 1 && (
          <QuickReplies opciones={SUGERENCIAS} onElegir={(qr) => responder(qr.label)} />
        )}
        <ChatInput onEnviar={responder} deshabilitado={escribiendo || escaneando} />
      </div>
    </PhoneFrame>
  );
}
