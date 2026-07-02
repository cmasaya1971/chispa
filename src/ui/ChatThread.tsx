import { useEffect, useRef } from "react";
import type { Mensaje } from "../chat/tipos";
import { Bubble } from "./Bubble";
import { Card } from "./Card";
import { AdjuntoView } from "./AdjuntoView";
import { SystemNotice } from "./SystemNotice";
import { TypingIndicator } from "./TypingIndicator";

type Props = {
  mensajes: Mensaje[];
  escribiendo?: boolean;
};

export function ChatThread({ mensajes, escribiendo }: Props) {
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, escribiendo]);

  return (
    <div className="wa-thread wa-chat-pattern flex-1 overflow-y-auto px-2 py-3">
      <div className="flex flex-col gap-2">
        {mensajes.map((m) =>
          m.emisor === "sistema" ? (
            <SystemNotice key={m.id} texto={m.texto} />
          ) : (
            <div key={m.id} className="flex flex-col gap-1">
              {/* La identidad (confirmación) va ANTES del mensaje; el resto después. */}
              {m.adjuntos
                ?.filter((a) => a.tipo === "identidad")
                .map((a, i) => (
                  <div key={`id-${i}`} className="flex justify-start px-1">
                    <div className="max-w-[88%]">
                      <AdjuntoView adjunto={a} />
                    </div>
                  </div>
                ))}
              {(m.texto || m.tarjeta) && (
                <Bubble emisor={m.emisor} texto={m.texto} hora={m.hora}>
                  {m.tarjeta && (
                    <Card
                      titulo={m.tarjeta.titulo}
                      filas={m.tarjeta.filas}
                      opciones={m.tarjeta.opciones}
                      pie={m.tarjeta.pie}
                    />
                  )}
                </Bubble>
              )}
              {m.adjuntos
                ?.filter((a) => a.tipo !== "identidad")
                .map((a, i) => (
                  <div key={`otro-${i}`} className="flex justify-start px-1">
                    <div className="max-w-[88%]">
                      <AdjuntoView adjunto={a} />
                    </div>
                  </div>
                ))}
            </div>
          )
        )}
        {escribiendo && <TypingIndicator />}
        <div ref={finRef} />
      </div>
    </div>
  );
}
