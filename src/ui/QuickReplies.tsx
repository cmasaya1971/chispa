export type QuickReply = { id: string; label: string };

type Props = {
  opciones: QuickReply[];
  onElegir: (qr: QuickReply) => void;
  deshabilitado?: boolean;
};

// Sugerencias/atajos bajo el último mensaje de Chispa. En Nivel 2 son opcionales:
// el usuario también puede escribir libre y la IA entiende.
export function QuickReplies({ opciones, onElegir, deshabilitado }: Props) {
  if (opciones.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 px-2 pb-1 pt-0.5">
      {opciones.map((o) => (
        <button
          key={o.id}
          disabled={deshabilitado}
          onClick={() => onElegir(o)}
          className="rounded-full border border-wa-teal/40 bg-white px-3 py-1.5 text-[13px] font-medium text-wa-teal shadow-sm transition active:scale-95 disabled:opacity-50"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
