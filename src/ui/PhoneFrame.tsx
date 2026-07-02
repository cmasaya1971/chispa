type Props = {
  children: React.ReactNode;
};

// Marco de teléfono que contiene toda la demo y da el viewport móvil creíble.
export function PhoneFrame({ children }: Props) {
  return (
    <div className="flex min-h-full items-center justify-center p-0 sm:p-6">
      <div
        className="relative flex h-[100dvh] w-full max-w-[400px] flex-col overflow-hidden bg-black shadow-2xl sm:h-[860px] sm:rounded-[38px] sm:border-[10px] sm:border-black"
      >
        {/* Notch (solo en escritorio) */}
        <div className="pointer-events-none absolute left-1/2 top-0 z-20 hidden h-6 w-36 -translate-x-1/2 rounded-b-2xl bg-black sm:block" />
        <div className="flex h-full flex-col bg-wa-chat-bg">
          {/* Barra de estado (deja libre el notch en escritorio) */}
          <div className="hidden h-6 shrink-0 bg-wa-header sm:block" />
          {children}
        </div>
      </div>
    </div>
  );
}
