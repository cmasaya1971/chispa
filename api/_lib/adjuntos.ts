// Construye las tarjetas estructuradas (adjuntos) según qué tools se usaron en
// el turno, leyendo del estado del mock. Mantiene el grounding: los datos salen
// del mock, no del texto de la IA.
import type { Estado } from "../../shared/estado";
import type { Adjunto } from "../../shared/adjuntos";
import { fmtQ2 } from "../../shared/formato";

export function construirAdjuntos(toolsUsadas: string[], estado: Estado): Adjunto[] {
  const adjuntos: Adjunto[] = [];

  // Identidad validada contra RENAP (cuando se autenticó en este turno).
  if (toolsUsadas.includes("autenticar")) {
    const u = estado.usuario;
    const r = u.renap;
    adjuntos.push({
      tipo: "identidad",
      titulo: "Identidad confirmada con RENAP",
      filas: [
        { etiqueta: "Nombre", valor: u.nombreCompleto },
        { etiqueta: "DPI", valor: u.dpi },
        { etiqueta: "Edad", valor: `${r.edad} años` },
        { etiqueta: "Fecha de nacimiento", valor: r.fechaNacimiento },
        { etiqueta: "Lugar de nacimiento", valor: r.lugarNacimiento },
        { etiqueta: "Estado civil", valor: r.estadoCivil },
        { etiqueta: "Nacionalidad", valor: r.nacionalidad },
      ],
    });
  }

  // Estado de cuenta / movimientos (cuando se listaron en este turno).
  if (toolsUsadas.includes("listarMovimientos")) {
    adjuntos.push({
      tipo: "movimientos",
      titulo: `Movimientos · ${estado.movimientosRango}`,
      items: estado.movimientos.map((m) => ({
        concepto: m.concepto,
        fecha: m.fecha,
        montoTexto: (m.monto < 0 ? "-" : "+") + fmtQ2(Math.abs(m.monto)),
        signo: m.monto < 0 ? "neg" : "pos",
      })),
    });
  }

  return adjuntos;
}
