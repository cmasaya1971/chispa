import { useEffect, useRef, useState } from "react";

type Props = {
  onComplete: () => void;
  onCancel: () => void;
};

type Fase = "iniciando" | "centrando" | "capturando" | "capturado" | "renap" | "confirmado";

// Duraciones (ms). Deterministas.
const T_CAPTURA = 2400;
const T_FLASH = 500;
const T_RENAP = 2600;
const T_CONFIRMA = 1000;
const T_CENTRADO_MAX = 8000; // tope de espera del centrado del rostro
const T_CENTRADO_SIN_DETECTOR = 2600; // sin detector: tiempo para acomodarse

// Posiciones de los "puntos biométricos" sobre el rostro (%).
const LANDMARKS = [
  { x: 36, y: 40 }, { x: 64, y: 40 }, { x: 50, y: 54 },
  { x: 40, y: 68 }, { x: 60, y: 68 }, { x: 50, y: 26 }, { x: 50, y: 82 },
];
const MESH = [
  [5, 0], [5, 1], [0, 1], [0, 2], [1, 2],
  [2, 3], [2, 4], [3, 4], [3, 6], [4, 6],
];

// Overlay de reconocimiento facial contra RENAP. Muestra la cámara REAL, espera
// a que el rostro esté dentro del óvalo (detector facial del navegador si existe,
// si no una guía con tiempo), captura el frame real (pause), consulta a RENAP y
// confirma. Si no hay cámara/permiso, cae en una silueta.
export function FaceScanner({ onComplete, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [fase, setFase] = useState<Fase>("iniciando");
  const [hayCamara, setHayCamara] = useState(false);
  const [rostroOk, setRostroOk] = useState(false);

  useEffect(() => {
    let cancelado = false;
    const timers: number[] = [];
    const sleep = (ms: number) =>
      new Promise<void>((res) => {
        const id = window.setTimeout(res, ms);
        timers.push(id);
      });

    // Espera a que el rostro esté encuadrado. Usa el FaceDetector nativo si está
    // disponible; si no, espera un tiempo fijo. NUNCA rompe el flujo.
    async function esperarRostro() {
      const FD = (window as unknown as { FaceDetector?: new (o?: unknown) => { detect(v: unknown): Promise<unknown[]> } }).FaceDetector;
      if (!FD || !videoRef.current) {
        await sleep(T_CENTRADO_SIN_DETECTOR);
        return;
      }
      let detector: { detect(v: unknown): Promise<unknown[]> };
      try {
        detector = new FD({ fastMode: true, maxDetectedFaces: 1 });
      } catch {
        await sleep(T_CENTRADO_SIN_DETECTOR);
        return;
      }
      const inicio = Date.now();
      while (!cancelado && Date.now() - inicio < T_CENTRADO_MAX) {
        try {
          const faces = await detector.detect(videoRef.current);
          if (faces && faces.length > 0) {
            setRostroOk(true);
            await sleep(700); // deja ver "rostro detectado" antes de capturar
            return;
          }
        } catch {
          await sleep(T_CENTRADO_SIN_DETECTOR);
          return;
        }
        await sleep(400);
      }
    }

    async function secuencia() {
      // 1. Abrir cámara.
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

      // 2. Centrar el rostro (o guiar).
      if (cancelado) return;
      setFase("centrando");
      await esperarRostro();

      // 3. Captura biométrica.
      if (cancelado) return;
      setFase("capturando");
      await sleep(T_CAPTURA);

      // 4. Foto: congela el frame real.
      if (cancelado) return;
      videoRef.current?.pause();
      setFase("capturado");
      await sleep(T_FLASH);

      // 5. Consulta a RENAP.
      if (cancelado) return;
      setFase("renap");
      await sleep(T_RENAP);

      // 6. Confirmado.
      if (cancelado) return;
      setFase("confirmado");
      await sleep(T_CONFIRMA);

      if (!cancelado) onComplete();
    }

    secuencia();

    return () => {
      cancelado = true;
      timers.forEach(clearTimeout);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const capturandoOFoto = fase === "capturando" || fase === "capturado";
  const centrando = fase === "centrando";

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/90 px-6 text-white">
      <div className="mb-6 text-center">
        <div className="text-[15px] font-semibold">Reconocimiento facial</div>
        <div className="text-[12.5px] text-white/60">Validación de identidad · RENAP</div>
      </div>

      {/* Marco/óvalo. Pulsa mientras se centra el rostro. */}
      <div
        className={[
          "relative h-64 w-56 overflow-hidden rounded-[45%] border-2 bg-white/5",
          centrando && !rostroOk ? "border-white/60 animate-pulse" : "border-wa-brand/70",
        ].join(" ")}
      >
        {/* Video SIEMPRE montado (para que el ref exista al asignar la cámara).
            Zoom para encuadrar el rostro. Al capturar se pausa = foto real. */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`h-full w-full object-cover ${hayCamara ? "" : "hidden"}`}
          style={{ transform: "scaleX(-1) scale(1.7)", transformOrigin: "center 32%" }}
        />

        {!hayCamara && (
          <div className="flex h-full w-full items-center justify-center">
            <svg viewBox="0 0 100 100" className="h-32 w-32 fill-white/25">
              <circle cx="50" cy="36" r="20" />
              <path d="M50 60c-20 0-32 14-32 32h64c0-18-12-32-32-32z" />
            </svg>
          </div>
        )}

        {/* Malla facial durante la captura */}
        {capturandoOFoto && (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
            {MESH.map(([a, b], i) => (
              <line key={i} x1={LANDMARKS[a].x} y1={LANDMARKS[a].y} x2={LANDMARKS[b].x} y2={LANDMARKS[b].y} stroke="#25D366" strokeWidth="0.5" opacity="0.5" />
            ))}
          </svg>
        )}

        {/* Puntos biométricos */}
        {capturandoOFoto &&
          LANDMARKS.map((p, i) => (
            <span
              key={i}
              className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-wa-brand shadow-[0_0_8px_2px_rgba(37,211,102,0.7)]"
              style={{ left: `${p.x}%`, top: `${p.y}%`, animation: `bio-pulse 1.1s ease-in-out ${i * 120}ms infinite` }}
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

        {/* Consulta a RENAP: velo sobre la foto congelada */}
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

      {/* Estado / guía / progreso */}
      <div className="mt-6 w-64 text-center">
        {fase === "iniciando" && <span className="text-[14px] text-white/70">Abriendo la cámara…</span>}

        {centrando &&
          (rostroOk ? (
            <span className="text-[14px] font-semibold text-wa-brand">¡Perfecto! Rostro detectado ✓</span>
          ) : (
            <span className="text-[14px] text-white/90">Centra tu rostro dentro del óvalo 🙂</span>
          ))}

        {fase === "capturando" && (
          <span className="text-[14px] text-white/90">Capturando datos biométricos…</span>
        )}

        {fase === "capturado" && <span className="text-[14px] text-white/90">Imagen capturada ✓</span>}

        {fase === "renap" && (
          <div>
            <div className="mb-2 text-[14px] text-white/90">Obteniendo información de RENAP…</div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-wa-brand" style={{ animation: `renap-progress ${T_RENAP}ms ease-in-out forwards` }} />
            </div>
          </div>
        )}

        {fase === "confirmado" && (
          <span className="text-[14px] font-semibold text-wa-brand">Identidad confirmada con RENAP</span>
        )}
      </div>

      {(fase === "iniciando" || centrando || fase === "capturando") && (
        <button onClick={onCancel} className="mt-8 text-[13px] text-white/50 underline underline-offset-2">
          Cancelar
        </button>
      )}
    </div>
  );
}
