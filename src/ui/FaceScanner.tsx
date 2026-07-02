import { useEffect, useRef, useState } from "react";

type Props = {
  onComplete: () => void;
  onCancel: () => void;
};

type Fase = "iniciando" | "capturando" | "capturado" | "renap" | "confirmado";

// Duraciones (ms) de cada fase. Deterministas.
const T_CAPTURA = 2600;
const T_FLASH = 500;
const T_RENAP = 2600;
const T_CONFIRMA = 1000;

// Posiciones de los "puntos biométricos" sobre el rostro (%). Fake de captura.
const LANDMARKS = [
  { x: 36, y: 40 }, // ojo izq
  { x: 64, y: 40 }, // ojo der
  { x: 50, y: 54 }, // nariz
  { x: 40, y: 68 }, // boca izq
  { x: 60, y: 68 }, // boca der
  { x: 50, y: 26 }, // frente
  { x: 50, y: 82 }, // mentón
];

// Overlay de reconocimiento facial contra RENAP. Usa la cámara real del teléfono
// (getUserMedia); si no hay cámara o se niega el permiso, cae en una silueta
// simulada. Secuencia: captura biométrica → foto → consulta a RENAP → confirmado.
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
        setHayCamara(false);
      }

      // Secuencia determinista.
      setFase("capturando");
      timers.push(
        window.setTimeout(() => {
          if (cancelado) return;
          setFase("capturado");
          // Congela la imagen (la "foto" tomada).
          videoRef.current?.pause();
        }, T_CAPTURA)
      );
      timers.push(window.setTimeout(() => !cancelado && setFase("renap"), T_CAPTURA + T_FLASH));
      timers.push(
        window.setTimeout(() => !cancelado && setFase("confirmado"), T_CAPTURA + T_FLASH + T_RENAP)
      );
      timers.push(
        window.setTimeout(
          () => !cancelado && onComplete(),
          T_CAPTURA + T_FLASH + T_RENAP + T_CONFIRMA
        )
      );
    }

    arrancar();

    return () => {
      cancelado = true;
      timers.forEach(clearTimeout);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const capturandoOFoto = fase === "capturando" || fase === "capturado";

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/90 px-6 text-white">
      <div className="mb-6 text-center">
        <div className="text-[15px] font-semibold">Reconocimiento facial</div>
        <div className="text-[12.5px] text-white/60">Validación de identidad · RENAP</div>
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
          <div className="flex h-full w-full items-center justify-center">
            <svg viewBox="0 0 100 100" className="h-32 w-32 fill-white/25">
              <circle cx="50" cy="36" r="20" />
              <path d="M50 60c-20 0-32 14-32 32h64c0-18-12-32-32-32z" />
            </svg>
          </div>
        )}

        {/* Puntos biométricos sobre el rostro (captura de rasgos) */}
        {capturandoOFoto &&
          LANDMARKS.map((p, i) => (
            <span
              key={i}
              className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-wa-brand shadow-[0_0_8px_2px_rgba(37,211,102,0.7)]"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                animation: `bio-pulse 1.1s ease-in-out ${i * 120}ms infinite`,
              }}
            />
          ))}

        {/* Línea de escaneo mientras captura */}
        {fase === "capturando" && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 animate-[scan_2.4s_ease-in-out_infinite] bg-wa-brand shadow-[0_0_12px_2px_rgba(37,211,102,0.8)]" />
        )}

        {/* Flash de "foto tomada" */}
        {fase === "capturado" && (
          <div className="pointer-events-none absolute inset-0 animate-[bio-flash_0.5s_ease-out] bg-white" />
        )}

        {/* Consulta a RENAP: velo oscuro */}
        {fase === "renap" && <div className="absolute inset-0 bg-black/45" />}

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

      {/* Estado / barra de progreso */}
      <div className="mt-6 w-64 text-center">
        {fase === "iniciando" && <span className="text-[14px] text-white/70">Abriendo la cámara…</span>}

        {fase === "capturando" && (
          <span className="text-[14px] text-white/90">Capturando datos biométricos… mirá a la cámara</span>
        )}

        {fase === "capturado" && (
          <span className="text-[14px] text-white/90">Imagen capturada ✓</span>
        )}

        {fase === "renap" && (
          <div>
            <div className="mb-2 text-[14px] text-white/90">Obteniendo información de RENAP…</div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-wa-brand"
                style={{ animation: `renap-progress ${T_RENAP}ms ease-in-out forwards` }}
              />
            </div>
          </div>
        )}

        {fase === "confirmado" && (
          <span className="text-[14px] font-semibold text-wa-brand">Identidad confirmada con RENAP</span>
        )}
      </div>

      {(fase === "iniciando" || fase === "capturando") && (
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
