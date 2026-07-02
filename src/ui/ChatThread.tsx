import { useEffect, useRef } from "react";
import type { Mensaje } from "../chat/tipos";
import { Bubble } from "./Bubble";
import { Card } from "./Card";
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
            <Bubble key={m.id} emisor={m.emisor} texto={m.texto} hora={m.hora}>
              {m.tarjeta && (
                <Card
                  titulo={m.tarjeta.titulo}
                  filas={m.tarjeta.filas}
                  opciones={m.tarjeta.opciones}
                  pie={m.tarjeta.pie}
                />
              )}
            </Bubble>
          )
        )}
        {escribiendo && <TypingIndicator />}
        <div ref={finRef} />
      </div>
    </div>
  );
}
