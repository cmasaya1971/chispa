import { useEffect, useRef, useState } from "react";

type Props = {
  onComplete: () => void;
  onCancel: () => void;
};

type Fase = "iniciando" | "centrando" | "liveness" | "verificando" | "confirmado";

// Retos de prueba de vida (simulados, deterministas). En un liveness real, un SDK
// verificaría estos gestos; aquí se guionan para el demo y "pasan" solos.
const RETOS = [
  { icono: "👁️", texto: "Parpadea despacio" },
  { icono: "↪️", texto: "Gira tu cabeza a la derecha" },
  { icono: "🙂", texto: "Sonríe a la cámara" },
];

// Duraciones (ms). Deterministas.
const T_CENTRADO = 2200;
const T_RETO = 1900;
const T_RETO_OK = 650;
const T_VERIFICA = 2400;
const T_CONFIRMA = 1100;

// Puntos y malla biométricos sobre el rostro (%).
const LANDMARKS = [
  { x: 36, y: 40 }, { x: 64, y: 40 }, { x: 50, y: 54 },
  { x: 40, y: 68 }, { x: 60, y: 68 }, { x: 50, y: 26 }, { x: 50, y: 82 },
];
const MESH = [
  [5, 0], [5, 1], [0, 1], [0, 2], [1, 2],
  [2, 3], [2, 4], [3, 4], [3, 6], [4, 6],
];

// Autorización biométrica del crédito con PRUEBA DE VIDA simulada. Muestra la
// cámara real, guía al usuario por unos retos (parpadear, girar, sonreír),
// "verifica" la prueba de vida y confirma. Si no hay cámara, cae en silueta.
export function LivenessScanner({ onComplete, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [fase, setFase] = useState<Fase>("iniciando");
  const [hayCamara, setHayCamara] = useState(false);
  const [retoIdx, setRetoIdx] = useState(0);
  const [retoOk, setRetoOk] = useState(false);

  useEffect(() => {
    let cancelado = false;
    const timers: number[] = [];
    const sleep = (ms: number) =>
      new Promise<void>((res) => {
        const id = window.setTimeout(res, ms);
        timers.push(id);
      });

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

      // 2. Centrar el rostro.
      if (cancelado) return;
      setFase("centrando");
      await sleep(T_CENTRADO);

      // 3. Prueba de vida: retos guionados.
      if (cancelado) return;
      setFase("liveness");
      for (let i = 0; i < RETOS.length; i++) {
        if (cancelado) return;
        setRetoIdx(i);
        setRetoOk(false);
        await sleep(T_RETO);
        if (cancelado) return;
        setRetoOk(true);
        await sleep(T_RETO_OK);
      }

      // 4. Verificación biométrica.
      if (cancelado) return;
      setFase("verificando");
      await sleep(T_VERIFICA);

      // 5. Confirmado.
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

  const enLiveness = fase === "liveness";
  const verificando = fase === "verificando";
  const reto = RETOS[retoIdx];

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/90 px-6 text-white">
      <div className="mb-5 text-center">
        <div className="text-[15px] font-semibold">Autorización biométrica</div>
        <div className="text-[12.5px] text-white/60">Prueba de vida · Banco GyT Continental</div>
      </div>

      {/* Óvalo con la cámara. */}
      <div
        className={[
          "relative h-64 w-56 overflow-hidden rounded-[45%] border-2 bg-white/5",
          enLiveness && !retoOk ? "border-white/60 animate-pulse" : "border-wa-brand/70",
        ].join(" ")}
      >
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

        {/* Reto de prueba de vida: check verde cuando "pasa". */}
        {enLiveness && retoOk && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/25">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-wa-brand">
              <svg viewBox="0 0 24 24" className="h-9 w-9 fill-white">
                <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
              </svg>
            </div>
          </div>
        )}

        {/* Malla + puntos durante la verificación. */}
        {verificando && (
          <>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
              {MESH.map(([a, b], i) => (
                <line key={i} x1={LANDMARKS[a].x} y1={LANDMARKS[a].y} x2={LANDMARKS[b].x} y2={LANDMARKS[b].y} stroke="#25D366" strokeWidth="0.5" opacity="0.5" />
              ))}
            </svg>
            {LANDMARKS.map((p, i) => (
              <span
                key={i}
                className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-wa-brand shadow-[0_0_8px_2px_rgba(37,211,102,0.7)]"
                style={{ left: `${p.x}%`, top: `${p.y}%`, animation: `bio-pulse 1.1s ease-in-out ${i * 120}ms infinite` }}
              />
            ))}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 animate-[scan_2.4s_ease-in-out_infinite] bg-wa-brand shadow-[0_0_12px_2px_rgba(37,211,102,0.8)]" />
          </>
        )}

        {/* Confirmación final. */}
        {fase === "confirmado" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-wa-brand">
              <svg viewBox="0 0 24 24" className="h-12 w-12 fill-white">
                <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Reto grande y visible durante la prueba de vida. */}
      {enLiveness && (
        <div className="mt-6 flex flex-col items-center">
          <div className="text-4xl">{reto.icono}</div>
          <div className="mt-2 text-[16px] font-semibold text-white">{reto.texto}</div>
          <div className="mt-3 flex gap-1.5">
            {RETOS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-6 rounded-full ${i < retoIdx || (i === retoIdx && retoOk) ? "bg-wa-brand" : "bg-white/25"}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Estados de texto. */}
      <div className="mt-6 w-64 text-center">
        {fase === "iniciando" && <span className="text-[14px] text-white/70">Abriendo la cámara…</span>}
        {fase === "centrando" && (
          <span className="text-[14px] text-white/90">Centra tu rostro dentro del óvalo 🙂</span>
        )}
        {verificando && (
          <div>
            <div className="mb-2 text-[14px] text-white/90">Verificando prueba de vida…</div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-wa-brand" style={{ animation: `renap-progress ${T_VERIFICA}ms ease-in-out forwards` }} />
            </div>
          </div>
        )}
        {fase === "confirmado" && (
          <span className="text-[14px] font-semibold text-wa-brand">Identidad autorizada ✓</span>
        )}
      </div>

      {(fase === "iniciando" || fase === "centrando" || enLiveness) && (
        <button onClick={onCancel} className="mt-8 text-[13px] text-white/50 underline underline-offset-2">
          Cancelar
        </button>
      )}
    </div>
  );
}
