import { useEffect, useRef, useState } from "react";
import type { Estado } from "../../shared/estado";

type Props = {
  estado: Estado;
  onComplete: (firmaDataURL: string) => void;
  onCancel: () => void;
};

// Contrato del préstamo + firma con el dedo (canvas real). El botón se habilita
// al firmar. Devuelve la firma como dataURL para guardarla en el crédito.
export function ContratoFirma({ estado, onComplete, onCancel }: Props) {
  const contrato = estado.credito.contratoResumen;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [firmado, setFirmado] = useState(false);
  const dibujo = useRef({ activo: false, last: { x: 0, y: 0 } });

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    c.width = rect.width;
    c.height = 150;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0b2b1e";
  }, []);

  function pos(e: React.PointerEvent) {
    const c = canvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function down(e: React.PointerEvent) {
    dibujo.current.activo = true;
    dibujo.current.last = pos(e);
    setFirmado(true);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }
  function move(e: React.PointerEvent) {
    if (!dibujo.current.activo) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(dibujo.current.last.x, dibujo.current.last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    dibujo.current.last = p;
  }
  function up() {
    dibujo.current.activo = false;
  }
  function borrar() {
    const c = canvasRef.current;
    if (!c) return;
    c.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    setFirmado(false);
  }

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-wa-chat-bg text-wa-text">
      <div className="flex items-center gap-3 bg-wa-header px-4 py-3 text-white">
        <button onClick={onCancel} className="text-lg text-white/80">✕</button>
        <div className="font-semibold">Contrato del préstamo</div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 text-[13.5px] leading-relaxed">
        <p className="mb-3">
          <b>Formas de pago.</b> {contrato?.formasDePago}
        </p>
        <p className="mb-3">
          <b>Costo.</b> {contrato?.costo}
        </p>
        <p className="mb-4">
          <b>Documentos.</b> {contrato?.documentos}
        </p>

        <div className="mb-1 text-[12px] text-wa-text-2">Firma aquí con tu dedo</div>
        <div className="relative rounded-lg border-2 border-dashed border-[#c7d3ce] bg-white">
          <canvas
            ref={canvasRef}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            className="h-[150px] w-full touch-none rounded-lg"
          />
          {!firmado && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[13px] text-gray-300">
              ✍️ Firma aquí
            </div>
          )}
          <button
            onClick={borrar}
            className="absolute right-2 top-2 rounded-full border border-[#dcefe4] bg-white px-2 py-0.5 text-[11px] text-wa-teal"
          >
            Borrar
          </button>
        </div>
      </div>

      <div className="p-4">
        <button
          disabled={!firmado}
          onClick={() => {
            const c = canvasRef.current;
            if (c) onComplete(c.toDataURL());
          }}
          className="w-full rounded-xl bg-wa-teal py-3 font-bold text-white disabled:bg-[#a9c7bd]"
        >
          Firmar y continuar
        </button>
      </div>
    </div>
  );
}
