import { useState } from "react";

type Props = {
  onEnviar: (texto: string) => void;
  deshabilitado?: boolean;
};

export function ChatInput({ onEnviar, deshabilitado }: Props) {
  const [texto, setTexto] = useState("");

  function enviar() {
    const t = texto.trim();
    if (!t || deshabilitado) return;
    onEnviar(t);
    setTexto("");
  }

  return (
    <div className="flex items-end gap-1.5 bg-transparent px-2 py-2">
      <div className="flex flex-1 items-center rounded-full bg-white px-3 py-2 shadow-sm">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && enviar()}
          placeholder="Escribí un mensaje"
          disabled={deshabilitado}
          className="w-full bg-transparent text-[14.5px] text-wa-text outline-none placeholder:text-wa-text-2 disabled:opacity-60"
        />
      </div>
      <button
        onClick={enviar}
        disabled={deshabilitado}
        aria-label="Enviar"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-wa-teal text-white shadow-md transition active:scale-95 disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" className="fill-white">
          <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>
    </div>
  );
}
