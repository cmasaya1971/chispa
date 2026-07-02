import type { MovimientoItem } from "../../shared/adjuntos";

type Props = {
  titulo: string;
  items: MovimientoItem[];
};

// Estado de cuenta estructurado: cada movimiento en una fila con concepto +
// fecha a la izquierda y el monto (coloreado) a la derecha, como un banco.
export function MovimientosCard({ titulo, items }: Props) {
  return (
    <div className="my-1 w-full min-w-[248px] overflow-hidden rounded-lg border border-black/10 bg-white">
      <div className="border-b border-black/10 bg-black/[0.03] px-3 py-2 text-[12.5px] font-semibold text-wa-teal">
        {titulo}
      </div>
      <div className="divide-y divide-black/[0.06]">
        {items.map((m, i) => (
          <div key={i} className="flex items-center justify-between gap-3 px-3 py-2">
            <div className="min-w-0">
              <div className="truncate text-[13.5px] text-wa-text">{m.concepto}</div>
              <div className="text-[11.5px] text-wa-text-2">{m.fecha}</div>
            </div>
            <div
              className={[
                "shrink-0 text-[13.5px] font-semibold tabular-nums",
                m.signo === "neg" ? "text-[#c0392b]" : "text-[#1e8e3e]",
              ].join(" ")}
            >
              {m.montoTexto}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
