// Cálculo del crédito estilo ZIGI. Puro y determinista, sin efectos.
// Vive en shared/ para ser una ÚNICA fuente de la fórmula: lo usan el servidor
// (operaciones.ts) y el cliente (configurador de la UI).
import type { Estado, Frecuencia } from "./estado";

/** Tasa por período: la mensual escalada según la frecuencia (mensual 5%, quincenal 2.5%, semanal 1.25%). */
export function tasaPeriodo(tasaMensual: number, mesesPorPeriodo: number): number {
  return tasaMensual * mesesPorPeriodo;
}

/** Amortización francesa (cuota fija). Redondeo a entero Q. */
export function cuotaAmortizada(monto: number, pagos: number, tasaPer: number): number {
  if (tasaPer <= 0) return Math.round(monto / pagos);
  return Math.round((monto * tasaPer) / (1 - Math.pow(1 + tasaPer, -pagos)));
}

export function buscarFrecuencia(e: Estado, frecuenciaId: string): Frecuencia | undefined {
  return e.credito.frecuencias?.find((f) => f.id === frecuenciaId);
}

/** Resumen de una oferta: cuota, total e intereses para un monto/frecuencia/pagos. */
export function resumenOferta(e: Estado, monto: number, frecuenciaId: string, pagos: number) {
  const f = buscarFrecuencia(e, frecuenciaId);
  const mesesPorPeriodo = f?.mesesPorPeriodo ?? 1;
  const unidad = f?.unidad ?? "mes";
  const i = tasaPeriodo(e.credito.tasaMensual, mesesPorPeriodo);
  const cuota = cuotaAmortizada(monto, pagos, i);
  const total = cuota * pagos;
  const intereses = total - monto;
  return { monto, frecuenciaId, pagos, unidad, tasaPeriodo: i, cuota, total, intereses };
}
