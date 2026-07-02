// Tarjetas estructuradas que Chispa adjunta a un mensaje. Las construye el
// servidor a partir de los datos del mock (grounding) y las renderiza el cliente.

export type FilaKV = { etiqueta: string; valor: string };

export type MovimientoItem = {
  concepto: string;
  fecha: string;
  montoTexto: string; // ya formateado, ej. "+Q2,286.00" / "-Q120.00"
  signo: "pos" | "neg";
};

export type Adjunto =
  | { tipo: "identidad"; titulo: string; filas: FilaKV[] }
  | { tipo: "movimientos"; titulo: string; items: MovimientoItem[] };
