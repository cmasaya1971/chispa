import { useEffect, useRef, useState } from "react";

type Props = {
  onComplete: () => void;
  onCancel: () => void;
};

type Fase = "iniciando" | "escaneando" | "confirmado";

// Overlay de reconocimiento facial contra RENAP. Usa la cámara real del teléfono
// (getUserMedia); si no hay cámara o se niega el permiso, cae en una silueta
// simulada con la misma animación. Siempre completa (el demo nunca se rompe).
export function FaceScanner({ onComplete, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [fase, setFase] = useState<Fase>("iniciando");
  const [hayCamara, setHayCamara] = useState(false);

  useEffect(() => {
    let cancelado = false;
    const timers: number[] = [];

    async function arrancar() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setHayCamara(true);
      } catch {
        // Sin cámara / permiso denegado → modo simulado con silueta.
        setHayCamara(false);
      }

      // Secuencia determinista: escaneando → confirmado → completar.
      setFase("escaneando");
      timers.push(window.setTimeout(() => !cancelado && setFase("confirmado"), 2800));
      timers.push(window.setTimeout(() => !cancelado && onComplete(), 4200));
    }

    arrancar();

    return () => {
      cancelado = true;
      timers.forEach(clearTimeout);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/90 px-6 text-white">
      <div className="mb-6 text-center">
        <div className="text-[15px] font-semibold">Reconocimiento facial</div>
        <div className="text-[12.5px] text-white/60">Se valida contra RENAP</div>
      </div>

      {/* Marco de la cámara con óvalo de rostro */}
      <div className="relative h-64 w-56 overflow-hidden rounded-[45%] border-2 border-wa-brand/70 bg-white/5">
        {hayCamara ? (
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-full w-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />
        ) : (
          // Silueta de respaldo (sin cámara)
          <div className="flex h-full w-full items-center justify-center">
            <svg viewBox="0 0 100 100" className="h-32 w-32 fill-white/25">
              <circle cx="50" cy="36" r="20" />
              <path d="M50 60c-20 0-32 14-32 32h64c0-18-12-32-32-32z" />
            </svg>
          </div>
        )}

        {/* Línea de escaneo animada */}
        {fase === "escaneando" && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 animate-[scan_2.4s_ease-in-out_infinite] bg-wa-brand shadow-[0_0_12px_2px_rgba(37,211,102,0.8)]" />
        )}

        {/* Check de confirmación */}
        {fase === "confirmado" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-wa-brand">
              <svg viewBox="0 0 24 24" className="h-12 w-12 fill-white">
                <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 h-6 text-center text-[14px]">
        {fase === "iniciando" && <span className="text-white/70">Abriendo la cámara…</span>}
        {fase === "escaneando" && <span className="text-white/90">Escaneando tu rostro… mirá a la cámara</span>}
        {fase === "confirmado" && <span className="font-semibold text-wa-brand">Identidad confirmada con RENAP</span>}
      </div>

      {fase !== "confirmado" && (
        <button
          onClick={onCancel}
          className="mt-8 text-[13px] text-white/50 underline underline-offset-2"
        >
          Cancelar
        </button>
      )}
    </div>
  );
}
