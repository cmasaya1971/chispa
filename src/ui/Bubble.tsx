import { RichText } from "./RichText";

export type Emisor = "chispa" | "usuario";

type Props = {
  emisor: Emisor;
  texto: string;
  hora?: string;
  children?: React.ReactNode; // para incrustar una Card u otro contenido
};

export function Bubble({ emisor, texto, hora, children }: Props) {
  const esChispa = emisor === "chispa";
  return (
    <div className={`flex ${esChispa ? "justify-start" : "justify-end"} px-1`}>
      <div
        className={[
          "relative max-w-[78%] rounded-lg px-2.5 py-1.5 text-[14.2px] leading-[19px] shadow-bubble",
          esChispa
            ? "bg-wa-bubble-in text-wa-text rounded-tl-none"
            : "bg-wa-bubble-out text-wa-text rounded-tr-none",
        ].join(" ")}
      >
        {/* Cola de la burbuja */}
        <span
          className={[
            "absolute top-0 h-0 w-0 border-[6px] border-transparent",
            esChispa
              ? "-left-[10px] border-t-wa-bubble-in border-r-wa-bubble-in"
              : "-right-[10px] border-t-wa-bubble-out border-l-wa-bubble-out",
          ].join(" ")}
        />
        {children}
        {texto && (
          <span className="whitespace-pre-wrap break-words">
            <RichText texto={texto} />
          </span>
        )}
        <span className="ml-2 inline-flex translate-y-[3px] items-center gap-1 whitespace-nowrap text-[11px] text-wa-text-2 float-right">
          {hora}
          {!esChispa && (
            <svg viewBox="0 0 16 11" width="15" height="11" className="fill-wa-tick">
              <path d="M11.07.65a.5.5 0 0 0-.7-.03L5.4 5.1 3.33 3.03a.5.5 0 0 0-.7.7l2.42 2.42a.5.5 0 0 0 .71 0l5.32-5.8a.5.5 0 0 0-.01-.7z" />
              <path d="M15.07.65a.5.5 0 0 0-.7-.03L9.4 5.1l-.53-.53-.7.7 1.06 1.06a.5.5 0 0 0 .71 0l5.32-5.8a.5.5 0 0 0-.01-.7z" opacity="0.9" />
            </svg>
          )}
        </span>
      </div>
    </div>
  );
}
