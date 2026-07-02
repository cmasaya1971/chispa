import { RichText } from "./RichText";

type Props = { texto: string };

// Aviso de sistema centrado, al estilo de las notificaciones de WhatsApp
// (como el aviso de cifrado). Se usa para eventos institucionales, ej. la
// confirmación de validación biométrica contra RENAP.
export function SystemNotice({ texto }: Props) {
  return (
    <div className="flex justify-center px-6 py-1">
      <div className="flex max-w-[85%] items-start gap-1.5 rounded-md bg-[#FDF4C9] px-2.5 py-1.5 text-center text-[12.5px] leading-[17px] text-[#5b5333] shadow-sm">
        <svg viewBox="0 0 24 24" width="14" height="14" className="mt-[1px] shrink-0 fill-[#8a7f4a]">
          <path d="M12 1 3 5v6c0 5 3.8 9.7 9 11 5.2-1.3 9-6 9-11V5l-9-4zm0 10.9h7c-.5 4-3.3 7.5-7 8.6V12H5V6.3l7-3.1v8.7z" />
        </svg>
        <span>
          <RichText texto={texto} />
        </span>
      </div>
    </div>
  );
}
