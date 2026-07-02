import type { Fila, Opcion } from "../ui/Card";

// Un mensaje renderizable en el hilo. La `tarjeta` es opcional y se pinta dentro
// de la burbuja de Chispa.
export type Mensaje = {
  id: string;
  emisor: "chispa" | "usuario";
  texto: string;
  hora: string;
  tarjeta?: {
    titulo?: string;
    filas?: Fila[];
    opciones?: Opcion[];
    pie?: string;
  };
};
