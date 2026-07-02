import type { Adjunto } from "../../shared/adjuntos";
import { Card } from "./Card";
import { MovimientosCard } from "./MovimientosCard";

// Renderiza una tarjeta estructurada (adjunto) que Chispa envió con su mensaje.
export function AdjuntoView({ adjunto }: { adjunto: Adjunto }) {
  switch (adjunto.tipo) {
    case "identidad":
      return (
        <Card
          titulo={`🛡️ ${adjunto.titulo}`}
          filas={adjunto.filas}
        />
      );
    case "movimientos":
      return <MovimientosCard titulo={adjunto.titulo} items={adjunto.items} />;
    default:
      return null;
  }
}
