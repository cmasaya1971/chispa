type Props = {
  onContinuar: () => void;
  onCancel: () => void;
};

// Pantalla de consentimiento previa a la biometría de autorización del crédito.
// Formal y clara: explica por qué se pide, y el usuario confirma con "Continuar"
// antes de que se levante la cámara.
export function AutorizacionBiometrica({ onContinuar, onCancel }: Props) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-wa-chat-bg text-wa-text">
      <div className="flex items-center gap-3 bg-wa-header px-4 py-3 text-white">
        <button onClick={onCancel} className="text-lg text-white/80">✕</button>
        <div className="font-semibold">Autorización de tu crédito</div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-7 text-center">
        {/* Escudo de seguridad */}
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-wa-brand/15">
          <svg viewBox="0 0 24 24" className="h-11 w-11 fill-wa-teal">
            <path d="M12 1 3 5v6c0 5 3.8 9.7 9 11 5.2-1.3 9-6 9-11V5l-9-4zm-1.2 15.2L7 12.4l1.4-1.4 2.4 2.4 4.8-4.8L17 10l-6.2 6.2z" />
          </svg>
        </div>

        <div className="text-[18px] font-bold">Validación de identidad</div>
        <p className="mt-3 text-[14px] leading-relaxed text-wa-text-2">
          Por tu seguridad, y para autorizar el desembolso de tu crédito, necesitamos{" "}
          <b className="text-wa-text">validar tu identidad</b> con reconocimiento facial y prueba de
          vida.
        </p>

        <div className="mt-6 w-full space-y-2.5 text-left text-[13px] text-wa-text-2">
          <div className="flex items-center gap-2.5">
            <span className="text-[15px]">📷</span> Mira a la cámara en un lugar con buena luz.
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-[15px]">🙂</span> Sigue las indicaciones en pantalla.
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-[15px]">🔒</span> Tus datos se validan de forma segura.
          </div>
        </div>
      </div>

      <div className="p-5">
        <button
          onClick={onContinuar}
          className="w-full rounded-xl bg-wa-teal py-3 font-bold text-white"
        >
          Continuar
        </button>
        <div className="mt-3 text-center text-[11px] text-wa-text-2">
          Banco GyT Continental · Seguridad
        </div>
      </div>
    </div>
  );
}
