// Renderiza el subconjunto de "negrita" de WhatsApp: **texto** → <strong>.
// Respeta saltos de línea. No interpreta ningún otro markdown.

type Props = { texto: string };

export function RichText({ texto }: Props) {
  const lineas = texto.split("\n");
  return (
    <>
      {lineas.map((linea, i) => (
        <span key={i}>
          {renderNegrita(linea)}
          {i < lineas.length - 1 ? <br /> : null}
        </span>
      ))}
    </>
  );
}

function renderNegrita(linea: string) {
  // Divide por pares de ** manteniendo el contenido.
  const partes = linea.split(/\*\*(.+?)\*\*/g);
  return partes.map((parte, i) =>
    // Los índices impares son el contenido entre ** ** → negrita.
    i % 2 === 1 ? <strong key={i} className="font-semibold">{parte}</strong> : <span key={i}>{parte}</span>
  );
}
