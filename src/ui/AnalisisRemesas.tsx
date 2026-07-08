import { useEffect, useRef, useState } from "react";

type Props = {
  onComplete: () => void;
  onCancel: () => void;
};

type Fase = "buscando" | "resultado";

// Fuentes que el sistema "consulta" (para el efecto de trabajo real).
const FUENTES = [
  "Registros de Chispa",
  "Banco GyT Continental",
  "Historial de remesas 2025",
];

// Remesas encontradas (demo). Van apareciendo una a una como si el sistema
// las estuviera leyendo. Promedio ≈ US$305/mes, consistente con el mock.
const REMESAS = [
  { mes: "Enero 2025", monto: "US$300" },
  { mes: "Febrero 2025", monto: "US$320" },
  { mes: "Marzo 2025", monto: "US$290" },
  { mes: "Abril 2025", monto: "US$340" },
  { mes: "Mayo 2025", monto: "US$300" },
  { mes: "Junio 2025", monto: "US$285" },
];

const T_FUENTE = 720;
const T_FILA = 210;
const SEG_RESULTADO = 6; // segundos visibles del resultado antes de avanzar

// Pantalla de análisis del historial de remesas. Muestra al sistema "trabajando"
// (consultando fuentes, leyendo remesas) y luego el resultado: el usuario recibe
// remesas de forma constante desde 2025 y califica para usarlas como garantía.
export function AnalisisRemesas({ onComplete, onCancel }: Props) {
  const [fase, setFase] = useState<Fase>("buscando");
  const [fuentesOk, setFuentesOk] = useState(0);
  const [filas, setFilas] = useState(0);
  const [restante, setRestante] = useState(SEG_RESULTADO);
  const yaAvanzo = useRef(false);

  useEffect(() => {
    let cancelado = false;
    const timers: number[] = [];
    const sleep = (ms: number) =>
      new Promise<void>((res) => {
        const id = window.setTimeout(res, ms);
        timers.push(id);
      });

    async function run() {
      for (let i = 0; i < FUENTES.length; i++) {
        if (cancelado) return;
        await sleep(T_FUENTE);
        setFuentesOk(i + 1);
      }
      for (let i = 0; i < REMESAS.length; i++) {
        if (cancelado) return;
        await sleep(T_FILA);
        setFilas(i + 1);
      }
      // Pausa para que se lea la lista completa de remesas antes del resultado.
      await sleep(2600);
      if (!cancelado) setFase("resultado");
    }
    run();

    return () => {
      cancelado = true;
      timers.forEach(clearTimeout);
    };
  }, []);

  // Al mostrar el resultado, deja unos segundos para leerlo (con cuenta regresiva
  // visible) y luego avanza solo. "Continuar ahora" lo adelanta.
  useEffect(() => {
    if (fase !== "resultado") return;
    setRestante(SEG_RESULTADO);
    const id = window.setInterval(() => {
      setRestante((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          avanzar();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase]);

  function avanzar() {
    if (yaAvanzo.current) return;
    yaAvanzo.current = true;
    onComplete();
  }

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-wa-chat-bg text-wa-text">
      <div className="flex items-center gap-3 bg-wa-header px-4 py-3 text-white">
        <button onClick={onCancel} className="text-lg text-white/80">✕</button>
        <div className="font-semibold">Análisis de tus remesas</div>
      </div>

      {fase === "buscando" ? (
        <div className="flex flex-1 flex-col px-5 py-6">
          <div className="mb-1 flex items-center gap-2 text-[15px] font-semibold">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-wa-teal border-t-transparent" />
            Consultando tus registros…
          </div>
          <div className="mb-5 text-[12.5px] text-wa-text-2">
            Verificando tu historial de cobro de remesas.
          </div>

          {/* Fuentes consultadas */}
          <div className="space-y-2">
            {FUENTES.map((f, i) => {
              const ok = i < fuentesOk;
              const activo = i === fuentesOk;
              return (
                <div
                  key={f}
                  className={`flex items-center gap-3 rounded-lg bg-white px-3 py-2.5 text-[13.5px] ${ok || activo ? "opacity-100" : "opacity-45"}`}
                >
                  {ok ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-wa-brand text-[12px] font-black text-white">✓</span>
                  ) : activo ? (
                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-wa-teal border-t-transparent" />
                  ) : (
                    <span className="h-5 w-5 rounded-full border-2 border-gray-200" />
                  )}
                  <span>{f}</span>
                </div>
              );
            })}
          </div>

          {/* Remesas encontradas apareciendo */}
          <div className="mt-5 flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-3 py-2 text-[12px] font-semibold text-wa-text-2">
              Remesas encontradas
            </div>
            <div className="px-3 py-1">
              {REMESAS.slice(0, filas).map((r) => (
                <div key={r.mes} className="flex justify-between border-b border-gray-50 py-1.5 text-[13px] last:border-none">
                  <span className="text-wa-text-2">🌎 {r.mes}</span>
                  <span className="font-semibold text-wa-teal">{r.monto}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col px-5 py-6">
          <div className="mb-4 flex flex-col items-center text-center">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-wa-brand">
              <svg viewBox="0 0 24 24" className="h-9 w-9 fill-white">
                <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
              </svg>
            </div>
            <div className="text-[17px] font-bold">Historial verificado ✓</div>
            <p className="mt-1 text-[13px] text-wa-text-2">
              Corroboramos tu historial en Chispa y Banco GyT Continental.
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex justify-between border-b border-gray-100 py-2 text-[13.5px]">
              <span className="text-wa-text-2">Recibiendo remesas desde</span>
              <span className="font-semibold">Enero 2025</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 py-2 text-[13.5px]">
              <span className="text-wa-text-2">Meses consecutivos</span>
              <span className="font-semibold">6 de 6 ✓</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 py-2 text-[13.5px]">
              <span className="text-wa-text-2">Promedio mensual</span>
              <span className="font-semibold">US$305 · Q2,325</span>
            </div>
            <div className="flex justify-between py-2 text-[13.5px]">
              <span className="text-wa-text-2">Rango</span>
              <span className="font-semibold">US$285 – US$340</span>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-[#dcefe4] bg-[#f4fbf6] p-4 text-center">
            <div className="text-[14px] font-semibold text-wa-teal">
              ✓ Calificas para usar tus remesas como garantía
            </div>
            <div className="mt-1 text-[12px] text-wa-text-2">
              Tu flujo constante de remesas respalda tu crédito.
            </div>
          </div>

          <div className="flex-1" />

          {/* Cuenta regresiva visible antes de cerrar */}
          <div className="mb-3 mt-4">
            <div className="mb-1.5 flex justify-between text-[12px] text-wa-text-2">
              <span>Continuando…</span>
              <span>{restante}s</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-wa-brand"
                style={{ width: `${(restante / SEG_RESULTADO) * 100}%`, transition: "width 1s linear" }}
              />
            </div>
          </div>

          <button
            onClick={avanzar}
            className="w-full rounded-xl bg-wa-teal py-3 font-bold text-white"
          >
            Continuar ahora
          </button>
        </div>
      )}
    </div>
  );
}
