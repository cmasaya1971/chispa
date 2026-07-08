import { useState } from "react";
import type { Estado } from "../../shared/estado";

type Props = {
  estado: Estado;
  onComplete: () => void;
  onCancel: () => void;
};

// Declaraciones obligatorias (T&C + PEP/US/CPE) que exige la ley (IVE), con info
// expandible. El botón se habilita al marcar todas.
export function Declaraciones({ estado, onComplete, onCancel }: Props) {
  const decl = estado.credito.declaracionesRequeridas ?? [];
  const info = estado.credito.infoDeclaraciones;
  const [marcadas, setMarcadas] = useState<Record<string, boolean>>({});
  const [abierto, setAbierto] = useState<"pep" | "us" | "cpe" | null>(null);

  const todas = decl.length > 0 && decl.every((d) => marcadas[d.id]);

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-wa-chat-bg text-wa-text">
      <div className="flex items-center gap-3 bg-wa-header px-4 py-3 text-white">
        <button onClick={onCancel} className="text-lg text-white/80">✕</button>
        <div className="font-semibold">Declaraciones</div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="mb-3 text-[13.5px] text-wa-text-2">
          Necesitamos estas confirmaciones que exige la ley:
        </div>

        {decl.map((d) => (
          <button
            key={d.id}
            onClick={() => setMarcadas((m) => ({ ...m, [d.id]: !m[d.id] }))}
            className="mb-2 flex w-full items-start gap-3 rounded-lg bg-white p-3 text-left text-[13.5px]"
          >
            <span
              className={
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 " +
                (marcadas[d.id]
                  ? "border-wa-brand bg-wa-brand font-black text-[#063d1e]"
                  : "border-gray-300")
              }
            >
              {marcadas[d.id] ? "✓" : ""}
            </span>
            <span>{d.texto}</span>
          </button>
        ))}

        {info && (
          <div className="mt-2 flex flex-wrap gap-3 text-[12px] text-wa-teal">
            <button className="underline" onClick={() => setAbierto(abierto === "pep" ? null : "pep")}>
              ¿Qué es PEP?
            </button>
            <button className="underline" onClick={() => setAbierto(abierto === "us" ? null : "us")}>
              ¿U.S. Person?
            </button>
            <button className="underline" onClick={() => setAbierto(abierto === "cpe" ? null : "cpe")}>
              ¿CPE?
            </button>
          </div>
        )}

        {info && abierto && (
          <div className="mt-3 rounded-lg bg-[#eef6f2] p-3 text-[12px] text-[#33413c]">
            {abierto === "pep" ? info.pep : abierto === "us" ? info.us_person : info.cpe}
          </div>
        )}
      </div>

      <div className="p-4">
        <button
          disabled={!todas}
          onClick={onComplete}
          className="w-full rounded-xl bg-wa-teal py-3 font-bold text-white disabled:bg-[#a9c7bd]"
        >
          Acepto y declaro
        </button>
      </div>
    </div>
  );
}
