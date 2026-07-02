// Los tres puntos "escribiendo…" como una burbuja de Chispa.
export function TypingIndicator() {
  return (
    <div className="flex justify-start px-1">
      <div className="relative rounded-lg rounded-tl-none bg-wa-bubble-in px-3 py-2.5 shadow-bubble">
        <span className="absolute -left-[10px] top-0 h-0 w-0 border-[6px] border-transparent border-t-wa-bubble-in border-r-wa-bubble-in" />
        <span className="flex items-center gap-1">
          <span className="wa-dot h-2 w-2 rounded-full bg-wa-text-2" style={{ animationDelay: "0ms" }} />
          <span className="wa-dot h-2 w-2 rounded-full bg-wa-text-2" style={{ animationDelay: "200ms" }} />
          <span className="wa-dot h-2 w-2 rounded-full bg-wa-text-2" style={{ animationDelay: "400ms" }} />
        </span>
      </div>
    </div>
  );
}
