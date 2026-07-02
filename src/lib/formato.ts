// Formatters de moneda (GTQ). El copy validado NO es uniforme: unos montos van
// sin decimales y otros con dos. Por eso conviven ambos. Ver 01-modelo-datos.md §3.

const milesGT = new Intl.NumberFormat("en-US");

/** `Q1,250` — sin decimales, coma de miles. */
export function fmtQ0(n: number): string {
  return "Q" + milesGT.format(Math.round(n));
}

/** `Q1,250.00` — dos decimales, coma de miles. */
export function fmtQ2(n: number): string {
  return "Q" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Hora corta tipo WhatsApp (ej. "3:42 p.m."). Determinista si se le pasa una fecha. */
export function horaWa(d: Date = new Date()): string {
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "p.m." : "a.m.";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}
