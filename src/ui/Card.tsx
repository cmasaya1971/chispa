import { RichText } from "./RichText";

export type Fila = { etiqueta: string; valor: string };

export type Opcion = {
  etiqueta: string;
  valor: string;
  seleccionado?: boolean;
};

type Props = {
  titulo?: string;
  filas?: Fila[];
  opciones?: Opcion[];
  pie?: string;
  contenido?: React.ReactNode;
};

// Tarjeta estructurada dentro de una burbuja de Chispa (cuenta, recibo, oferta,
// movimientos, remesa, referido). Patrón visual claro con filas etiqueta/valor.
export function Card({ titulo, filas, opciones, pie, contenido }: Props) {
  return (
    <div className="my-1 w-full min-w-[220px] rounded-md border border-black/5 bg-black/[0.02] p-2.5">
      {titulo && (
        <div className="mb-1.5 text-[13.5px] font-semibold text-wa-teal">
          <RichText texto={titulo} />
        </div>
      )}

      {filas && filas.length > 0 && (
        <div className="flex flex-col gap-1">
          {filas.map((f, i) => (
            <div key={i} className="flex items-baseline justify-between gap-3 text-[13.5px]">
              <span className="text-wa-text-2">{f.etiqueta}</span>
              <span className="text-right font-semibold text-wa-text">
                <RichText texto={f.valor} />
              </span>
            </div>
          ))}
        </div>
      )}

      {opciones && opciones.length > 0 && (
        <div className="mt-1 flex flex-col gap-1.5">
          {opciones.map((o, i) => (
            <div
              key={i}
              className={[
                "flex items-center justify-between rounded border px-2.5 py-1.5 text-[13.5px]",
                o.seleccionado ? "border-wa-brand bg-wa-brand/10" : "border-black/10 bg-white",
              ].join(" ")}
            >
              <span className="text-wa-text">{o.etiqueta}</span>
              <span className="font-semibold text-wa-text">
                <RichText texto={o.valor} />
              </span>
            </div>
          ))}
        </div>
      )}

      {contenido}

      {pie && (
        <div className="mt-2 text-[13px] text-wa-text">
          <RichText texto={pie} />
        </div>
      )}
    </div>
  );
}
