import { useRef, useState } from "react";
import { PhoneFrame } from "./ui/PhoneFrame";
import { ChatHeader } from "./ui/ChatHeader";
import { ChatThread } from "./ui/ChatThread";
import { ChatInput } from "./ui/ChatInput";
import { QuickReplies, type QuickReply } from "./ui/QuickReplies";
import { FaceScanner } from "./ui/FaceScanner";
import { Configurador, type OfertaElegida } from "./ui/Configurador";
import { ContratoFirma } from "./ui/ContratoFirma";
import { Declaraciones } from "./ui/Declaraciones";
import type { Mensaje } from "./chat/tipos";
import { horaWa } from "./lib/formato";
import { fmtQ0, fmtQ2 } from "../shared/formato";
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

// Widgets del crédito (overlays). El configurador lo abre la IA (uiAccion); el
// contrato y las declaraciones se ENCADENAN en el frontend, de forma determinista.
type Widget = "configurador" | "contrato" | "declaraciones";

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
  const [widget, setWidget] = useState<Widget | null>(null);
  // Datos que se van juntando durante la secuencia del crédito (config → firma).
  const wizard = useRef<{ oferta?: OfertaElegida; firma?: string }>({});

  function reiniciar() {
    contador = 0;
    setMensajes(saludoInicial());
    setEstado(semilla());
    setEscribiendo(false);
    setEscaneando(false);
    setWidget(null);
    wizard.current = {};
  }

  async function procesarTurno(nuevos: Mensaje[], estadoOverride?: Estado) {
    if (escribiendo || nuevos.length === 0) return;
    const estadoParaEnviar = estadoOverride ?? estado;
    if (estadoOverride) setEstado(estadoOverride);
    const conNuevos = [...mensajes, ...nuevos];
    setMensajes(conNuevos);
    setEscribiendo(true);

    try {
      const res = await enviarAChispa(aHistorial(conNuevos), estadoParaEnviar);
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
      // La IA solo abre la cámara y el configurador; el resto lo encadena el frontend.
      if (res.uiAccion === "escaneoRostro") setEscaneando(true);
      else if (res.uiAccion === "configurador") setWidget("configurador");
    } catch (err) {
      setMensajes((prev) => [
        ...prev,
        {
          id: nuevoId(),
          emisor: "chispa",
          texto:
            "Disculpa, tuve un problema para responder. Revisá que la API key esté configurada e intentá de nuevo.",
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

  function avisoVisible(texto: string) {
    // Aviso de sistema SOLO visible (sin textoIA => no se manda a la IA).
    setMensajes((prev) => [...prev, { id: nuevoId(), emisor: "sistema", texto, hora: horaWa() }]);
  }

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

  // ── Secuencia del crédito (determinista): configurador → contrato → declaraciones ──

  // 1) El usuario configuró el préstamo → encadena al contrato (sin pasar por la IA).
  function configuradorListo(o: OfertaElegida) {
    wizard.current.oferta = o;
    avisoVisible(`Préstamo configurado: ${fmtQ0(o.monto)} · ${o.pagos} pagos de ${fmtQ0(o.cuota)}.`);
    setWidget("contrato");
  }

  // 2) El usuario firmó → encadena a las declaraciones.
  function contratoListo(firma: string) {
    wizard.current.firma = firma;
    avisoVisible("Contrato firmado ✍️");
    setWidget("declaraciones");
  }

  // 3) El usuario aceptó las declaraciones → recién AHORA avisamos a la IA (un solo
  //    evento con todo), y la IA desembolsa. Antes de esto no hay forma de desembolsar.
  function declaracionesListo() {
    const o = wizard.current.oferta;
    const firma = wizard.current.firma;
    setWidget(null);
    if (!o) return;

    const nuevoEstado: Estado = {
      ...estado,
      sesion: {
        ...estado.sesion,
        ofertaCredito: o,
        firmaContrato: firma,
        declaraciones: { tyc: true, pep_us_cpe: true, ts: new Date().toISOString() },
      },
    };
    const ev =
      `[Evento del sistema: el usuario completó TODA su solicitud de préstamo — ` +
      `monto ${o.monto} (${fmtQ0(o.monto)}), frecuenciaId "${o.frecuenciaId}", pagos ${o.pagos}, ` +
      `cuota ${o.cuota} (${fmtQ0(o.cuota)}), total ${o.total} (${fmtQ2(o.total)}), ` +
      `intereses ${o.intereses} (${fmtQ2(o.intereses)}). Ya FIRMÓ el contrato y ACEPTÓ las ` +
      `declaraciones (T&C y que no es PEP, U.S. Person ni CPE). Ahora SÍ desembolsa: llama crearCredito ` +
      `con esos datos y luego muestra el comprobante con generarComprobante.]`;

    wizard.current = {};
    procesarTurno(
      [
        {
          id: nuevoId(),
          emisor: "sistema",
          texto: "Declaraciones aceptadas ✅ Solicitud completa.",
          textoIA: ev,
          hora: horaWa(),
        },
      ],
      nuevoEstado
    );
  }

  function widgetCancelado() {
    setWidget(null);
    wizard.current = {};
    procesarTurno([
      {
        id: nuevoId(),
        emisor: "sistema",
        texto: "Solicitud de préstamo cancelada.",
        textoIA: "[Evento del sistema: el usuario canceló la solicitud del préstamo antes de terminar.]",
        hora: horaWa(),
      },
    ]);
  }

  const overlay = escaneando ? (
    <FaceScanner onComplete={escaneoCompletado} onCancel={escaneoCancelado} />
  ) : widget === "configurador" ? (
    <Configurador estado={estado} onComplete={configuradorListo} onCancel={widgetCancelado} />
  ) : widget === "contrato" ? (
    <ContratoFirma estado={estado} onComplete={contratoListo} onCancel={widgetCancelado} />
  ) : widget === "declaraciones" ? (
    <Declaraciones estado={estado} onComplete={declaracionesListo} onCancel={widgetCancelado} />
  ) : null;

  return (
    <PhoneFrame overlay={overlay}>
      <ChatHeader onReiniciar={reiniciar} />
      <ChatThread mensajes={mensajes} escribiendo={escribiendo} />
      <div className="bg-wa-chat-bg">
        {!escribiendo && mensajes.length <= 1 && (
          <QuickReplies opciones={SUGERENCIAS} onElegir={(qr) => responder(qr.label)} />
        )}
        <ChatInput
          onEnviar={responder}
          deshabilitado={escribiendo || escaneando || widget !== null}
        />
      </div>
    </PhoneFrame>
  );
}
