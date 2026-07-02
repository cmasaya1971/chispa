type Props = {
  onReiniciar: () => void;
};

export function ChatHeader({ onReiniciar }: Props) {
  return (
    <header className="flex h-14 items-center gap-3 bg-wa-header px-3 text-white">
      {/* Flecha de volver (decorativa) */}
      <svg viewBox="0 0 24 24" width="22" height="22" className="fill-white/90 shrink-0">
        <path d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12z" />
      </svg>

      {/* Avatar de Chispa */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-wa-brand text-lg font-bold text-white">
        C
      </div>

      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-[15.5px] font-medium">Chispa</div>
        <div className="truncate text-[12px] text-white/75">en línea</div>
      </div>

      {/* Reiniciar demo */}
      <button
        onClick={onReiniciar}
        title="Reiniciar demo"
        className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[12px] text-white/90 transition hover:bg-white/20 active:scale-95"
      >
        <svg viewBox="0 0 24 24" width="15" height="15" className="fill-white/90">
          <path d="M12 5V2L8 6l4 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z" />
        </svg>
        Reiniciar
      </button>
    </header>
  );
}
