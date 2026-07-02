import type { Fila, Opcion } from "../ui/Card";

// Un mensaje renderizable en el hilo. La `tarjeta` es opcional y se pinta dentro
// de la burbuja de Chispa. El emisor "sistema" se renderiza como aviso centrado
// (estilo notificación de WhatsApp), no como burbuja.
export type Mensaje = {
  id: string;
  emisor: "chispa" | "usuario" | "sistema";
  texto: string;
  hora: string;
  // Texto alterno que se envía a la IA en lugar de `texto` (p.ej. una señal
  // interna tras un evento de UI). Si falta, se usa `texto`.
  textoIA?: string;
  tarjeta?: {
    titulo?: string;
    filas?: Fila[];
    opciones?: Opcion[];
    pie?: string;
  };
};
