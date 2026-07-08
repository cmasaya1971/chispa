import { useMemo, useState } from "react";
import type { Estado } from "../../shared/estado";
import { resumenOferta } from "../../shared/credito";
import { fmtQ0 } from "../../shared/formato";

export type OfertaElegida = {
  monto: number;
  frecuenciaId: string;
  pagos: number;
  cuota: number;
  total: number;
  intereses: number;
  unidad: string;
};

type Props = {
  estado: Estado;
  onComplete: (o: OfertaElegida) => void;
  onCancel: () => void;
};

// Configurador del préstamo (estilo ZIGI): slider de monto + frecuencia + N.º de
// pagos, con resumen en vivo (cuota / total / intereses). Lee todo del mock.
export function Configurador({ estado, onComplete, onCancel }: Props) {
  const c = estado.credito;
  const frecuencias = c.frecuencias ?? [];
  const min = c.montoMin ?? 100;
  const max = c.montoMax ?? c.lineaAprobada;

  const [monto, setMonto] = useState(c.montoDefault ?? 2000);
  const [frecId, setFrecId] = useState(c.frecuenciaDefault ?? "mensual");
  const frec = frecuencias.find((f) => f.id === frecId) ?? frecuencias[0];
  const [pagos, setPagos] = useState(frec?.pagosDefault ?? 6);

  const r = useMemo(
    () => resumenOferta(estado, monto, frecId, pagos),
    [estado, monto, frecId, pagos]
  );

  function cambiarFrec(id: string) {
    setFrecId(id);
    const f = frecuencias.find((x) => x.id === id);
    if (f) setPagos(f.pagosDefault);
  }

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-wa-chat-bg text-wa-text">
      <div className="flex items-center gap-3 bg-wa-header px-4 py-3 text-white">
        <button onClick={onCancel} className="text-lg text-white/80">✕</button>
        <div className="font-semibold">Configura tu préstamo</div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="text-center text-[13px] text-wa-text-2">¿Cuánto necesitas?</div>
        <div className="my-2 text-center text-4xl font-extrabold">{fmtQ0(monto)}</div>
        <input
          type="range"
          min={min}
          max={max}
          step={50}
          value={monto}
          onChange={(e) => setMonto(Number(e.target.value))}
          className="w-full accent-wa-brand"
        />
        <div className="mt-1 flex justify-between text-[11px] text-wa-text-2">
          <span>{fmtQ0(min)}</span>
          <span>{fmtQ0(max)}</span>
        </div>

        <div className="mb-2 mt-6 text-[13px] text-wa-text-2">¿Cada cuánto pagas?</div>
        <div className="grid grid-cols-3 gap-2">
          {frecuencias.map((f) => (
            <button
              key={f.id}
              onClick={() => cambiarFrec(f.id)}
              className={
                "rounded-lg border py-2 text-[13px] font-semibold " +
                (f.id === frecId
                  ? "border-wa-brand bg-wa-brand text-[#063d1e]"
                  : "border-gray-200 bg-white")
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mb-2 mt-6 text-[13px] text-wa-text-2">¿En cuántos pagos?</div>
        <div className="grid grid-cols-3 gap-2">
          {(frec?.pagosOpciones ?? []).map((p) => (
            <button
              key={p}
              onClick={() => setPagos(p)}
              className={
                "rounded-lg border py-2 text-[13px] font-semibold " +
                (p === pagos
                  ? "border-wa-brand bg-wa-brand text-[#063d1e]"
                  : "border-gray-200 bg-white")
              }
            >
              {p} pagos
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-[#dcefe4] bg-[#f4fbf6] p-4 text-center">
          <div className="text-xl font-extrabold text-wa-teal">
            {fmtQ0(r.cuota)} / {r.unidad}
          </div>
          <div className="mt-1 text-[14px]">
            Total a pagar <b>{fmtQ0(r.total)}</b>
          </div>
          <div className="mt-1 text-[12px] text-wa-text-2">
            {fmtQ0(r.monto)} + {fmtQ0(r.intereses)} de intereses (5% mensual)
          </div>
        </div>
      </div>

      <div className="p-4">
        <button
          onClick={() =>
            onComplete({
              monto,
              frecuenciaId: frecId,
              pagos,
              cuota: r.cuota,
              total: r.total,
              intereses: r.intereses,
              unidad: r.unidad,
            })
          }
          className="w-full rounded-xl bg-wa-teal py-3 font-bold text-white"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
